#!/bin/sh

# Add the local bin directory to the PATH
export PATH="$HOME/.local/bin:$PATH"

# Install backend dependencies using Poetry
#poetry install --no-root
cd backend
python3 -m pip install -r requirements.txt
# Activate the virtual environment

# Ensure the local bin directory is in .bashrc (for future sessions)
#if ! grep -q "$PATH" /home/user/.bashrc; then
#  echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/user/.bashrc
#fi

# Initialize the database schema
echo "Initializing database schema..."
#cd backend
/usr/bin/psql -d spock-admin -f init.sql

# Start the backend server using Poetry

poetry run flask --app app run --debug &

# Start the frontend server using npm
cd ../frontend && npm run dev &

echo "Database schema initialized."
