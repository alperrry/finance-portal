-- Keycloak icin ayri database ve user
SELECT 'CREATE USER keycloak WITH PASSWORD ''keycloak'''
WHERE NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'keycloak'
)\gexec

SELECT 'CREATE DATABASE keycloak OWNER keycloak'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = 'keycloak'
)\gexec

GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
