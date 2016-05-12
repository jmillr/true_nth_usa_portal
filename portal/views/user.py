"""User API view functions"""
from flask import abort, Blueprint, jsonify
from flask import request
from flask.ext.user import roles_required

from ..audit import auditable_event
from ..models.role import ROLE, Role
from ..models.relationship import Relationship
from ..models.user import current_user, get_user
from ..models.user import User, UserRelationship, UserRoles
from ..extensions import oauth
from ..extensions import db

user_api = Blueprint('user_api', __name__, url_prefix='/api')

@user_api.route('/me')
@oauth.require_oauth()
def me():
    """Access basics for current user

    returns authenticated user's id, username and email in JSON
    ---
    tags:
      - User
    operationId: me
    produces:
      - application/json
    responses:
      200:
        description: successful operation
        schema:
          id: user
          required:
            - id
            - username
            - email
          properties:
            id:
              type: integer
              format: int64
              description: TrueNTH ID for user
            username:
              type: string
              description: User's username
            email:
              type: string
              description: User's preferred email address
      401:
        description: if missing valid OAuth token

    """
    user = current_user()
    return jsonify(id=user.id, username=user.username,
                   email=user.email)


@user_api.route('/account', methods=('POST',))
@oauth.require_oauth()
def account():
    """Create a user account

    Use cases:
    Interventions call this, get a truenth ID back, and subsequently call:
    1. PUT /api/demographics/<id>, with known details for the new user
    2. PUT /api/user/<id>/roles to grant the user role(s)
    3. PUT /api/intervention/<name> grants the user access to the intervention.
    ---
    tags:
      - User
    operationId: createAccount
    produces:
      - application/json
    responses:
      200:
        description:
            "Returns {user_id: id}"
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id
    """
    user = User(username='Anonymous')
    db.session.add(user)
    db.session.commit()
    auditable_event("new account {} generated".format(user.id),
                    user_id=current_user().id)
    return jsonify(user_id=user.id)


@user_api.route('/relationships')
@oauth.require_oauth()
def system_relationships():
    """Returns simple JSON defining all system relationships

    Returns a list of all known relationships.
    ---
    tags:
      - User
    operationId: system_relationships
    produces:
      - application/json
    responses:
      200:
        description: Returns a list of all known relationships.
        schema:
          id: relationships
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                relationship name, a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the relationship.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view system relationships

    """
    results = [{'name': r.name, 'description': r.description}
               for r in Relationship.query.all()]
    return jsonify(relationships=results)


@user_api.route('/user/<int:user_id>/relationships')
@oauth.require_oauth()
def relationships(user_id):
    """Returns simple JSON defining user relationships

    Relationships may exist between user accounts.  A user may have
    any number of relationships.  The relationship
    is a one-way definition defined to extend permissions to appropriate
    users, such as intimate partners or service account sponsors.

    The JSON returned includes all relationships for the given user both
    as subject and as part of the relationship predicate.
    ---
    tags:
      - User
    operationId: getrelationships
    parameters:
      - name: user_id
        in: path
        description: TrueNTH user ID
        required: true
        type: integer
        format: int64
    produces:
      - application/json
    responses:
      200:
        description:
          Returns the list of relationships that user belongs to.
        schema:
          id: relationships
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                relationship name, a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the relationship.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id

    """
    user = current_user()
    if user.id != user_id:
        current_user().check_role(permission='view', other_id=user_id)
        user = get_user(user_id)
    results = []
    for r in user.relationships:
        results.append({'user': r.user_id,
                        'has the relationship': r.relationship.name,
                        'with': r.other_user_id})
    # add in any relationships where the user is on the predicate side
    predicates = UserRelationship.query.filter_by(other_user_id=user_id)
    for r in predicates:
        results.append({'user': r.user_id,
                        'has the relationship': r.relationship.name,
                        'with': r.other_user_id})
    return jsonify(relationships=results)


@user_api.route('/user/<int:user_id>/relationships', methods=('DELETE',))
@oauth.require_oauth()
def delete_relationships(user_id):
    """Delete relationships for user, returns JSON defining user relationships

    Used to delete relationship assignments for a user.

    Returns a list of all relationships user belongs to after change.
    ---
    tags:
      - User
    operationId: deleterelationships
    produces:
      - application/json
    parameters:
      - name: user_id
        in: path
        description: TrueNTH user ID
        required: true
        type: integer
        format: int64
      - in: body
        name: body
        schema:
          id: relationships
          required:
            - name
          properties:
            name:
              type: string
              description:
                The string defining the name of each relationship the user should
                belong to.  Must exist as an available relationship in the system.
    responses:
      200:
        description:
          Returns a list of all relationships user belongs to after change.
        schema:
          id: user_relationships
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                relationship name, always a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the relationship.
      400:
        description: if the request incudes an unknown relationship.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id

    """
    user = current_user()
    if user.id != user_id:
        current_user().check_role(permission='edit', other_id=user_id)
        user = get_user(user_id)

    if not request.json or 'relationships' not in request.json:
        abort(400, "Requires relationship list in JSON")
    # First confirm all the data is valid and the user has permission
    known_relationships = [r.name for r in Relationship.query]
    for r in request.json['relationships']:
        if not r['has the relationship'] in known_relationships:
            abort(404, "Unknown relationship '{}' can't be deleted".format(
                r['has the relationship']))
        # require edit on subject user only
        user.check_role('edit', other_id=r['user'])

    # Delete any requested that exist
    for r in request.json['relationships']:
        rel_id = Relationship.query.with_entities(
            Relationship.id).filter_by(name=r['has the relationship']).first()
        kwargs = {'user_id': r['user'],
                  'relationship_id': rel_id[0],
                  'other_user_id': r['with']}
        existing = UserRelationship.query.filter_by(**kwargs).first()
        if existing:
            db.session.delete(existing)
            auditable_event("deleted {}".format(existing),
                            user_id=current_user().id)
    db.session.commit()

    # Return user's updated relationship list
    return relationships(user.id)


@user_api.route('/user/<int:user_id>/relationships', methods=('PUT',))
@oauth.require_oauth()
def set_relationships(user_id):
    """Set relationships for user, returns JSON defining user relationships

    Used to set relationship assignments for a user.

    Returns a list of all relationships user belongs to after change.
    ---
    tags:
      - User
    operationId: setrelationships
    produces:
      - application/json
    parameters:
      - name: user_id
        in: path
        description: TrueNTH user ID
        required: true
        type: integer
        format: int64
      - in: body
        name: body
        schema:
          id: relationships
          required:
            - name
          properties:
            name:
              type: string
              description:
                The string defining the name of each relationship the user should
                belong to.  Must exist as an available relationship in the system.
    responses:
      200:
        description:
          Returns a list of all relationships user belongs to after change.
        schema:
          id: user_relationships
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                relationship name, always a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the relationship.
      400:
        description: if the request incudes an unknown relationship.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id

    """
    user = current_user()
    if user.id != user_id:
        current_user().check_role(permission='edit', other_id=user_id)
        user = get_user(user_id)

    if not request.json or 'relationships' not in request.json:
        abort(400, "Requires relationship list in JSON")
    # First confirm all the data is valid and the user has permission
    system_relationships = [r.name for r in Relationship.query]
    for r in request.json['relationships']:
        if not r['has the relationship'] in system_relationships:
            abort(404, "Unknown relationship '{}' can't be added".format(
                r['has the relationship']))
        # require edit on subject user only
        user.check_role('edit', other_id=r['user'])

    # Add any requested that don't exist
    audit_data = []  # preserve till post commit
    for r in request.json['relationships']:
        rel_id = Relationship.query.with_entities(
            Relationship.id).filter_by(name=r['has the relationship']).first()
        kwargs = {'user_id': r['user'],
                  'relationship_id': rel_id[0],
                  'other_user_id': r['with']}
        existing = UserRelationship.query.filter_by(**kwargs).first()
        if not existing:
            user_relationship = UserRelationship(**kwargs)
            db.session.add(user_relationship)
            audit_data.append(user_relationship)
    db.session.commit()
    for ad in audit_data:
        auditable_event("added {}".format(ad),
                        user_id=current_user().id)
    # Return user's updated relationship list
    return relationships(user.id)


@user_api.route('/roles')
@oauth.require_oauth()
def system_roles():
    """Returns simple JSON defining all system roles

    Returns a list of all known roles.  Users belong to one or more
    roles used to control authorization.
    ---
    tags:
      - User
    operationId: system_roles
    produces:
      - application/json
    responses:
      200:
        description:
          Returns a list of all known roles.  Users belong to one or more
          roles used to control authorization.
        schema:
          id: roles
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                Role name, always a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the role.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view roles

    """
    results = [{'name': r.name, 'description': r.description}
            for r in Role.query.all()]
    return jsonify(roles=results)


@user_api.route('/user/<int:user_id>/roles')
@oauth.require_oauth()
def roles(user_id):
    """Returns simple JSON defining user roles

    Returns a list of all known roles.  Users belong to one or more
    roles used to control authorization.  Returns the list of roles that user
    belongs to.
    ---
    tags:
      - User
    operationId: getRoles
    parameters:
      - name: user_id
        in: path
        description: TrueNTH user ID
        required: true
        type: integer
        format: int64
    produces:
      - application/json
    responses:
      200:
        description:
          Returns a list of all known roles.  Users belong to one or more
          roles used to control authorization.  Returns the list of roles that
          user belongs to.
        schema:
          id: roles
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                Role name, always a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the role.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id

    """
    user = current_user()
    if user.id != user_id:
        current_user().check_role(permission='view', other_id=user_id)
        user = get_user(user_id)
    results = [{'name': r.name, 'description': r.description}
            for r in user.roles]
    return jsonify(roles=results)


@user_api.route('/user/<int:user_id>/roles', methods=('DELETE',))
@oauth.require_oauth()
@roles_required(ROLE.ADMIN)
def delete_roles(user_id):
    """Delete roles for user, returns simple JSON defining user roles

    Used to delete role assignments for a user.  Include any roles
    the user should no longer be a member of.  Duplicates will be ignored.

    Only the 'name' field of the roles is referenced.  Must match
    current roles in the system.

    Returns a list of all roles user belongs to after change.
    ---
    tags:
      - User
    operationId: delete_roles
    produces:
      - application/json
    parameters:
      - name: user_id
        in: path
        description: TrueNTH user ID
        required: true
        type: integer
        format: int64
      - in: body
        name: body
        schema:
          id: roles
          required:
            - name
          properties:
            name:
              type: string
              description:
                The string defining the name of each role the user should
                no longer belong to.  Must exist as an available role in the
                system.
    responses:
      200:
        description:
          Returns a list of all roles user belongs to after change.
        schema:
          id: user_roles
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                Role name, always a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the role.
      400:
        description: if the request incudes an unknown role.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id

    """
    user = current_user()
    if user.id != user_id:
        current_user().check_role(permission='edit', other_id=user_id)
        user = get_user(user_id)

    if not request.json or 'roles' not in request.json:
        abort(400, "Requires role list")
    requested_roles = [r['name'] for r in request.json['roles']]
    matching_roles = Role.query.filter(Role.name.in_(requested_roles)).all()
    if len(matching_roles) != len(requested_roles):
        abort(404, "One or more roles requested not available")
    # Delete any requested already set on user
    for requested_role in matching_roles:
        if requested_role in user.roles:
            u_r = UserRoles.query.filter_by(user_id=user.id,
                                            role_id=requested_role.id).first()
            auditable_event("deleted {}".format(u_r),
                            user_id=current_user().id)
            db.session.delete(u_r)
    db.session.commit()

    # Return user's updated role list
    results = [{'name': r.name, 'description': r.description}
            for r in user.roles]
    return jsonify(roles=results)


@user_api.route('/user/<int:user_id>/roles', methods=('PUT',))
@oauth.require_oauth()
def set_roles(user_id):
    """Set roles for user, returns simple JSON defining user roles

    Used to set role assignments for a user.  Include any roles
    the user should become a member of.  Duplicates will be ignored.  Use
    the DELETE method to remove one or more roles.

    Only the 'name' field of the roles is referenced.  Must match
    current roles in the system.

    Returns a list of all roles user belongs to after change.
    ---
    tags:
      - User
    operationId: setRoles
    produces:
      - application/json
    parameters:
      - name: user_id
        in: path
        description: TrueNTH user ID
        required: true
        type: integer
        format: int64
      - in: body
        name: body
        schema:
          id: roles
          required:
            - name
          properties:
            name:
              type: string
              description:
                The string defining the name of each role the user should
                belong to.  Must exist as an available role in the system.
    responses:
      200:
        description:
          Returns a list of all roles user belongs to after change.
        schema:
          id: user_roles
          required:
            - name
            - description
          properties:
            name:
              type: string
              description:
                Role name, always a lower case string with no white space.
            description:
              type: string
              description: Plain text describing the role.
      400:
        description: if the request incudes an unknown role.
      401:
        description:
          if missing valid OAuth token or if the authorized user lacks
          permission to view requested user_id

    """
    user = current_user()
    if user.id != user_id:
        current_user().check_role(permission='edit', other_id=user_id)
        user = get_user(user_id)

    # Don't allow promotion of service accounts
    if user.has_role(ROLE.SERVICE):
        abort(400, "Promotion of service users not allowed")

    if not request.json or 'roles' not in request.json:
        abort(400, "Requires role list")
    requested_roles = [r['name'] for r in request.json['roles']]
    matching_roles = Role.query.filter(Role.name.in_(requested_roles)).all()
    if len(matching_roles) != len(requested_roles):
        abort(404, "One or more roles requested not available")
    # Add any requested not already set on user
    for requested_role in matching_roles:
        if requested_role not in user.roles:
            user.roles.append(requested_role)
            auditable_event("added {} to user {}".format(
                requested_role, user.id), user_id=current_user().id)

    if user not in db.session:
        db.session.add(user)
    db.session.commit()

    # Return user's updated role list
    results = [{'name': r.name, 'description': r.description}
            for r in user.roles]
    return jsonify(roles=results)
