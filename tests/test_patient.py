"""Test module for patient specific APIs"""
from flask_webtest import SessionScope
import json

from portal.extensions import db
from portal.models.identifier import Identifier, UserIdentifier
from portal.models.role import ROLE
from tests import TestCase, TEST_USERNAME, TEST_USER_ID


class TestPatient(TestCase):

    def test_email_search(self):
        self.promote_user(role_name=ROLE.PATIENT)
        self.login()
        rv = self.client.get(
            '/api/patient?email={}'.format(TEST_USERNAME),
            follow_redirects=True)
        # Known patient but w/o patient role should 404
        self.assert200(rv)
        self.assertTrue(rv.json['resourceType'] == 'Patient')

    def test_email_search_non_patient(self):
        self.login()
        rv = self.client.get(
            '/api/patient?email={}'.format(TEST_USERNAME),
            follow_redirects=True)
        # Known patient but w/o patient role should 404
        self.assert404(rv)

    def test_inadequate_perms(self):
        dummy = self.add_user(username='dummy@example.com')
        self.promote_user(user=dummy, role_name=ROLE.PATIENT)
        self.login()
        rv = self.client.get(
            '/api/patient?email={}'.format('dummy@example.com'),
            follow_redirects=True)
        # w/o permission, should see a 404 not a 401 on search
        self.assert404(rv)

    def test_ident_search(self):
        ident = Identifier(system='http://example.com', value='testy')
        ui = UserIdentifier(identifier=ident, user_id=TEST_USER_ID)
        with SessionScope(db):
            db.session.add(ident)
            db.session.add(ui)
            db.session.commit()
        self.promote_user(role_name=ROLE.PATIENT)
        self.login()
        ident = db.session.merge(ident)
        rv = self.client.get(
            '/api/patient?identifier={}'.format(json.dumps(ident.as_fhir())),
            follow_redirects=True)
        self.assert200(rv)

    def test_ident_nomatch_search(self):
        ident = Identifier(system='http://example.com', value='testy')
        ui = UserIdentifier(identifier=ident, user_id=TEST_USER_ID)
        with SessionScope(db):
            db.session.add(ident)
            db.session.add(ui)
            db.session.commit()
        self.promote_user(role_name=ROLE.PATIENT)
        self.login()
        ident = db.session.merge(ident)
        # modify the system to mis match
        id_str = json.dumps(ident.as_fhir()).replace(
            "example.com", "wrong-system.com")
        rv = self.client.get(
            '/api/patient?identifier={}'.format(id_str),
            follow_redirects=True)
        self.assert404(rv)

    def test_ill_formed_ident_search(self):
        ident = Identifier(system='http://example.com', value='testy')
        ui = UserIdentifier(identifier=ident, user_id=TEST_USER_ID)
        with SessionScope(db):
            db.session.add(ident)
            db.session.add(ui)
            db.session.commit()
        self.promote_user(role_name=ROLE.PATIENT)
        self.login()
        ident = db.session.merge(ident)
        rv = self.client.get(
            '/api/patient?identifier=system"http://example.com",value="testy"',
            follow_redirects=True)
        self.assert400(rv)
