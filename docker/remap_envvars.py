#!/usr/bin/env python
# Parses and remaps DB URLs into standard psql environmental variables
# https://www.postgresql.org/docs/9.6/static/libpq-envars.html

from urlparse import urlparse
from os import environ


def get_db_url():
    """
    Attempt to find any possible database configuration URL
    Datica: DATABASE_1_URL
    Heroku: DATABASE_URL
    """
    candidate_db_envvars = (
        value for name, value in environ.items()
        if 'DATABASE' in name and value
    )

    # Return None if no candidates found
    return next(candidate_db_envvars, None)


def main():

    db_uri = get_db_url()
    if not db_uri:
        return

    parsed_db = urlparse(db_uri)

    env_map = {
        'PGPORT': 'port',
        'PGHOST': 'hostname',
        'PGUSER': 'username',
        'PGPASSWORD': 'password',
        'PGDATABASE': 'path',
    }
    defaults = {'PGPORT': '5432'}
    final_envvars = {}
    for envvar_name, parsed_name in env_map.items():
        # Do not override existing values
        if envvar_name in environ:
            continue

        value = getattr(parsed_db, parsed_name) or defaults.get(envvar_name, '')
        final_envvars[envvar_name] = value

    # Remove leading "/" from database name
    pgdatabase = final_envvars.get('PGDATABASE', None)
    if pgdatabase:
        final_envvars['PGDATABASE'] = pgdatabase.split('/')[1]

    # Environmental variables do not persist unless evaluated by parent shell
    for name, value in final_envvars.items():
        print("export {}='{}'".format(name, value))


if __name__ == "__main__":
    main()
