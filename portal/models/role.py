"""Role module

Role data lives in the `roles` table, populated via:
    `flask seed`

To restrict access to a given role, use the ROLE object:
    @roles_required(ROLE.ADMIN)

To extend the list of roles, add name: description pairs to the
STATIC_ROLES dict within.

"""
from ..database import db
from UserDict import IterableUserDict


class Role(db.Model):
    """SQLAlchemy class for `roles` table"""
    __tablename__ = 'roles'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(50), unique=True)
    description = db.Column(db.Text)

    def __str__(self):
        return "Role {}".format(self.name)

#Source definition for roles, as dictionary {name: description,}
STATIC_ROLES = IterableUserDict({
    'admin':
        'Administrator privileges, i.e. carte blanche',
    'analyst':
        'Grants view permissions for reporting data (does not include PHI)',
    'anon':
        'Anonymous role - exclusive to accounts generated prior to '
        'user authentication',
    'application_developer':
        'Gives users permission to add/view/edit TrueNTH applications',
    'content_manager':
        'Gives user permission to add/view/edit associated content '
        'managment systems',
    'intervention_staff':
        'Grants user permission to view patient information (name, DOB, etc) '
        'from relevant intervention patients',
    'partner':
        "An intimate partner, use the partner relationship to define "
        "whom the patient's partner is",
    'patient':
        'Default role for all patients, may only view their own '
        'patient data',
    'promote_without_identity_challenge':
        'Users with "write_only" may be promoted without the standard '
        'identity challenge if they are also have this role',
    'researcher':
        'Gives user access to the Research page',
    'staff':
        'Health care provider or staff at a TrueNTH-collaborating clinic',
    'staff_admin':
        'Staff administrator, with access to both patients and staff '
        'from their organization tree',
    'service':
        'Reserved for automated service accounts needing API access',
    'test':
        'Designates a testing user',
    'write_only':
        'Limited access account, write only, cannot view data from '
        'previous sessions',
})


def enum(**items):
    """Convert dictionary to Enumeration for direct access"""
    return type('Enum', (), items)

ROLE = enum(**{unicode(r).upper():r for r in STATIC_ROLES})
ALL_BUT_WRITE_ONLY = [r for r in STATIC_ROLES if r != 'write_only']


def add_static_roles():
    """Seed database with default static roles

    Idempotent - run anytime to pick up any new roles in existing dbs

    """
    for r in STATIC_ROLES:
        if not Role.query.filter_by(name=r).first():
            db.session.add(Role(name=r, description=STATIC_ROLES[r]))
