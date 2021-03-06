"""Model classes for app_text

Customizing the templates for application specific needs can be done
at several levels.  This module houses tables used to generate
app specific strings.  Values are imported and exported through the
SitePersistence mechanism, and looked up in a template using the
`app_text(string)` method.

"""
from abc import ABCMeta, abstractmethod
from flask import current_app
from flask_babel import gettext
import requests
from requests.exceptions import MissingSchema, ConnectionError
import timeit
from string import Formatter
from urllib import urlencode
from urlparse import parse_qsl, urlparse

from ..database import db


def time_request(url):
    """Wrap the requests.get(url) and log the timing"""
    start = timeit.default_timer()
    response = requests.get(url)
    duration = timeit.default_timer() - start
    message = ('TIME {duration:.4f} seconds to GET {url}'.format(
        url=url, duration=duration))
    if duration > 5.0:
        current_app.logger.error(message)
    elif duration > 2.0:
        current_app.logger.warning(message)
    else:
        current_app.logger.debug(message)
    return response


class AppText(db.Model):
    """Model representing application specific strings for customization

    The portal (shared services) can be configured to support a number
    of specific sites.  This class provides a mechanism to store and lookup
    any text string needing to be customized.

    """
    __tablename__ = 'apptext'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, unique=True, nullable=False)
    custom_text = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return "{} ({}, {})".format(self.__class__.__name__,
                                    self.name, str(self))

    def __str__(self):
        if self.custom_text:
            return self.custom_text
        return self.name

    def __unicode__(self):
        if self.custom_text:
            return self.custom_text
        return self.name

    @classmethod
    def from_json(cls, data):
        if 'name' not in data:
            raise ValueError("missing required 'name' field")
        app_text = AppText.query.filter_by(name=data['name']).first()
        if not app_text:
            app_text = cls()
            app_text.name = data['name']
            app_text.custom_text = data.get('custom_text')
            db.session.add(app_text)
        else:
            app_text.custom_text = data.get('custom_text')
        return app_text

    def as_json(self):
        d = {}
        d['resourceType'] = 'AppText'
        d['name'] = self.name
        if self.custom_text:
            d['custom_text'] = self.custom_text
        return d


class AppTextModelAdapter(object):
    """Several special purpose patterns used for lookups

    Make access consistent and easy for model classes where appropriate

    Abstract base class - defining methods each model adapter needs
    """
    __metaclass__ = ABCMeta

    @abstractmethod
    def name_key(**kwargs):
        """Return the named key as used by AppText for the type"""
        raise NotImplemented


class ConsentByOrg_ATMA(AppTextModelAdapter):
    """AppTextModelAdapter for Consent agreements - namely the URL per org"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for a consent agreement

        :param organization: for which the consent agreement applies
        :returns: string for AppText.name field

        """
        organization = kwargs.get('organization')
        if not organization:
            raise ValueError("required organization parameter not defined")
        return "{} organization consent URL".format(organization.name)


class WebsiteConsentTermsByOrg_ATMA(AppTextModelAdapter):
    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for website consent terms

        :param organization: for which the consent agreement applies
        :param role: for specific role selections, but only if
          it makes sense.  (i.e. on ePROMs, staff see different content)

        :returns: string for AppText.name field

        """
        organization = kwargs.get('organization')
        if not organization:
            raise ValueError("required organization parameter not defined")
        role = kwargs.get('role')
        if role:
            return "{} {} website consent URL".format(
                organization.name, role)
        return "{} organization website consent URL".format(organization.name)


class InitialConsent_ATMA(AppTextModelAdapter):
    """AppTextModelAdapter for Initial Consent Terms"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for a Initial Consent Terms

        Not expecting any args at this time - may specialize per study
        or organization in the future as needed.

        :returns: string for AppText.name field

        """
        return "Initial Consent Terms URL"


class Terms_ATMA(AppTextModelAdapter):
    """AppTextModelAdapter for Terms Of Use agreements, used for /terms"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for a Terms and Conditions

        :param organization: optional, present in tandem to role parameter
        :param role: optional, role of the user
        :returns: string for AppText.name field

        """
        if kwargs.get('organization') and not kwargs.get('role'):
            raise ValueError("'role' parameter not defined")
        elif kwargs.get('role') and not kwargs.get('organization'):
            raise ValueError("'organization' parameter not defined")
        elif kwargs.get('organization') and kwargs.get('role'):
            return "{} {} terms and conditions URL".\
                    format(kwargs.get('organization').name, kwargs.get('role'))
        return "Terms and Conditions URL"


class WebsiteDeclarationForm_ATMA(AppTextModelAdapter):
    """AppTextModelAdapter for Website Declaraion Form"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for a Website Declaration Form

        :param organization: required
        :returns: string for AppText.name field

        """
        if not kwargs.get('organization'):
            raise ValueError("required 'organization' parameter not defined")
        else:
            return "{} website declaration form URL".\
                    format(kwargs.get('organization').name)


class StaffRegistrationEmail_ATMA(AppTextModelAdapter):
    """AppTextModelAdapter for Staff Registration Email Content"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for a Website Declaration Form

        :param organization: required
        :returns: string for AppText.name field

        """
        if not kwargs.get('organization'):
            raise ValueError("required 'organization' parameter not defined")
        else:
            return "{} staff registraion email URL".\
                    format(kwargs.get('organization').name)


class UserInviteEmail_ATMA(AppTextModelAdapter):
    """AppTextModelAdapter for User Invite Email Content"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for User Invite Email Content

        Not expecting any args at this time - may specialize per study
        or organization in the future as needed.
        TODO: Removing hardcoding of 'CRV' and 'IRONMAN'

        :returns: string for AppText.name field

        """
        if kwargs.get('org') in ('CRV', 'IRONMAN'):
            return "profileSendEmail invite email {}".format(kwargs.get('org'))
        return "profileSendEmail invite email"


class AboutATMA(AppTextModelAdapter):
    """AppTextModelAdapter for `About` - namely the URL"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for `about` URL

        :param subject: required subject, i.e. 'TrueNTH' or 'Movember'
        :returns: string for AppText.name field

        """
        if not kwargs.get('subject'):
            raise ValueError("required 'subject' parameter not defined")
        return "About {} URL".format(kwargs.get('subject'))


class PrivacyATMA(AppTextModelAdapter):
    """AppTextModelAdapter for Privacy - namely the URL"""

    @staticmethod
    def name_key(**kwargs):
        """Generate AppText name key for privacy URL

        :param organization: optional, present in tandem to role
        :param role: optional
        :returns: string for AppText.name field

        """
        if kwargs.get('organization') and not kwargs.get('role'):
            raise ValueError("'role' parameter not defined")
        elif kwargs.get('role') and not kwargs.get('organization'):
            raise ValueError("'organization' parameter not defined")
        elif kwargs.get('organization') and kwargs.get('role'):
            return "{} {} privacy URL".format(
                kwargs.get('organization').name, kwargs.get('role'))
        return "Privacy URL"


class UnversionedResource(object):
    "Like VersionedResource for non versioned URLs (typically local)"
    def __init__(self, url, asset=None, variables=None):
        """Initialize based on requested URL

        Attempts to fetch asset and mock a versioned URL

        :param url: the URL to pull details and asset from
        :param asset: if given, use as asset, otherwise, download

        :attribute asset: will contain the html asset downloaed, found in the
            cache, or the error message if that fails.
        :attribute editor_url: always None
        :attribute url: the original url.

        """
        self._asset, self.error_msg, self.editor_url = None, None, None
        self.url = url
        self.variables = variables or {}
        if asset:
            self._asset = asset
        else:
            try:
                response = time_request(url)
                self._asset = response.text
            except MissingSchema:
                if current_app.config.get('TESTING'):
                    self._asset = '[TESTING - fake response]'
                else:
                    self.error_msg = (
                        "Could not retrieve remote content - Invalid URL")
            except ConnectionError:
                self.error_msg = (
                    "Could not retrieve remove content - Server could not be "
                    "reached")

        if self.error_msg:
            current_app.logger.error(self.error_msg + ": {}".format(url))

    @property
    def asset(self):
        """Return asset if available else error message"""
        if self._asset:
            try:
                return self._asset.format(**self.variables)
            except KeyError, e:
                self.error_msg = "Missing asset variable {}".format(e)
                current_app.logger.error(self.error_msg +
                                         ": {}".format(self.url))
        return self.error_msg


class VersionedResource(object):
    """Helper to manage versioned resource URLs (typically on Liferay)"""

    def __init__(self, url, variables=None):
        """Initialize based on requested URL

        Attempts to fetch the asset, permanent version of URL and link
        for content editing.

        In the event of an error, details are logged, and self.error_msg
        will be defined, and returned in a request for the asset attribute.

        :param url: the URL to pull details and asset from

        :attribute asset: will contain the html asset downloaed, found in the
            cache, or the error message if that fails.
        :attribute editor_url: defined if such was available, else None
        :attribute url: the `permanent url` for the resource if available,
            otherwise the original url.

        """
        self._asset, self.error_msg, self.editor_url = None, None, None
        self.url = url
        self.variables = variables or {}
        try:
            response = time_request(url)
            self._asset = response.json().get('asset')
            self.url = self._permanent_url(
                generic_url=url, version=response.json().get('version'))
            self.editor_url = response.json().get('editorUrl')
        except MissingSchema:
            if current_app.config.get('TESTING'):
                self._asset = '[TESTING - fake response]'
            else:
                self.error_msg = (
                    "Could not retrieve remote content - Invalid URL")
        except ValueError:  # raised when no json is available in response
            if response.status_code == 200:
                self._asset = response.text
            else:
                self.error_msg = (
                    "Could not retrieve remote content - " "{} {}".format(
                        response.status_code, response.reason))
        except ConnectionError:
            self.error_msg = (
                "Could not retrieve remove content - Server could not be "
                "reached")

        if self.error_msg:
            current_app.logger.error(self.error_msg + ": {}".format(url))

    @property
    def asset(self):
        """Return asset if available else error message"""
        if self._asset:
            try:
                return self._asset.format(**self.variables)
            except KeyError, e:
                self.error_msg = "Missing asset variable {}".format(e)
                current_app.logger.error(self.error_msg +
                                         ": {}".format(self.url))
        return self.error_msg

    def _permanent_url(self, generic_url, version):
        """Produce a permanent url from the metadata provided

        Resources are versioned - but the link maintained in the app_text
        table is not.

        When requesting the detailed resource, the effective version number is
        returned.  This method returns a permanent URL including the version
        number, useful for audit and tracking information.

        """
        parsed = urlparse(generic_url)
        qs = dict(parse_qsl(parsed.query))
        if version:
            qs['version'] = version

        path = parsed.path
        if path.endswith('/detailed'):
            path = path[:-(len('/detailed'))]
        format_dict = {
            'scheme': parsed.scheme,
            'netloc': parsed.netloc,
            'path': path,
            'qs': urlencode(qs)}
        url = "{scheme}://{netloc}{path}?{qs}".format(**format_dict)
        return url


class MailResource(object):
    """Helper to manage versioned mail resource URLs (typically on Liferay)"""

    def __init__(self, url, variables=None):
        """Initialize based on requested URL

        Attempts to fetch the mail fields, permanent version of URL and link
        for content editing.

        In the event of an error, details are logged, and self.error_msg
        will be defined, and returned in a request for the asset attribute.

        :param url: the URL to pull details and asset from

        :attribute subject: will contain the email subject download, found
            in the cache, or the error message if that fails.
        :attribute body: will contain the email subject body, found
            in the cache, or the error message if that fails.
        :attribute editor_url: defined if such was available, else None
        :attribute url: the `permanent url` for the resource if available,
            otherwise the original url.

        """
        self._subject, self._body, self._footer = None, None, None
        self.error_msg, self.editor_url = None, None
        self.url = url
        self.variables = variables or {}
        try:
            response = time_request(url)
            self._subject = response.json().get('subject')
            self._body = response.json().get('body')
            if current_app.config.get("DEBUG_EMAIL", False):
                self._body += '{debug_slot}'
            self._footer = response.json().get('footer')
            self.url = self._permanent_url(
                generic_url=url, version=response.json().get('version'))
            self.editor_url = response.json().get('editorUrl')
        except MissingSchema:
            if current_app.config.get('TESTING'):
                self._subject = 'TESTING SUBJECT'
                self._body = 'TESTING BODY'
                self._footer = 'TESTING FOOTER'
            else:
                self.error_msg = (
                    "Could not retrieve remote content - Invalid URL")
        except ValueError:  # raised when no json is available in response
            if response.status_code == 200:
                self._subject = response.text
                self._body = response.text
            else:
                self.error_msg = (
                    "Could not retrieve remote content - " "{} {}".format(
                        response.status_code, response.reason))
        except ConnectionError:
            self.error_msg = (
                "Could not retrieve remove content - Server could not be "
                "reached")

        if self.error_msg:
            current_app.logger.error(self.error_msg + ": {}".format(url))

    @property
    def subject(self):
        """Return subject if available else error message"""
        if self._subject:
            try:
                formatted = str(self._subject).format(**self.variables)
                return formatted
            except KeyError, e:
                self.error_msg = "Missing subject variable {}".format(e)
                current_app.logger.error(self.error_msg +
                                         ": {}".format(self.url))
                raise
        raise ValueError(self.error_msg)

    @property
    def body(self):
        """Return body if available else error message"""
        if self._body:
            try:
                formatted = str(self._body).format(**self.variables)
                if self._footer:
                    formatted += "\n"
                    formatted += self.footer
                return formatted
            except KeyError, e:
                self.error_msg = "Missing body variable {}".format(e)
                current_app.logger.error(self.error_msg +
                                         ": {}".format(self.url))
                raise
        raise ValueError(self.error_msg)

    @property
    def footer(self):
        """Return optional footer if available"""
        if self._footer:
            try:
                formatted = str(self._footer).format(**self.variables)
                return formatted
            except KeyError, e:
                self.error_msg = "Missing footer variable {}".format(e)
                current_app.logger.error(self.error_msg +
                                         ": {}".format(self.url))
                raise

    @property
    def variable_list(self):
        var_list = set()
        if self._subject:
            var_list.update(
                [v[1] for v in Formatter().parse(self._subject) if v[1]])
        if self._body:
            var_list.update(
                [v[1] for v in Formatter().parse(self._body) if v[1]])
        if self._footer:
            var_list.update(
                [v[1] for v in Formatter().parse(self._footer) if v[1]])
        return list(var_list)

    def _permanent_url(self, generic_url, version):
        """Produce a permanent url from the metadata provided

        Resources are versioned - but the link maintained in the app_text
        table is not.

        When requesting the detailed resource, the effective version number is
        returned.  This method returns a permanent URL including the version
        number, useful for audit and tracking information.

        """
        parsed = urlparse(generic_url)
        qs = dict(parse_qsl(parsed.query))
        if version:
            qs['version'] = version

        path = parsed.path
        if path.endswith('/detailed'):
            path = path[:-(len('/detailed'))]
        format_dict = {
            'scheme': parsed.scheme,
            'netloc': parsed.netloc,
            'path': path,
            'qs': urlencode(qs)}
        url = "{scheme}://{netloc}{path}?{qs}".format(**format_dict)
        return url


class UndefinedAppText(Exception):
    """Exception raised when requested AppText isn't defined"""
    pass


def app_text(name, *args):
    """Look up and return cusomized application text string

    May be embedded directly in jinja2 templates.  Call `app_text()`
    with the 'name' to uniquely identify the custom string to lookup
    and return.

    Custom strings may contain an arbitrary number of additional parameters.
    They should be embedded as zero indexed curly brackets for inclusion.

    For example, given AppText(name='ex', custom_text='Hello {0}. {1} {0}'), a
    call to `app_text('ex', 'Bob', 'Gooday')` would return:
        'Hello Bob. Gooday Bob'

    Custom strings may also reference configuration variables.  For example,
    to include the configured value of USER_APP_NAME in the custom_text,
    given:
        AppText(name='config example',
                custom_text='Welcome to {config[USER_APP_NAME]}")

    a call to `app_text('config example')` would produce something like:
        'Welcome to TrueNTH'

    NB javascript variables are not evaluated till the client browser sees
    the page, therefore any javascript variables will not be available in time
    for app_text() to use them.

    :raises UndefinedAppText: if the `name` isn't found.

    """
    item = AppText.query.filter_by(name=name).first()
    if not item:
        if current_app.config.get('TESTING'):
            return "[TESTING - ignore missing app_text '{}']".format(name)
        raise UndefinedAppText(
            "unknown customized app string '{}'".format(name))

    text = str(item)
    try:
        if 'config[' in text:
            return gettext(text.format(*args, config=current_app.config))
        return gettext(text.format(*args))
    except IndexError:
        if not args:
            args = ('<None>',)
        raise ValueError(
            "AppText with name '{}' defines more parameters "
            "than provided: `{}`".format(name, *args))
