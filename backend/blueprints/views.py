from flask import Blueprint, render_template

views_bp = Blueprint("views", __name__)

@views_bp.route("/")
def index():
    """Serve the single-page application landing page."""
    return render_template("index.html")
