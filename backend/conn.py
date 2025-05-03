import os

from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT'))

SPOCK_FRONTEND = os.getenv('SPOCK_FRONTEND')
SPOCK_BACKEND = os.getenv('SPOCK_BACKEND')

DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?options=-csearch_path=spock_schema"

def get_db_uri() -> str:
    return DATABASE_URI