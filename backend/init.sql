CREATE DATABASE spock_db;

CREATE USER spock_admin WITH PASSWORD 'spock_pass';

GRANT ALL PRIVILEGES ON DATABASE spock_db TO spock_admin;

CREATE SCHEMA spock_schema;

GRANT USAGE ON SCHEMA spock_schema TO spock_admin;
GRANT CREATE ON SCHEMA spock_schema TO spock_admin;