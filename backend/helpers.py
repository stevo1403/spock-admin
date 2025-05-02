import logging
import traceback

from flask import Flask

import backend.config
from backend.config import ALLOWED_EXTENSIONS
from backend.config import configure_upload
from backend.conn import get_db_uri
from backend.db import run_migrations, load_db

logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_flask_app():
    app = Flask(__name__)

    app.config['JSON_SORT_KEYS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'connect_args': {
            'options': '-csearch_path=spock_schema'
        }
    }
    app.config['SQLALCHEMY_DATABASE_URI'] = get_db_uri()
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    backend.config.APP = app

    db = load_db()

    configure_upload(app)
    run_migrations(app)
    db.init_app(app)

    return app

import traceback

def get_traceback(exception):
    print(''.join(traceback.format_exception(type(exception), exception, exception.__traceback__)))
