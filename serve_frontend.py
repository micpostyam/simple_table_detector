#!/usr/bin/env python3
"""
Serveur de développement pour le frontend
"""

import http.server
import socketserver
import os
import re
from pathlib import Path

# Configuration
PORT = int(os.environ.get('PORT', 3000))
DIRECTORY = Path(__file__).parent / 'frontend'
API_URL = os.environ.get('API_URL', 'http://localhost:8000')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_GET(self):
        # Si c'est index.html, injecter la configuration
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()

            # Lire le contenu du fichier index.html
            with open(DIRECTORY / 'index.html', 'r') as f:
                content = f.read()

            # Injecter la configuration avant la fermeture de la balise head
            config_script = f'<script>window.APP_CONFIG = {{API_URL: "{API_URL}"}};</script>'
            content = re.sub('</head>', f'{config_script}</head>', content)

            self.wfile.write(content.encode())
        else:
            super().do_GET()

def main():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serveur frontend démarré sur http://localhost:{PORT}")
        print(f"API configurée sur: {API_URL}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServeur arrêté")

if __name__ == "__main__":
    main()
