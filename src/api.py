from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import tempfile
import logging
import shutil
import time
from typing import List, Optional
from PIL import Image
import io

from .detector import TableDetector
from .exceptions import (
    ModelLoadError,
    InvalidImageError,
    UnsupportedFormatError,
    ImageTooLargeError,
    ImageProcessingError
)

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création de l'application FastAPI
app = FastAPI(
    title="Table Detector API",
    description="API pour la détection de tableaux dans des images avec DETR",
    version="1.0.0"
)

# Instance globale du détecteur
detector = TableDetector()

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier les origines exactes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration du dossier statique
from fastapi.staticfiles import StaticFiles
static_dir = Path(__file__).parent.parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.on_event("startup")
async def startup_event():
    """Charge le modèle au démarrage de l'application."""
    try:
        detector.load_model()
        logger.info("Modèle chargé avec succès")
    except ModelLoadError as e:
        logger.error(f"Erreur lors du chargement du modèle : {e}")
        raise


@app.post("/detect", response_class=JSONResponse)
async def detect_tables(
    file: UploadFile = File(...),
    confidence: Optional[float] = None,
    visualize: bool = True
):
    """
    Détecte les tableaux dans une image.
    
    Args:
        file: Fichier image à analyser
        confidence: Seuil de confiance optionnel pour les détections
        visualize: Si True, renvoie aussi une visualisation des détections
    
    Returns:
        JSON avec les résultats de détection et optionnellement l'URL de la visualisation
    """
    visualize = str(visualize).lower() == 'true'  # Conversion explicite de la chaîne en booléen
    try:
        # Lecture de l'image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Mise à jour du seuil de confiance si spécifié
        if confidence is not None:
            detector.confidence_threshold = confidence
        
        # Détection
        result = detector.predict(image)
        
        if not result.success:
            raise HTTPException(
                status_code=500,
                detail=f"Échec de la détection : {result.error_message}"
            )
        
        # Préparation de la réponse
        response_data = {
            "success": result.success,
            "num_detections": result.num_detections,
            "processing_time": result.processing_time,
            "detections": [
                {
                    "confidence": det.confidence,
                    "bbox": det.bbox.to_list(),
                    "label": det.label
                }
                for det in result.detections
            ],
            "image_info": {
                "width": result.image_info.width,
                "height": result.image_info.height,
                "format": result.image_info.format,
                "channels": result.image_info.channels
            }
        }
        
        # Génération de la visualisation si demandée
        if visualize and result.detections:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                # Créer un nom de fichier unique basé sur un timestamp
                vis_filename = f"vis_{int(time.time() * 1000)}.jpg"
                vis_path = Path(tmp.name)
                
                # Générer la visualisation
                detector.visualize_predictions(
                    image_input=image,
                    output_path=str(vis_path),
                    show_confidence=True
                )
                
                # Copier le fichier dans un dossier accessible
                static_dir = Path(__file__).parent.parent / "static" / "visualizations"
                static_dir.mkdir(parents=True, exist_ok=True)
                final_path = static_dir / vis_filename
                shutil.copy2(vis_path, final_path)
                
                # Renvoyer l'URL relative
                response_data["visualization_url"] = f"/static/visualizations/{vis_filename}"
        
        return response_data
        
    except (InvalidImageError, UnsupportedFormatError, ImageTooLargeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur inattendue : {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()


@app.post("/detect-batch", response_class=JSONResponse)
async def detect_tables_batch(
    files: List[UploadFile] = File(...),
    confidence: Optional[float] = None,
    max_batch_size: Optional[int] = None
):
    """
    Détecte les tableaux dans plusieurs images.
    
    Args:
        files: Liste des fichiers images à analyser
        confidence: Seuil de confiance optionnel pour les détections
        max_batch_size: Taille maximale des lots pour le traitement
        
    Returns:
        JSON avec les résultats de détection pour chaque image
    """
    try:
        # Mise à jour du seuil de confiance si spécifié
        if confidence is not None:
            detector.confidence_threshold = confidence
        
        # Lecture des images
        images = []
        for file in files:
            content = await file.read()
            image = Image.open(io.BytesIO(content))
            images.append(image)
        
        # Détection par lots
        batch_result = detector.predict_batch(images, max_batch_size=max_batch_size)
        
        # Préparation de la réponse
        response_data = {
            "total_images": batch_result.total_images,
            "successful_detections": batch_result.successful_detections,
            "failed_detections": batch_result.failed_detections,
            "total_processing_time": batch_result.total_processing_time,
            "results": []
        }
        
        # Ajout des résultats individuels
        for result, file in zip(batch_result.results, files):
            result_data = {
                "filename": file.filename,
                "success": result.success,
                "processing_time": result.processing_time
            }
            
            if result.success:
                result_data["detections"] = [
                    {
                        "confidence": det.confidence,
                        "bbox": det.bbox.to_list(),
                        "label": det.label
                    }
                    for det in result.detections
                ]
            else:
                result_data["error"] = result.error_message
                
            response_data["results"].append(result_data)
        
        return response_data
        
    except Exception as e:
        logger.error(f"Erreur inattendue : {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Fermeture des fichiers
        for file in files:
            await file.close()
