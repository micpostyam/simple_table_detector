#!/usr/bin/env python3
"""
Serveur de développement pour le frontend
"""

import http.server
import socketserver
from pathlib import Path

# Configuration
PORT = 3000
DIRECTORY = Path(__file__).parent / 'frontend'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

def main():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serveur frontend démarré sur http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServeur arrêté")

if __name__ == "__main__":
    main()
