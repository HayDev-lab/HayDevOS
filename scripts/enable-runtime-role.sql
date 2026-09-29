\set ON_ERROR_STOP on
\prompt 'New password for haydev_runtime: ' runtime_password

ALTER ROLE haydev_runtime LOGIN PASSWORD :'runtime_password';

\unset runtime_password
\echo 'haydev_runtime login enabled; store the runtime URL only in the server secret manager.'
