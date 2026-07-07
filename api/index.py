import os
import sys
from pathlib import Path

# Add project root directory to Python's sys.path
# This ensures that imports from 'backend' and 'config' resolve correctly on Vercel
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import the pre-instantiated Flask app instance from run.py
from run import app
