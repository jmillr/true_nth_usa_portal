"""Auth related view functions"""
import base64
from datetime import datetime
import hashlib
import hmac
import json
import requests
from authomatic.adapters import WerkzeugAdapter
from authomatic.exceptions import CancellationError, ConfigError
from flask import Blueprint, jsonify, redirect, current_app, make_response
from flask import render_template, request, session, abort, url_for
from flask_login import logout_user
from flask_user import roles_required
from flask_user.signals import user_logged_in, user_registered
from flask_wtf import FlaskForm
from wtforms import BooleanField, FormField, HiddenField, SelectField
from wtforms import validators, TextField
from werkzeug.exceptions import Unauthorized
from werkzeug.security import gen_salt
from urlparse import urlparse
from validators import url as url_validation

from ..audit import auditable_event
from ..csrf import csrf
from ..database import db
from ..date_tools import FHIR_datetime
from ..extensions import authomatic, oauth
from ..models.auth import AuthProvider, Client, Token, create_service_token
from ..models.auth import validate_origin
from ..models.coredata import Coredata
from ..models.encounter import finish_encounter
from ..models.intervention import INTERVENTION, STATIC_INTERVENTIONS
from ..models.login import login_user
from ..models.role import ROLE
from ..models.user import add_authomatic_user
from ..models.user import current_user, get_user, User

auth = Blueprint('auth', __name__)


@auth.route('/deauthorized', methods=('POST',))
@csrf.exempt
def deauthorized():
    """Callback URL configured on facebook when user deauthorizes

    We receive POST data when a user deauthorizes the session
    between TrueNTH and Facebook.  The POST includes
    a signed_request, decoded as seen below.

    Configuration set on Facebook Developer pages:
      app->settings->advanced->Deauthorize Callback URL

    """
    def base64_url_decode(s):
        """url safe base64 decoding method"""
        padding_factor = (4 - len(s) % 4)
        s += "="*padding_factor
        return base64.b64decode(unicode(s).translate(
            dict(zip(map(ord, u'-_'), u'+/'))))

    encoded_sig, payload = request.form['signed_request'].split('.')
    sig = base64_url_decode(encoded_sig)
    data = base64_url_decode(payload)

    secret = current_app.config['FB_CONSUMER_SECRET']
    expected_sig = hmac.new(
        secret, msg=payload, digestmod=hashlib.sha256).digest()
    if expected_sig != sig:
        current_app.logger.error("Signed request from FB doesn't match!")
        return jsonify(error='bad signature')

    current_app.logger.debug("data: %s", str(data))
    data = json.loads(data)
    # Should probably remove all tokens obtained during this session
    # for now, just logging the event.
    message = 'User {0} deauthorized TrueNTH from Facebook'.format(
        data['user_id'])
    current_app.logger.info(message)
    return jsonify(message=message)


def flask_user_login_event(app, user, **extra):
    auditable_event("local user login", user_id=user.id, subject_id=user.id,
                    context='login')
    login_user(user, 'password_authenticated')


def flask_user_registered_event(app, user, **extra):
    auditable_event(
        "local user registered", user_id=user.id, subject_id=user.id,
        context='account')


# Register functions to receive signals from flask_user
user_logged_in.connect(flask_user_login_event)
user_registered.connect(flask_user_registered_event)


def capture_next_view_function(real_function):
    """closure to hang onto real view function to use after saving 'next'"""
    real_function = real_function

    def capture_next():
        """Alternate view function plugged in to capture 'next' in session

        NB if already logged in - this will bounce user to home, unless
        the user has role write_only, as such users may be logging in
        or registering new accounts, to be merged with the write_only one.

        """
        if current_user() and not current_user().has_role(ROLE.WRITE_ONLY):
            return redirect(url_for('portal.home'))

        if request.args.get('next'):
            session['next'] = request.args.get('next')
            validate_origin(session['next'])
            current_app.logger.debug(
                "store-session['next']: <{}> before {}()".format(
                    session['next'], real_function.func_name))
        if request.args.get('suspend_initial_queries'):
            session['suspend_initial_queries'] = request.args.get(
                'suspend_initial_queries')
        return real_function()
    return capture_next


@auth.route('/next-after-login')
def next_after_login():
    """Redirection to appropriate target depending on data and auth status

    Multiple authorization paths in, some needing up front information before
    returning, this attempts to handle such state decisions.  In other words,
    this function represents the state machine to control initial flow.

    When client applications (interventions) request OAuth tokens, we sometimes
    need to postpone the action of authorizing the client while the user logs
    in to TrueNTH.

    After completing authentication with TrueNTH, additional data may need to
    be obtained, such as a TOU agreement.  In such a case, the user will be
    directed to initial_queries, then back here for redirection to the
    appropriate 'next'.

    Implemented as a view method for integration with flask-user config.

    """
    # Without a current_user - can't continue, send back to root for login
    user = current_user()
    if not user:
        current_app.logger.debug("next_after_login: [no user] -> landing")
        return redirect(url_for('portal.landing'))

    # Logged in - take care of pending actions
    if 'challenge_verified_user_id' in session:
        # user has now finished p/w update - clear session variable
        del session['challenge_verified_user_id']

    # Look for an invited user scenario.  Landing here with:
    #   `invited_verified_user_id` set indicates a fresh
    #   registered account for a user who followed an invite email.
    #
    #   `login_as_id` set indicates a fresh registered account during
    #   a login-as session.  In such a case, ignore when the user first
    #   becomes the target login-as user, we need to capture landing here
    #   once a newly registered account has been created.
    #
    # time to promote the invited account.  This also inverts
    # current_user to the invited one once promoted.
    if 'invited_verified_user_id' in session or (
            'login_as_id' in session and
            user.id != int(session['login_as_id'])):
        invited_id = session.get('invited_verified_user_id') or session.get(
            'login_as_id')
        invited_user = User.query.get(invited_id)
        logout(prevent_redirect=True, reason='reverting to invited account')
        invited_user.promote_to_registered(user)
        db.session.commit()
        login_user(invited_user, 'password_authenticated')
        assert (invited_user == current_user())
        user = current_user()
        assert ('invited_verified_user_id' not in session)
        assert ('login_as_id' not in session)

    # Present intial questions (TOU et al) if not already obtained
    # NB - this act may be suspended by request from an external
    # client during patient registration
    if (not session.get('suspend_initial_queries', None) and
            not Coredata().initial_obtained(user)):
        current_app.logger.debug("next_after_login: [need data] -> "
                                 "initial_queries")
        resp = redirect(url_for('portal.initial_queries'))

    # Clients/interventions trying to obtain an OAuth token for protected
    # access need to be put in a pending state, if the user isn't already
    # authenticated with the portal.  It's now time to resume that process;
    # pop the pending state from the session and resume, if found.
    elif 'pending_authorize_args' in session:
        args = session['pending_authorize_args']
        current_app.logger.debug("next_after_login: [resume pending] ->"
                                 "authorize: {}".format(args))
        del session['pending_authorize_args']
        resp = redirect(url_for('auth.authorize', **args))

    # 'next' is typically set on the way in when gathering authentication.
    # It's stored in the session to survive the various redirections needed
    # for external auth, etc.  If found in the session, pop and redirect
    # as defined.
    elif 'next' in session:
        next_url = session['next']
        del session['next']
        current_app.logger.debug("next_after_login: [have session['next']] "
                                 "-> {}".format(next_url))
        if 'suspend_initial_queries' in session:
            del session['suspend_initial_queries']
        resp = redirect(next_url)

    else:
        # No better place to go, send user home
        current_app.logger.debug("next_after_login: [no state] -> home")
        resp = redirect(url_for('portal.home'))

    # make cookie max_age outlast the browser session
    max_age = 60 * 60 * 24 * 365 * 5
    # set timeout cookies
    if session.get('login_as_id'):
        if request.cookies.get('SS_TIMEOUT'):
            resp.set_cookie('SS_TIMEOUT_REVERT',
                            request.cookies['SS_TIMEOUT'],
                            max_age=max_age)
        resp.set_cookie('SS_TIMEOUT', '300', max_age=max_age)
    elif request.cookies.get('SS_TIMEOUT_REVERT'):
        resp.set_cookie('SS_TIMEOUT',
                        request.cookies['SS_TIMEOUT_REVERT'],
                        max_age=max_age)
        resp.set_cookie('SS_TIMEOUT_REVERT', '', expires=0)
    else:
        resp.set_cookie('SS_TIMEOUT', '', expires=0)
    return resp


@auth.route('/login/<provider_name>/')
def login(provider_name):
    """login view function

    After successful authorization at OAuth server, control
    returns here.  The user's ID and the remote oauth bearer
    token are retained in the session for subsequent use.

    """
    def testing_backdoor(user_id):
        "Unittesting backdoor - see tests.login() for use"
        assert int(user_id) < 10  # allowed for test users only!
        session['id'] = user_id
        if request.args.get('next'):
            validate_origin(request.args.get('next'))
        user = current_user()
        login_user(user, 'password_authenticated')
        return next_after_login()

    def picture_url(result):
        """Using OAuth result, fetch the user's picture URL"""
        image_url = result.user.picture
        if provider_name == 'facebook':
            # Additional request needed for FB profile image
            url = '?'.join(
                ("https://graph.facebook.com/{0}/picture",
                 "redirect=false&width=160")).format(result.user.id)
            response = result.provider.access(url)
            if response.status == 200:
                image_url = response.data['data']['url']
        return image_url

    if provider_name == 'TESTING' and current_app.config['TESTING']:
        return testing_backdoor(request.args.get('user_id'))

    if request.args.get('next'):
        session['next'] = request.args.get('next')
        validate_origin(session['next'])
        current_app.logger.debug(
            "store-session['next'] <{}> from login/{}".format(
                session['next'], provider_name))
        # The existance of any args (including 'next') breaks the authomatic
        # login flow.  Clear out before passing on
        from werkzeug.datastructures import ImmutableMultiDict
        request.args = ImmutableMultiDict()

    prv = 'FB' if (provider_name == 'facebook') else provider_name.upper()

    if (not current_app.config.get('{}_CONSUMER_KEY'.format(prv)) or
            not current_app.config.get('{}_CONSUMER_SECRET'.format(prv))):
        current_app.logger.info(
            "Generating 404 on request for OAuth provider `{}` missing "
            "configuration".format(provider_name))
        abort(404)

    response = make_response()
    adapter = WerkzeugAdapter(request, response)
    try:
        result = authomatic.authomatic.login(adapter, provider_name)
    except ConfigError:
        # Raised for random requests for non-configured hosts.  Treat as 404
        current_app.logger.info(
            "Generating 404 on request for OAuth provider `{}` missing "
            "configuration".format(provider_name))
        abort(404)

    if current_user():
        if current_user().deleted:
            abort(400, "deleted user - operation not permitted")
        return next_after_login()
    if result:
        if result.error:
            if isinstance(result.error, CancellationError):
                current_app.logger.info("User canceled IdP auth - send home")
                return redirect(url_for('portal.landing'))

            reload_count = session.get('force_reload_count', 0)
            if reload_count > 2:
                current_app.logger.warn("Failed 3 attempts: {}".format(
                    result.error.message))
                abort(500, "unable to authorize with provider {}".format(
                    provider_name))
            session['force_reload_count'] = reload_count + 1
            current_app.logger.info(str(result.error))
            # Work around for w/ Safari and cookies set to current site only
            # forcing a reload brings the local cookies back into view
            # (they're missing with such a setting on returning from
            # the 3rd party IdP redirect)
            current_app.logger.info("attempting reload on oauth error")
            return render_template('force_reload.html',
                                   message=result.error.message)
        elif result.user:
            current_app.logger.debug(
                "Successful authentication at %s", provider_name)
            if not (result.user.name and result.user.id):
                result.user.update()
                image_url = picture_url(result)

            # Success - add or pull this user to/from database
            ap = AuthProvider.query.filter_by(
                provider=provider_name, provider_id=result.user.id).first()
            if ap:
                auditable_event("login via {0}".format(provider_name),
                                user_id=ap.user_id, subject_id=ap.user.id,
                                context='login')
                user = User.query.filter_by(id=ap.user_id).first()
                user.image_url = image_url
                db.session.commit()
            else:
                # Experiencing problems pulling email from IdPs.
                if not result.user.email:
                    abort(500, "No email for user {} from {}".format(
                        result.user.id, provider_name))

                # Confirm we haven't seen user from a different IdP
                user = (User.query.filter_by(
                    email=result.user.email).first()
                    if result.user.email else None)

                if not user:
                    user = add_authomatic_user(result.user, image_url)
                    db.session.commit()
                    auditable_event(
                        "register new user via {0}".format(provider_name),
                        user_id=user.id,
                        subject_id=user.id,
                        context='account')
                else:
                    auditable_event(
                        "login user via NEW IdP {0}".format(provider_name),
                        user_id=user.id,
                        subject_id=user.id,
                        context='login')
                    user.image_url = image_url

                ap = AuthProvider(
                    provider=provider_name,
                    provider_id=result.user.id,
                    user_id=user.id)
                db.session.add(ap)
                db.session.commit()
            session['id'] = user.id
            session['remote_token'] = result.provider.credentials.token
            login_user(user, 'password_authenticated')
            return next_after_login()
    else:
        return response


@auth.route('/login-as/<user_id>')
@roles_required(ROLE.STAFF)
@oauth.require_oauth()
def login_as(user_id, auth_method='staff_authenticated'):
    """Provide direct login w/o auth to user account, but only if qualified

    Special individuals may assume the identity of other users, but only
    if the business rules validate.  For example, staff may log in
    as a patient who has a current consent on file for the staff's
    organization.

    If qualified, the current user's session is destroyed and the requested
    user is logged in - passing control to 'next_after_login'

    :param user_id: User (patient) to assume identity of
    :param auth_method: Expected values include 'staff_authenticated' and
      'staff_handed_to_patient', depending on context.

    """
    # said business rules enforced by check_role()
    current_user().check_role('edit', user_id)
    target_user = get_user(user_id)

    # Guard against abuse
    if not (target_user.has_role(role_name=ROLE.PATIENT) or
            target_user.has_role(role_name=ROLE.PARTNER)):
        abort(401, 'not authorized to assume identity of requested user')

    auditable_event("assuming identity of user {}".format(user_id),
                    user_id=current_user().id, subject_id=user_id,
                    context='authentication')

    logout(prevent_redirect=True, reason="forced from login_as")
    session['login_as_id'] = user_id

    if target_user.has_role(role_name=ROLE.WRITE_ONLY):
        target_user.mask_email()  # necessary in case registration is attempted
    login_user(target_user, auth_method)
    return next_after_login()


@auth.route('/logout')
def logout(prevent_redirect=False, reason=None):
    """logout view function

    Logs user out by requesting the previously granted permission to
    use authenticated resources be deleted from the OAuth server, and
    clearing the browser session.

    :param prevent_redirect: set only if calling this function during
        another process where redirection after logout is not desired
    :param reason: set only if calling from another process where a driving
        reason should be noted in the audit

    Optional query string parameter timed_out should be set to clarify the
    logout request is the result of a stale session

    """
    user = current_user()
    user_id = user.id if user else None
    timed_out = request.args.get('timed_out', False)

    def delete_facebook_authorization(user_id):
        """Remove OAuth authorization for TrueNTH on logout

        If the user has ever authorized TrueNTH via Facebook,
        tell facebook to delete the authorization now (on logout).

        NB - this isn't standard OAuth behavior, users only expect to
        authorize TrueNTH one time to use their Facebook
        authentication.

        """
        ap = AuthProvider.query.filter_by(
            provider='facebook', user_id=user_id).first()
        if ap:
            headers = {
                'Authorization': 'Bearer {0}'.format(session['remote_token'])}
            url = "https://graph.facebook.com/{0}/permissions".\
                format(ap.provider_id)
            requests.delete(url, headers=headers)

    def notify_clients(user_id):
        """Inform any client apps of the logout event.

        Look for tokens this user obtained, notify the respective clients
        of the logout event and invalidate all outstanding tokens by deletion

        """
        if not user_id:
            return
        for token in Token.query.filter_by(user_id=user_id):
            c = Client.query.filter_by(client_id=token.client_id).first()
            c.notify({'event': 'logout', 'user_id': user_id,
                      'refresh_token': token.refresh_token,
                      'timed_out': timed_out})
            # Invalidate the access token by deletion
            db.session.delete(token)
        db.session.commit()

    if user_id:
        event = 'logout' if not timed_out else 'logout due to timeout'
        if reason:
            event = ':'.join((event, reason))
        auditable_event(
            event, user_id=user_id, subject_id=user_id, context='login')
        # delete_facebook_authorization()  #Not using at this time

    logout_user()
    session.clear()
    notify_clients(user_id)
    if user:
        finish_encounter(user)
    db.session.commit()
    if prevent_redirect:
        return
    return redirect('/' if not timed_out else '/?timed_out=1')


class InterventionEditForm(FlaskForm):
    """Intervention portion of client edits - part of ClientEditForm"""
    public_access = BooleanField('Public Access', default=True)
    card_html = TextField('Card HTML')
    link_label = TextField('Link Label')
    link_url = TextField('Link URL')
    status_text = TextField('Status Text')

    def __init__(self, *args, **kwargs):
        """As a nested form, CSRF is handled by the parent"""
        kwargs['csrf_enabled'] = False
        super(InterventionEditForm, self).__init__(*args, **kwargs)

    def validate_link_url(form, field):
        """Custom validation to allow null and known origins only"""
        if len(field.data.strip()):
            try:
                validate_origin(field.data)
            except Unauthorized:
                raise validators.ValidationError(
                    "Invalid URL (unknown origin)")


class ClientEditForm(FlaskForm):
    """wtform class for validation during client edits"""
    intervention_names = [(k, v) for k, v in STATIC_INTERVENTIONS.items()]

    client_id = HiddenField('Client ID')
    application_role = SelectField(
        'Application Role',
        choices=intervention_names,
        validators=[validators.Required()])
    application_origins = TextField(
        'Application URL',
        validators=[validators.Required()])
    callback_url = TextField(
        'Callback URL',
        validators=[validators.optional(), validators.URL(require_tld=False)])
    intervention_or_default = FormField(InterventionEditForm)

    def validate_application_role(form, field):
        """Custom validation to confirm only one app per role"""
        selected = field.data
        if not selected or selected == 'None':
            return True

        # the default role isn't assigned or limited
        if selected == INTERVENTION.DEFAULT.name:
            return True

        intervention = getattr(INTERVENTION, selected)

        # if the selected intervention already has a client, make sure
        # it's the client being edited or raise a validation error
        if (intervention and intervention.client_id and
                intervention.client_id != form.data['client_id']):
            raise validators.ValidationError(
                "This role currently belongs to another application")

    def validate_application_origins(form, field):
        """Custom validation to handle multiple, space delimited URLs"""
        origins = field.data.split()
        for url in origins:
            if not url_validation(url, require_tld=False):
                raise validators.ValidationError("Invalid URL")

    def validate_callback_url(form, field):
        """Custom validation to confirm callback_url is in redirect_urls"""
        origins = form.application_origins.data.split()
        og_uris = ['{uri.scheme}://{uri.netloc}'.format(uri=urlparse(url))
                   for url in origins]
        if field.data:
            cb_uri = urlparse(field.data)
            if '{uri.scheme}://{uri.netloc}'.format(uri=cb_uri) not in og_uris:
                raise validators.ValidationError(
                    "URL host must match a provided Application Origin URL")


@auth.route('/client', methods=('GET', 'POST'))
@roles_required(ROLE.APPLICATION_DEVELOPER)
@oauth.require_oauth()
def client():
    """client registration

    TrueNTH uses the OAuth 2.0 Authorization Code Grant flow
    (http://tools.ietf.org/html/rfc6749#section-4.1)
    to authorize all sensitive API access. As a prerequisite, any
    client (intervention) wishing to make authorized calls must first
    register at this endpoint.
    ---
    tags:
      - Intervention
    operationId: client
    parameters:
      - name: application_origins
        in: formData
        description:
          Application origins. The service will only redirect to URIs in
          the list. All URIs must be protected with TLS security
          (i.e. https) beyond inital testing. Separate multiple
          URIs with a single whitespace character.
        required: true
        type: string
    produces:
      - text/html
    responses:
      200:
        description: successful operation
        schema:
          id: client_response
          required:
            - App ID
            - App Secret
            - Site URL
          properties:
            App ID:
              type: string
              description:
                Identification unique to a TrueNTH application.
                Pass as `client_id` in OAuth Authorization Code Grant
                calls to obtain an authorization token
            App Secret:
              type: string
              description:
                Safe guarded secret used by Intervention's OAuth
                client library.  Pass as `client_secret` in calls
                to `/oauth/token`
            Site URL:
              type: string
              description:
                Application's site Origin(s) or URL(s).
                Required to include the origin of OAuth callbacks
                and site origins making in-browser requests via CORS

    """
    user = current_user()
    form = ClientEditForm(application_role=INTERVENTION.DEFAULT.name)
    if not form.validate_on_submit():
        return render_template('client_add.html', form=form)
    client = Client(
        client_id=gen_salt(40),
        client_secret=gen_salt(50),
        _redirect_uris=form.application_origins.data,
        _default_scopes='email',
        user_id=user.id,
    )
    db.session.add(client)
    db.session.commit()
    auditable_event("added intervention/client {}".format(
        client), user_id=user.id, subject_id=user.id, context='intervention')

    # if user selected a role besides the default, set it.
    if form.application_role.data != INTERVENTION.DEFAULT.name:
        selected = form.application_role.data
        intervention = getattr(INTERVENTION, selected)
        auditable_event("client {0} assuming role {1}".format(
            client.client_id, selected), user_id=user.id,
            subject_id=user.id, context='intervention')
        intervention.client_id = client.client_id
        db.session.commit()
    return redirect(url_for('.client_edit', client_id=client.client_id))


@auth.route('/client/<client_id>', methods=('GET', 'POST'))
@roles_required(ROLE.APPLICATION_DEVELOPER)
@oauth.require_oauth()
def client_edit(client_id):
    """client edit

    View details and edit settings for a TrueNTH client (also
    known as an Intervention or App).
    ---
    tags:
      - Intervention
    operationId: client_edit
    parameters:
      - name: client_id
        in: path
        required: true
        description: The App ID (client_id) from client registration
        type: string
      - name: callback_url
        in: formData
        description:
          An optional callback URL to be hit on significant
          events, such as a user terminating a session via logout
        required: false
        type: string
    produces:
      - text/html
    responses:
      200:
        description: successful operation
        schema:
          id: client_edit_response
          required:
            - App ID
            - App Secret
            - Site URL
            - Callback URL
          properties:
            App ID:
              type: string
              description:
                Identification unique to a TrueNTH application.
                Pass as `client_id` in OAuth Authorization Code Grant
                calls to obtain an authorization token
            App Secret:
              type: string
              description:
                Safe guarded secret used by Intervention's OAuth
                client library.  Pass as `client_secret` in calls
                to `/oauth/token`
            Site URL:
              type: string
              description:
                Application's site Origin or URL.
                Required to include the origin of OAuth callbacks
                and site origins making in-browser requests via CORS
            Callback URL:
              type: string
              description:
                Callback URL hit on significant events such as a
                session termination.  If defined, a POST to the
                callback will include a "signed_request" using
                the client_secret.  See numerous resources
                published for decoding Facebook signed_request, as
                the format is identical.

    """
    client = Client.query.get(client_id)
    if not client:
        abort(404)
    user = current_user()
    user.check_role(permission='edit', other_id=client.user_id)

    if request.method == 'POST':
        form = ClientEditForm(request.form)
    else:
        form = ClientEditForm(
            obj=client,
            application_role=client.intervention_or_default.name)

    # work around a testing bug in wtforms
    if current_app.config['TESTING']:
        form.client_id.data = client_id
    assert form.client_id.data == client_id

    def set_client_intervention(client, form):
        current_role = client.intervention
        selected = form.application_role.data
        if current_role and current_role.name != selected:
            current_role.client_id = None
            auditable_event("client {0} releasing role {1}".format(
                client.client_id, current_role.description),
                user_id=user.id, subject_id=client.user_id,
                context='intervention')
        if selected != INTERVENTION.DEFAULT.name:
            intervention = getattr(INTERVENTION, selected)
            if intervention.client_id != client.client_id:
                intervention.client_id = client.client_id
                auditable_event("client {0} assuming role {1}".format(
                    client.client_id, intervention.description),
                    user_id=user.id, subject_id=client.user_id,
                    context='intervention')

    def generate_callback(client):
        # Trigger a callback for client editors to test
        data = {
            'event': 'test callback',
            'UTC server time': FHIR_datetime.as_fhir(datetime.utcnow())
        }
        client.notify(data)

    if not form.validate_on_submit():
        return render_template(
            'client_edit.html', client=client, form=form,
            service_token=client.lookup_service_token())

    b4 = str(client)
    redirect_target = url_for('.clients_list')
    if request.form.get('delete'):
        auditable_event("deleted intervention/client {}".format(
            client.client_id), user_id=user.id, subject_id=client.user_id,
            context='intervention')
        if client.intervention:
            client.intervention.client_id = None
        db.session.delete(client)
    elif request.form.get('service_token'):
        # limiting this to the client owner as sponsorship gets messy
        if user.id != client.user_id:
            raise ValueError("only client owner can add service accounts")
        existing = client.lookup_service_token()
        if existing:
            db.session.delete(existing)
        service_user = user.add_service_account()
        auditable_event(
            "service account created by", user_id=user.id,
            subject_id=client.user_id, context='authentication')
        create_service_token(client=client, user=service_user)
        auditable_event("service token generated for client {}".format(
            client.client_id), user_id=user.id, subject_id=client.user_id,
            context='authentication')
        redirect_target = url_for('.client_edit', client_id=client.client_id)
    elif request.form.get('generate_callback'):
        generate_callback(client)
        redirect_target = url_for('.client_edit', client_id=client.client_id)
    else:
        form.populate_obj(client)
        set_client_intervention(client, form)

    db.session.commit()
    after = str(client)
    if b4 != after:
        auditable_event(
            "edited intervention/client {} before: <{}> after: <{}>".format(
                client.client_id, b4, after), user_id=user.id,
            subject_id=client.user_id, context='intervention')
    return redirect(redirect_target)


@auth.route('/clients')
@roles_required([ROLE.APPLICATION_DEVELOPER, ROLE.ADMIN])
@oauth.require_oauth()
def clients_list():
    """clients list

    List all clients created by the authenticated user.
    ---
    tags:
      - Intervention
    operationId: clients_list
    produces:
      - text/html
    responses:
      200:
        description: successful operation
        schema:
          id: clients_list_response
          required:
            - App ID
            - Site URL
          properties:
            App ID:
              type: string
              description:
                Identification unique to a TrueNTH application.
                Pass as `client_id` in OAuth Authorization Code Grant
                calls to obtain an authorization token
            Site URL:
              type: string
              description:
                Application's site Origin or URL.
                Required to include the origin of OAuth callbacks
                and site origins making in-browser requests via CORS

    """
    user = current_user()
    if user.has_role(ROLE.ADMIN):
        clients = Client.query.all()
    else:
        clients = Client.query.filter_by(user_id=user.id).all()
    return render_template('clients_list.html', clients=clients)


@auth.route('/oauth/token-status')
@oauth.require_oauth()
def token_status():
    """Return remaining valid time and other info for oauth token

    Endpoint for clients needing to double check status on a token.
    Returns essentially the same JSON obtained from the /oauth/token
    call, with `expires_in` updated to show remaining seconds.

    ---
    tags:
      - OAuth
    operationId: token_status
    produces:
      - application/json
    responses:
      200:
        description: successful operation
        schema:
          id: token_status
          required:
            - access_token
            - token_type
            - expires_in
            - refresh_token
            - scopes
          properties:
            access_token:
              type: string
              description:
                The access token to include in the Authorization header
                for protected API use.
            token_type:
              type: string
              description: Type of access token, always 'Bearer'
            expires_in:
              type: integer
              format: int64
              description:
                Number of seconds for which the access token will
                remain valid
            refresh_token:
              type: string
              description:
                Use to refresh an access token, in place of the
                authorizion token.
            scopes:
              type: string
              description: The authorized scopes.

    """
    authorization = request.headers.get('Authorization')
    if not authorization:
        abort(401, "Authorization header required")
    token_type, access_token = authorization.split()
    token = Token.query.filter_by(access_token=access_token).first()
    if not token:
        abort(404, "token not found")
    expires_in = token.expires - datetime.utcnow()
    return jsonify(
        access_token=access_token,
        refresh_token=token.refresh_token, token_type=token_type,
        expires_in=expires_in.seconds, scopes=token._scopes)


@auth.route('/oauth/errors', methods=('GET', 'POST'))
@csrf.exempt
def oauth_errors():
    """Redirect target for oauth errors

    Shouldn't be called directly, this endpoint is the redirect target
    when something goes wrong during authorization code requests
    ---
    tags:
      - OAuth
    operationId: oauth_errors
    produces:
      - application/json
    responses:
      200:
        description: successful operation
        schema:
          id: error_response
          required:
            - error
          properties:
            error:
              type: string
              description: Known details of error situation.

    """
    current_app.logger.warn(request.args.get('error'))
    return jsonify(error=request.args.get('error')), 400


@auth.route('/oauth/token', methods=('GET', 'POST'))
@csrf.exempt
@oauth.token_handler
def access_token():
    """Exchange authorization code for access token

    OAuth client libraries must POST the authorization code obtained
    from /oauth/authorize in exchange for a Bearer Access Token.
    ---
    tags:
      - OAuth
    operationId: access_token
    parameters:
      - name: client_id
        in: formData
        description:
          Client's unique identifier, obtained during registration
        required: true
        type: string
      - name: client_secret
        in: formData
        description:
          Client's secret, obtained during registration
        required: true
        type: string
      - name: code
        in: formData
        description:
          The authorization code obtained from /oauth/authorize
        required: true
        type: string
      - name: grant_type
        in: formData
        description:
          Type of OAuth authorization requested.  Use "authorization_code"
        required: true
        type: string
      - name: redirect_uri
        in: formData
        description:
          Intervention's target URI for call back.
        required: true
        type: string
    produces:
      - application/json
    responses:
      200:
        description: successful operation
        schema:
          id: access_token
          required:
            - access_token
            - token_type
            - expires_in
            - refresh_token
            - scopes
          properties:
            access_token:
              type: string
              description:
                The access token to include in the Authorization header
                for protected API use.
            token_type:
              type: string
              description: Type of access token, always 'Bearer'
            expires_in:
              type: integer
              format: int64
              description:
                Number of seconds for which the access token will
                remain valid
            refresh_token:
              type: string
              description:
                Use to refresh an access token, in place of the
                authorizion token.
            scopes:
              type: string
              description: The authorized scopes.

    """
    for field in request.form:
        if '\0' in request.form[field]:
            abort(400, "invalid {} string".format(field))
    return None


@auth.route('/oauth/authorize', methods=('GET', 'POST'))
@csrf.exempt
@oauth.authorize_handler
def authorize(*args, **kwargs):
    """Authorize the client to access TrueNTH resources

    For OAuth 2.0, the resource owner communicates their desire
    to grant the client (intervention) access to their data on
    the server (TrueNTH).

    For ease of use, this decision has been hardwired to "allow access"
    on TrueNTH. Making a GET request to this endpoint is still
    the required initial step in the OAuth 2.0 Authorization Code
    Grant (http://tools.ietf.org/html/rfc6749#section-4.1), likely
    handled by the OAuth 2.0 library used by the client.
    ---
    tags:
      - OAuth
    operationId: oauth_authorize
    parameters:
      - name: response_type
        in: query
        description:
          Type of OAuth authorization requested.  Use "code"
        required: true
        type: string
      - name: client_id
        in: query
        description:
          Client's unique identifier, obtained during registration
        required: true
        type: string
      - name: redirect_uri
        in: query
        description:
          Intervention's target URI for call back, which may include
          its own query string parameters for use by the intervention
          on call back.  Must be urlencoded as per the OAuth specification
          (https://tools.ietf.org/html/rfc6749#section-4.1.1)
        required: true
        type: string
      - name: scopes
        in: query
        description:
          Extent of authorization requested.  At this time, only 'email'
          is supported.
        required: true
        type: string
      - name: display_html
        in: query
        description: Additional HTML to customize registration
        required: false
        type: string
    produces:
      - application/json
    responses:
      302:
        description:
          redirect to requested redirect_uri with a valid
          authorization code. NB - this is not the bearer
          token needed for API access, but the code to be
          exchanged for such an access token. In the
          event of an error, redirection will target /oauth/errors
          of TrueNTH.

    """
    # Interventions may include additional text to display as a way
    # to "customize registration".  Store in session for display in
    # templates.
    if 'display_html' in request.args:
        session['display_html'] = request.args.get('display_html')
        current_app.logger.debug("display_html:" +
                                 request.args.get('display_html'))

    user = current_user()
    if not user:
        # Entry point when intervetion is requesting OAuth token, but
        # the user has yet to authenticate via FB or otherwise.  Need
        # to retain the request, and replay after TrueNTH login
        # has completed.
        current_app.logger.debug(
            'Postponing oauth client authorization till user '
            'authenticates with CS: %s', str(request.args))
        session['pending_authorize_args'] = request.args

        return redirect('/')
    # See "hardwired" note in docstring above
    return True
