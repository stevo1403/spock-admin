#!/bin/sh
# Start postgres if not automatically started
APP_DIR=/home/user/spock-admin
if ! (pgrep -x "bin/postgres" > /dev/null || ss -tunlp | grep -q ":5432")
then
  echo "postgres is not running. will execute now";
  sh ${APP_DIR}/scripts/remove-postgres-postmaster.sh
  sh mkdir -p /tmp/postgres
  sh rm /tmp/postgres/.s.PGSQL.5432.lock
  /nix/store/24jf1gmp7q5aykg7d19rw5s1g6hrxk2b-postgresql-17.4/bin/postgres -k /tmp/postgres -D ${APP_DIR}/.idx/.data/postgres
  exit 0;
else
    echo "postgres is running already";
    exit 0; 
fi

