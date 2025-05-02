#!/bin/sh
# Define the path to the PID file
PID_FILE="/home/user/spock-admin/.idx/.data/postgres/postmaster.pid"
PG_LOCK="/tmp/postgres/.s.PGSQL.5432.lock"

# Check if the postmaster.pid file exists
if [ -f "$PID_FILE" ]; then
    echo "Found stale $PID_FILE, removing..."
    rm "$PID_FILE"
    echo "$PID_FILE removed."
else
    echo "$PID_FILE not found, no action needed."
fi

# Check if the PostgreSQL lock file exists
if [ -f "$PG_LOCK" ]; then
    echo "Found stale $PG_LOCK, removing..."
    rm "$PG_LOCK"
    echo "$PG_LOCK removed."
else
    echo "$PG_LOCK not found, no action needed."
fi

# You can add other startup commands here if needed
echo "Workspace environment ready."
