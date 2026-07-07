import os
from backend import create_app

# Instantiate modular application factory
app = create_app()

if __name__ == "__main__":
    # Run the server on port 5000
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    
    app.run(host=host, port=port, debug=debug)
