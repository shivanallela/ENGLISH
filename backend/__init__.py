import os
import logging
from flask import Flask
from flask_cors import CORS
from config import Config
from backend.database import db
from backend.blueprints.api import api_bp
from backend.blueprints.views import views_bp

def create_app():
    """
    Application Factory Pattern for modular Flask app setup.
    Configures folders, CORS, databases, and registers routing blueprints.
    """
    # Resolve absolute paths to prevent folder resolution bugs in serverless environments
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(backend_dir)

    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, "frontend", "templates"),
        static_folder=os.path.join(base_dir, "frontend", "static")
    )
    
    # Load configuration settings
    app.config.from_object(Config)
    
    # Configure CORS for API integration (production-ready)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Configure logger diagnostics
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
    )
    
    # Bind SQLAlchemy database
    db.init_app(app)
    
    # Register views and API routes blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(api_bp)
    
    # Auto-initialize SQLite database schema tables on startup
    with app.app_context():
        db.create_all()
        app.logger.info("SQLite Database initialized and schema tables verified.")
        
    return app
