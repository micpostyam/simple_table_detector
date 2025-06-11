#!/usr/bin/env python3
"""
Script de lancement de l'API Table Detector
"""

import uvicorn
import argparse


def main():
    parser = argparse.ArgumentParser(description="Lancer l'API Table Detector")
    parser.add_argument('--host', default='0.0.0.0',
                       help='Adresse d\'écoute (défaut: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000,
                       help='Port d\'écoute (défaut: 8000)')
    parser.add_argument('--reload', action='store_true',
                       help='Activer le rechargement automatique pour le développement')
    
    args = parser.parse_args()
    
    # Configuration de uvicorn
    uvicorn.run(
        "src.api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()
