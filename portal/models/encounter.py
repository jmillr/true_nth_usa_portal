"""Model classes for patient encounters.

Designed around FHIR guidelines for representation of encounters.
"""
from datetime import datetime

from ..database import db
from ..date_tools import as_fhir, FHIR_datetime
from .fhir import Coding
from .reference import Reference
from .role import ROLE
from sqlalchemy.dialects.postgresql import ENUM


class EncounterCodings(db.Model):
    """Link table joining Encounter with n Encounter types"""

    __tablename__ = 'encounter_codings'
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.ForeignKey('encounters.id'), nullable=False)
    coding_id = db.Column(db.ForeignKey('codings.id'), nullable=False)


# http://www.hl7.org/FHIR/encounter-definitions.html#Encounter.status
status_types = ENUM(
    'planned', 'arrived', 'in-progress', 'onleave', 'finished', 'cancelled',
    name='statuses', create_type=False)

# authentication method type extension to the standard FHIR format
auth_method_types = ENUM(
    'password_authenticated', 'url_authenticated', 'staff_authenticated',
    'staff_handed_to_patient', 'service_token_authenticated',
    name='auth_methods', create_type=False)


class Encounter(db.Model):
    """Model representing a FHIR encounter

    Per FHIR guidelines, encounters are defined as interactions between
    a patient and healthcare provider(s) for the purpose of providing
    healthcare service(s) or assessing the health status of a patient.

    """
    __tablename__ = 'encounters'
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column('status', status_types, nullable=False)
    user_id = db.Column(
        db.ForeignKey(
            'users.id',
            name='encounters_user_id_fk'),
        nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    """required whereas end_time is optional
    """
    end_time = db.Column(db.DateTime, nullable=True)
    """when not defined, Period is assumed to be ongoing
    """
    auth_method = db.Column('auth_method', auth_method_types, nullable=False)
    type = db.relationship("Coding", secondary='encounter_codings')

    def __str__(self):
        """Log friendly string format"""
        def period():
            if self.end_time:
                return "{} to {}".format(
                    FHIR_datetime.as_fhir(self.start_time),
                    FHIR_datetime.as_fhir(self.end_time))
            return FHIR_datetime.as_fhir(self.start_time)

        return "Encounter of status {} on {} via {} from {}".format(
            self.status, self.user_id, self.auth_method, period())

    def as_fhir(self):
        """produces FHIR representation of encounter in JSON format"""
        d = {}
        d['resourceType'] = 'Encounter'
        d['id'] = self.id
        d['status'] = self.status
        d['patient'] = Reference.patient(self.user_id).as_fhir()
        d['period'] = {'start': as_fhir(self.start_time)}
        if self.end_time:
            d['period']['end'] = as_fhir(self.end_time)
        if self.type:
            d['type'] = [coding.as_fhir() for coding in self.type]
        d['auth_method'] = self.auth_method
        return d

    @classmethod
    def from_fhir(cls, data):
        """Parses FHIR data to produce a new encounter instance"""
        p = cls()
        p.status = data['status']
        p.user_id = Reference.parse(data['patient']).id
        period = data['period']
        p.start_time = FHIR_datetime.parse(
            period['start'], error_subject='period.start')
        if 'end' in period:
            p.end_time = FHIR_datetime.parse(
                period['end'], error_subject='period.end')
        p.auth_method = data['auth_method']
        return p


def initiate_encounter(user, auth_method):
    """On login, generate a new encounter for given user and auth_method

    We use encounters to track authentication mechanisms.  Given the
    unreliable nature of logout (server may have cycled, may miss a
    timeout, etc.) take this opportunity to clean up any existing
    encounters that are still open.

    """
    # Look for any stale encounters needing to be closed out.
    finish_encounter(user)

    # Service users appear to have provided password, but get their
    # own special label
    if user.has_role(ROLE.SERVICE):
        auth_method = 'service_token_authenticated'

    # Initiate new as directed
    encounter = Encounter(
        status='in-progress', auth_method=auth_method,
        start_time=datetime.utcnow(), user_id=user.id)
    db.session.add(encounter)
    db.session.commit()


def finish_encounter(user):
    """On logout, terminate user's active encounter, if found """
    assert(user)
    now = datetime.utcnow()
    # Look for any stale encounters needing to be closed out.
    query = Encounter.query.filter(Encounter.user_id == user.id).filter(
        Encounter.status == 'in-progress').filter(Encounter.end_time.is_(None))
    for encounter in query:
        encounter.status = 'finished'
        encounter.end_time = now
