from flask import abort, make_response, request
from flask import current_app, Blueprint, jsonify, render_template
from flask_user import roles_required
from flask_wtf import FlaskForm
from wtforms import validators, BooleanField, IntegerField

from ..extensions import oauth
from ..models.app_text import app_text, AppText
from ..models.organization import Organization
from ..models.role import ROLE

settings_api = Blueprint('settings', __name__)


class SettingsForm(FlaskForm):
    timeout = IntegerField(
        'Session Timeout for This Web Browser (in seconds)',
        validators=[validators.Required()])
    force_reauth = BooleanField(
        'Force re-authentication from external Identity Providers')


@settings_api.route('/settings', methods=['GET', 'POST'])
@roles_required(ROLE.ADMIN)
@oauth.require_oauth()
def settings():
    """settings panel for admins"""
    # load all top level orgs and consent agreements
    organization_consents = Organization.consent_agreements()

    # load all app text values - expand when possible
    apptext = {}
    for a in AppText.query.all():
        try:
            # expand strings with just config values, such as LR
            apptext[a.name] = app_text(a.name)
        except ValueError:
            # lack context to expand, show with format strings
            apptext[a.name] = a.custom_text

    form = SettingsForm(
        request.form, timeout=request.cookies.get('SS_TIMEOUT', 600),
        force_reauth=request.cookies.get('FORCE_REAUTH', False))
    if not form.validate_on_submit():

        return render_template(
            'settings.html',
            form=form,
            apptext=apptext,
            organization_consents=organization_consents,
            wide_container="true")

    # make max_age outlast the browser session
    max_age = 60 * 60 * 24 * 365 * 5
    response = make_response(render_template(
        'settings.html',
        form=form,
        apptext=apptext,
        organization_consents=organization_consents,
        wide_container="true"))
    response.set_cookie('SS_TIMEOUT', str(form.timeout.data), max_age=max_age)
    if form.force_reauth.data:
        response.set_cookie('FORCE_REAUTH', 'True', max_age=max_age)
    else:
        # close as we can come to deleting a cookie
        response.set_cookie('FORCE_REAUTH', '', expires=0)
    return response


@settings_api.route('/api/settings/<string:config_key>')
@oauth.require_oauth()
def config_settings(config_key):
    key = config_key.upper()
    available = ['LR_ORIGIN', 'LR_GROUP']
    if key in available:
        return jsonify({key: current_app.config.get(key)})
    else:
        abort(400, "Configuration key '{}' not available".format(key))
