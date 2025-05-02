import logging

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError 

from backend.conn import get_db_uri

DATABASE_URL = get_db_uri()

# Configure the logger
logging.basicConfig(level=logging.ERROR)  # You can change the level as needed (e.g., DEBUG, INFO, WARNING)

db = None

def _create_engine():
    return create_engine(DATABASE_URL)

def get_session():
    engine = _create_engine()
    try:
        Session = sessionmaker(bind=engine)
    except OperationalError as error:
        logging.error(f"Database connection error: {error}")
        return None
    
    return Session

def run_migrations(app):
    migrate = Migrate(app, db)

    return migrate

def load_db():
    global db

    if db:
        return db
    else:
        db = SQLAlchemy()
        return db
