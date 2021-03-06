"""Identifier Model Module"""

from ..database import db
from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM


identifier_use = ENUM('usual', 'official', 'temp', 'secondary',
                      name='id_use', create_type=False)


class Identifier(db.Model):
    """Identifier ORM, for FHIR Identifier resources"""
    __tablename__ = 'identifiers'
    id = db.Column(db.Integer, primary_key=True)
    use = db.Column('id_use', identifier_use)
    system = db.Column(db.String(255), nullable=False)
    _value = db.Column('value', db.Text, nullable=False)
    assigner = db.Column(db.String(255))

    __table_args__ = (UniqueConstraint('system', 'value',
        name='_identifier_system_value'),)

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, value):
        # Force to text
        self._value = unicode(value)

    @classmethod
    def from_fhir(cls, data):
        instance = cls()
        # if we aren't given a 'use', call it 'usual'
        instance.use = data['use'] if 'use' in data else 'usual'
        instance.system = data['system']
        instance.value = data['value']
        # FHIR changed - assigner needs to reference object in system
        # not storing at this time
        #if 'assigner' in data:
        #    instance.assigner = data['assigner']
        return instance

    def __str__(self):
        return 'Identifier {0.use} {0.system} {0.value}'.format(self)

    def __eq__(self, other):
        ## Only compare (system, value), as per unique constraint
        return self.system == other.system and self.value == other.value

    def as_fhir(self):
        d = {}
        for k in ('use', 'system', 'value', 'assigner'):
            if getattr(self, k, None):
                d[k] = getattr(self, k)
        return d

    def add_if_not_found(self, commit_immediately=False):
        """Add self to database, or return existing

        Queries for similar, matching on **system** and **value** alone.
        Note the database unique constraint to match.

        @return: the new or matched Identifier

        """
        existing = Identifier.query.filter_by(system=self.system,
                                              _value=self.value).first()
        if not existing:
            db.session.add(self)
            if commit_immediately:
                db.session.commit()
        else:
            self.id = existing.id
        self = db.session.merge(self)
        return self


class UserIdentifier(db.Model):
    """ORM class for user_identifiers data

    Holds links to any additional identifiers a user may have,
    such as study participation.

    """
    __tablename__ = 'user_identifiers'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.ForeignKey('users.id'), nullable=False)
    identifier_id = db.Column(
        db.ForeignKey('identifiers.id'), nullable=False)
    identifier = db.relationship(Identifier, cascade="save-update")
    user = db.relationship('User', cascade="save-update")

    def __str__(self):
        return ("user_identifier {} for {}".format(
            self.identifier, self.user))
