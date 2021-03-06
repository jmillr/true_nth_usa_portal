"""Unit test module for app_text"""
from flask import render_template
from flask_webtest import SessionScope

from portal.extensions import db
from portal.models.app_text import AppText, app_text, VersionedResource
from portal.models.app_text import UnversionedResource, MailResource
from portal.models.user import User
from tests import TestCase, TEST_USER_ID


from urlparse import urlparse, parse_qsl
from urllib import unquote_plus


class Url(object):
    '''A url object that can be compared with other url orbjects
    without regard to the vagaries of encoding, escaping, and ordering
    of parameters in query strings.'''

    def __init__(self, url):
        parts = urlparse(url)
        _query = frozenset(parse_qsl(parts.query))
        _path = unquote_plus(parts.path)
        parts = parts._replace(query=_query, path=_path)
        self.parts = parts

    def __eq__(self, other):
        return self.parts == other.parts

    def __hash__(self): return hash(self.parts)


class TestAppText(TestCase):

    def test_expansion(self):
        with SessionScope(db):
            title = AppText(name='landing title')
            title.custom_text = '_expanded_'
            db.session.add(title)
            db.session.commit()
        result = render_template('landing.html')
        self.assertTrue('_expanded_' in result)

    def test_missing_arg(self):
        with SessionScope(db):
            title = AppText(name='landing title')
            title.custom_text = '_expanded_ {0}'
            db.session.add(title)
            db.session.commit()
        self.assertRaises(ValueError, render_template, 'landing.html')

    def test_permanent_url(self):
        args = {
            'uuid': 'cbe17d0d-f25d-27fb-0d92-c22bc687bb0f',
            'origin': self.app.config['LR_ORIGIN'],
            'version': '1.3'}
        sample = (
            '{origin}/c/portal/truenth/asset/detailed?'
            '&uuid={uuid}&version=latest'.format(**args))
        expected = (
            '{origin}/c/portal/truenth/asset?uuid={uuid}&'
            'version={version}'.format(**args))

        result = VersionedResource(sample)._permanent_url(
            generic_url=sample, version=args['version'])
        self.assertTrue(Url(result) == Url(expected))

    def test_config_value_in_custom_text(self):
        self.app.config['CT_TEST'] = 'found!'
        with SessionScope(db):
            embed_config_value = AppText(
                name='embed config value',
                custom_text='Do you see {config[CT_TEST]}?')
            db.session.add(embed_config_value)
            db.session.commit()

        result = app_text('embed config value')
        self.assertTrue('found!' in result)

    def test_fetch_elements_invalid_url(self):
        sample_url = "https://notarealwebsitebeepboop.com"
        sample_error = (
            "Could not retrieve remove content - Server could not be reached")
        result = VersionedResource(sample_url)
        self.assertEquals(result.error_msg, sample_error)
        self.assertEquals(result.url, sample_url)
        # self.asset should still work (and equal the error text)
        self.assertEquals(result.asset, sample_error)

    def test_asset_variable_replacement(self):
        test_user = User.query.get(TEST_USER_ID)

        test_url = "https://notarealwebsitebeepboop.com"
        test_asset = "Hello {firstname} {lastname}! Your user ID is {id}"
        test_vars = {"firstname": test_user.first_name,
                     "lastname": test_user.last_name,
                     "id": TEST_USER_ID}
        resource = UnversionedResource(test_url,
                                       asset=test_asset,
                                       variables=test_vars)
        rf_id = int(resource.asset.split()[-1])
        self.assertEquals(rf_id, TEST_USER_ID)

        invalid_asset = "Not a real {variable}!"
        resource = UnversionedResource(test_url,
                                       asset=invalid_asset,
                                       variables=test_vars)
        error_key = resource.asset.split()[-1]
        self.assertEquals(error_key, "'variable'")

    def test_mail_resource(self):
        testvars = {"subjkey": "test",
                    "bodykey1": "123",
                    "bodykey2": "456",
                    "footerkey": "foot"}
        tmr = MailResource(None, variables=testvars)

        self.assertEquals(tmr.subject, "TESTING SUBJECT")
        self.assertEquals(tmr.body.splitlines()[0], "TESTING BODY")
        self.assertEquals(tmr.body.splitlines()[1], "TESTING FOOTER")

        tmr._subject = "Replace this: {subjkey}"
        tmr._body = "Replace these: {bodykey1} and {bodykey2}"
        tmr._footer = "Replace this: {footerkey}"

        self.assertEquals(tmr.subject.split()[-1], "test")
        self.assertEquals(tmr.body.splitlines()[0].split()[-1], "456")
        self.assertEquals(tmr.body.splitlines()[1].split()[-1], "foot")
        self.assertEquals(set(tmr.variable_list), set(testvars.keys()))

        # test footer optionality
        tmr._footer = None
        self.assertEquals(len(tmr.body.splitlines()), 1)
