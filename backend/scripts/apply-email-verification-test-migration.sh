#!/bin/sh
# This helper is intentionally limited to the isolated OTP test database.
set -eu

readonly target_db='react_db_otp_test'
readonly migration_file='/tmp/20261022_add_email_verification.sql'

if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
  echo 'MySQL root password is not available in the container.' >&2
  exit 1
fi

actual_db="$(printf '%s\n' 'SELECT DATABASE();' | MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql -uroot --batch --skip-column-names --database="${target_db}")"
if [ "${actual_db}" != "${target_db}" ]; then
  echo 'Unexpected database target; migration was not run.' >&2
  exit 1
fi

MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql -uroot --database="${target_db}" < "${migration_file}"

printf '%s\n' "SELECT DATABASE() AS database_name; SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'email_verification_%' ORDER BY table_name;" \
  | MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql -uroot --batch --skip-column-names --database="${target_db}"
