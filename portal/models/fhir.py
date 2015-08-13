"""Model classes for retaining FHIR data"""
from datetime import date, datetime
from ..extensions import db

def as_fhir(obj):
    """For builtin types needing FHIR formatting help

    Returns obj as JSON FHIR formatted string

    """
    if hasattr(obj, 'as_fhir'):
        return obj.as_fhir()
    if isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%dT%H:%M:%S%z")
    if isinstance(obj, date):
        return obj.strftime('%Y-%m-%d')


class CodeableConcept(db.Model):
    __tablename__ = 'codeable_concepts'
    id = db.Column(db.Integer, primary_key=True)
    system = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(80), nullable=False)
    display = db.Column(db.Text, nullable=False)

    def as_fhir(self):
        """Return self in JSON FHIR formatted string"""
        d = {}
        for i in ("system", "code", "display"):
            if getattr(self, i):
                d[i] = getattr(self, i)
        return {"name": {"coding": [d,]}}

    def add_if_not_found(self):
        """Add self to database, or return existing

        Queries for similar, existing CodeableConcept (matches on
        system and code alone).  Populates self.id if found, adds
        to database first if not.

        """
        match = self.query.filter_by(system=self.system,
                code=self.code).first()
        if match:
            self.id = match.id
        else:
            db.session.add(self)
            db.session.flush()
        assert self.id
        return self


class ValueQuantity(db.Model):
    __tablename__ = 'value_quantities'
    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(80))
    units = db.Column(db.String(80))
    system = db.Column(db.String(255))
    code = db.Column(db.String(80))

    def as_fhir(self):
        """Return self in JSON FHIR formatted string"""
        d = {}
        for i in ("value", "units", "system", "code"):
            if getattr(self, i):
                d[i] = getattr(self, i)
        return {"valueQuantity": d}

    def add_if_not_found(self):
        """Add self to database, or return existing

        Queries for similar, existing ValueQuantity (matches on
        value, units and system alone).  Populates self.id if found,
        adds to database first if not.

        """
        lookup_value = self.value and str(self.value) or None
        match = self.query.filter_by(value=lookup_value,
                units=self.units, system=self.system).first()
        if match:
            self.id = match.id
        else:
            db.session.add(self)
            db.session.flush()
        assert self.id
        return self


class Observation(db.Model):
    __tablename__ = 'observations'
    id = db.Column(db.Integer, primary_key=True)
    issued = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(80))
    codeable_concept_id = db.Column(db.ForeignKey('codeable_concepts.id'))
    value_quantity_id = db.Column(db.ForeignKey('value_quantities.id'))

    codeable_concept = db.relationship(CodeableConcept)
    value_quantity = db.relationship(ValueQuantity)

    def as_fhir(self):
        """Return self in JSON FHIR formatted string"""
        fhir = {"resourceType": "Observation"}
        if self.issued:
            fhir['issued'] = as_fhir(self.issued)
        if self.status:
            fhir['status'] = self.status
        fhir.update(self.codeable_concept.as_fhir())
        fhir.update(self.value_quantity.as_fhir())
        return fhir

    def add_if_not_found(self):
        """Add self to database, or return existing

        Queries for matching, existing Observation.
        Populates self.id if found, adds to database first if not.

        """
        match = self.query.filter_by(issued=self.issued,
                status=self.status,
                codeable_concept_id=self.codeable_concept_id,
                value_quantity_id=self.value_quantity_id).first()
        if match:
            self.id = match.id
        else:
            db.session.add(self)
            db.session.flush()
        assert self.id
        return self


class UserObservation(db.Model):
    __tablename__ = 'user_observations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.ForeignKey('users.id'))
    observation_id = db.Column(db.ForeignKey('observations.id'))

    def add_if_not_found(self):
        """Add self to database, or return existing

        Queries for matching, existing UserObservation.
        Populates self.id if found, adds to database first if not.

        """
        match = self.query.filter_by(user_id=self.user_id,
                observation_id=self.observation_id).first()
        if match:
            self.id = match.id
        else:
            db.session.add(self)
            db.session.flush()
        assert self.id
        return self



