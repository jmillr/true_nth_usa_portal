"""Coredata tests"""
from flask_webtest import SessionScope
from tests import TestCase

from portal.extensions import db
from portal.models.coredata import Coredata, configure_coredata
from portal.models.role import ROLE


TRUENTH = 'TrueNTH'
EPROMS = 'ePROMs'
PRIVACY = 'privacy_policy'
WEB_TOU = 'website_terms_of_use'
SUBJ_CONSENT = 'subject_website_consent'
STORED_FORM = 'stored_website_consent_form'


class TestCoredata(TestCase):

    def config_as(self, system):
        """Set REQUIRED_CORE_DATA to match system under test"""
        # Ideally this would be read directly from the respective
        # site_persistence repos...
        if system == TRUENTH:
            self.app.config['REQUIRED_CORE_DATA'] = [
                'name', 'dob', 'role', 'org', 'clinical', 'localized',
                'race', 'ethnicity', 'indigenous',
                'website_terms_of_use'
            ]
        elif system == EPROMS:
            self.app.config['REQUIRED_CORE_DATA'] = [
                'org', 'website_terms_of_use', 'subject_website_consent',
                'stored_website_consent_form', 'privacy_policy', 'race',
                'ethnicity']
        else:
            raise ValueError("unsupported system {}".format(system))

        # reset coredata singleton, which already read in config
        # during bootstrap
        Coredata.reset()
        configure_coredata(self.app)

    def test_registry(self):
        self.assertTrue(len(Coredata()._registered) > 1)

    def test_partner(self):
        """Partner doesn't need dx etc., set min and check pass"""
        self.config_as(TRUENTH)
        self.bless_with_basics()
        self.promote_user(role_name=ROLE.PARTNER)
        self.test_user = db.session.merge(self.test_user)
        self.assertTrue(Coredata().initial_obtained(self.test_user))

    def test_patient(self):
        """Patient has additional requirements"""
        self.config_as(TRUENTH)
        self.bless_with_basics()
        self.promote_user(role_name=ROLE.PATIENT)
        self.test_user = db.session.merge(self.test_user)
        # Prior to adding clinical data, should return false
        Coredata()
        self.assertFalse(Coredata().initial_obtained(self.test_user))

        self.login()
        self.add_required_clinical_data()
        with SessionScope(db):
            db.session.commit()
        self.test_user = db.session.merge(self.test_user)
        # should leave only indigenous, race and ethnicity as options
        # and nothing required
        self.assertTrue(Coredata().initial_obtained(self.test_user))
        expect = set(('race', 'ethnicity', 'indigenous'))
        found = set(Coredata().optional(self.test_user))
        self.assertEquals(found, expect)

    def test_still_needed(self):
        """Query for list of missing datapoints in legible format"""
        self.config_as(TRUENTH)
        self.promote_user(role_name=ROLE.PATIENT)
        self.test_user = db.session.merge(self.test_user)

        needed = Coredata().still_needed(self.test_user)
        self.assertTrue(len(needed) > 1)
        self.assertTrue('dob' in needed)
        self.assertTrue('website_terms_of_use' in needed)
        self.assertTrue('clinical' in needed)
        self.assertTrue('org' in needed)

        # needed should match required (minus 'name', 'role')
        required = Coredata().required(self.test_user)
        self.assertEquals(set(required) - set(needed), set(('name', 'role')))

    def test_eproms_staff(self):
        """Eproms staff: privacy policy and website terms of use"""
        self.config_as(EPROMS)
        self.promote_user(role_name=ROLE.STAFF)
        self.test_user = db.session.merge(self.test_user)

        needed = Coredata().still_needed(self.test_user)
        self.assertTrue(PRIVACY in needed)
        self.assertTrue(WEB_TOU in needed)
        self.assertFalse(SUBJ_CONSENT in needed)
        self.assertFalse(STORED_FORM in needed)

    def test_eproms_patient(self):
        """Eproms patient: all ToU but stored form"""
        self.config_as(EPROMS)
        self.promote_user(role_name=ROLE.PATIENT)
        self.test_user = db.session.merge(self.test_user)

        needed = Coredata().still_needed(self.test_user)
        self.assertTrue(PRIVACY in needed)
        self.assertTrue(WEB_TOU in needed)
        self.assertTrue(SUBJ_CONSENT in needed)
        self.assertFalse(STORED_FORM in needed)

    def test_enter_manually_interview_assisted(self):
        "interview: subject_website_consent and stored_web_consent_form"
        self.config_as(EPROMS)
        self.promote_user(role_name=ROLE.STAFF)
        patient = self.add_user('patient')
        self.promote_user(patient, role_name=ROLE.PATIENT)
        self.test_user, patient = map(
            db.session.merge, (self.test_user, patient))

        needed = Coredata().still_needed(
            patient, entry_method='interview assisted')
        self.assertFalse(PRIVACY in needed)
        self.assertFalse(WEB_TOU in needed)
        self.assertTrue(SUBJ_CONSENT in needed)
        self.assertTrue(STORED_FORM in needed)

    def test_enter_manually_paper(self):
        "paper: subject_website_consent"
        self.config_as(EPROMS)
        self.promote_user(role_name=ROLE.STAFF)
        patient = self.add_user('patient')
        self.promote_user(patient, role_name=ROLE.PATIENT)
        self.test_user, patient = map(
            db.session.merge, (self.test_user, patient))

        needed = Coredata().still_needed(
            patient, entry_method='paper')
        self.assertFalse(PRIVACY in needed)
        self.assertFalse(WEB_TOU in needed)
        self.assertTrue(SUBJ_CONSENT in needed)
        self.assertFalse(STORED_FORM in needed)
