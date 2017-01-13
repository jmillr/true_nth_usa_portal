"""Configuration"""
import os
from flask_script import Server


class BaseConfig(object):
    """Base configuration - override in subclasses"""
    ANONYMOUS_USER_ACCOUNT = True
    CELERY_BROKER_URL = os.environ.get(
        'CELERY_BROKER_URL',
        'redis://localhost:6379/0'
    )
    REQUEST_CACHE_URL = os.environ.get(
        'REQUEST_CACHE_URL',
        'redis://localhost:6379/0'
    )
    CELERY_IMPORTS = ('portal.tasks', )
    CELERY_RESULT_BACKEND = 'redis'
    DEBUG = False
    DEFAULT_MAIL_SENDER = 'dontreply@truenth-demo.cirg.washington.edu'
    LOG_FOLDER = os.environ.get(
        'LOG_FOLDER',
        os.path.join('/var/log', __package__)
    )
    LOG_LEVEL = 'DEBUG'

    MAIL_USERNAME = 'portal@truenth-demo.cirg.washington.edu'
    MAIL_DEFAULT_SENDER = '"TrueNTH" <noreply@truenth-demo.cirg.washington.edu>'
    CONTACT_SENDTO_EMAIL = MAIL_USERNAME
    ERROR_SENDTO_EMAIL = MAIL_USERNAME
    OAUTH2_PROVIDER_TOKEN_EXPIRES_IN = 4 * 60 * 60  # units: seconds
    SS_TIMEOUT = 60 * 60  # seconds for session cookie, reset on ping
    PERMANENT_SESSION_LIFETIME = SS_TIMEOUT
    PIWIK_DOMAINS = ""
    PIWIK_SITEID = 0
    PORTAL_STYLESHEET = 'css/portal.css'
    PROJECT = "portal"
    SHOW_EXPLORE = True
    SHOW_PROFILE_MACROS = ['ethnicity', 'race']
    SHOW_WELCOME = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'SQLALCHEMY_DATABASE_URI',
        'postgresql://test_user:4tests_only@localhost/portal_unit_tests'
    )
    SECRET_KEY = 'override this secret key'
    SESSION_PERMANENT = True
    SESSION_TYPE = 'redis'


    SESSION_REDIS_URL = os.environ.get(
        'SESSION_REDIS_URL',
        'redis://localhost:6379/0'
    )

    from redis import Redis
    from urlparse import urlparse
    redis_url = urlparse(SESSION_REDIS_URL)

    # Todo: create issue @ fengsp/flask-session
    # config values aren't typically objects...
    SESSION_REDIS = Redis(
        host=redis_url.hostname if redis_url.hostname else None,
        port=redis_url.port if redis_url.port else None,
        db=redis_url.path.split('/')[1] if redis_url.hostname else None,
    )

    TESTING = False
    USER_APP_NAME = 'TrueNTH'  # used by email templates
    USER_AFTER_LOGIN_ENDPOINT = 'auth.next_after_login'
    USER_AFTER_CONFIRM_ENDPOINT = USER_AFTER_LOGIN_ENDPOINT
    USER_ENABLE_USERNAME = False  # using email as username
    USER_ENABLE_CHANGE_USERNAME = False  # prereq for disabling username
    USER_ENABLE_CONFIRM_EMAIL = False  # don't force email conf on new accounts

    PROVIDER_BULK_DATA_ACCESS = True
    PATIENTS_BY_PROVIDER_ADDL_FIELDS = [] # 'status', 'reports'

    FB_CONSUMER_KEY = os.environ.get('FB_CONSUMER_KEY', '')
    FB_CONSUMER_SECRET = os.environ.get('FB_CONSUMER_SECRET', '')
    GOOGLE_CONSUMER_KEY = os.environ.get('GOOGLE_CONSUMER_KEY', '')
    GOOGLE_CONSUMER_SECRET = os.environ.get('GOOGLE_CONSUMER_SECRET', '')

    DEFAULT_LOCALE = 'en_US'
    FILE_UPLOAD_DIR = 'uploads'
    LR_ORIGIN = 'https://stg-cms.us.truenth.org'
    LR_GROUP = 20142

class DefaultConfig(BaseConfig):
    """Default configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = False

class TestConfig(BaseConfig):
    """Testing configuration - used by unit tests"""
    TESTING = True
    SERVER_NAME = 'localhost:5005'
    LIVESERVER_PORT = 5005
    SQLALCHEMY_ECHO = False


    WTF_CSRF_ENABLED = False
    FILE_UPLOAD_DIR = 'test_uploads'


class ConfigServer(Server):  # pragma: no cover
    """Correctly read Flask configuration values when running Flask

    Flask-Script 2.0.5 does not read host and port specified in
    SERVER_NAME.  This subclass fixes that.

    Bug: https://github.com/smurfix/flask-script/blob/7dfaf2898d648761632dc5b3ba6654edff67ec57/flask_script/commands.py#L343

    Values passed in when instance is called as a function override
    those passed during initialization which override configured values

    See https://github.com/smurfix/flask-script/issues/108
    """
    def __init__(self, port=None, host=None, **kwargs):
        """Override default port and host

        Allow fallback to configured values

        """
        super(ConfigServer, self).__init__(port=port, host=host, **kwargs)

    def __call__(self, app=None, host=None, port=None, *args, **kwargs):
        """Call app.run() with highest precedent configuration values"""
        # Fallback to initialized value if None is passed
        port = self.port if port is None else port
        host = self.host if host is None else host
        super(ConfigServer, self).__call__(app=app, host=host,
                port=port, *args, **kwargs)

