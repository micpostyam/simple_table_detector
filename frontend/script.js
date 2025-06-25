// Configuration API
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:8000';

// Elements du DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const confidenceSlider = document.getElementById('confidenceSlider');
const confidenceValue = document.getElementById('confidenceValue');
const visualizeCheckbox = document.getElementById('visualizeCheckbox');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const loadingOverlay = document.getElementById('loadingOverlay');

// Variables globales
let selectedFiles = [];

/**
 * Initialisation des gestionnaires d'événements
 */
function initializeEventListeners() {
    // Gestionnaires d'événements pour le drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    // Événements de fichiers
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('click', () => fileInput.click());
    uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));

    // Événements de contrôles
    confidenceSlider.addEventListener('input', updateConfidenceValue);
    analyzeBtn.addEventListener('click', handleAnalysis);
}

/**
 * Empêche les comportements par défaut pour le drag & drop
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Gère le drop de fichiers
 */
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = [...dt.files];
    handleFiles(files);
}

/**
 * Met à jour la valeur affichée du slider de confiance
 */
function updateConfidenceValue() {
    const value = confidenceSlider.value / 100;
    confidenceValue.textContent = value.toFixed(2);
}

/**
 * Gère les fichiers sélectionnés
 */
function handleFiles(files) {
    // Filtrer les fichiers valides
    const imageFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isValidSize = file.size < 50 * 1024 * 1024; // 50MB max
        return isImage && isValidSize;
    });
    
    if (imageFiles.length === 0) {
        showError('Veuillez sélectionner des images valides (formats supportés: JPG, PNG, GIF, WebP, taille max: 50MB).');
        return;
    }

    // Ajouter les nouveaux fichiers sans doublons
    const existingNames = selectedFiles.map(f => f.name);
    const newFiles = imageFiles.filter(f => !existingNames.includes(f.name));
    
    if (newFiles.length === 0) {
        showError('Ces fichiers sont déjà sélectionnés.');
        return;
    }

    selectedFiles = [...selectedFiles, ...newFiles];
    analyzeBtn.disabled = selectedFiles.length === 0;
    
    updateFileDisplay();
    
    // Réinitialiser l'input file
    fileInput.value = '';
}

/**
 * Met à jour l'affichage des fichiers sélectionnés
 */
function updateFileDisplay() {
    const selectedFilesElement = document.getElementById('selectedFiles');
    const selectedFilesGrid = document.getElementById('selectedFilesGrid');
    const fileCount = document.getElementById('fileCount');

    if (selectedFiles.length === 0) {
        selectedFilesElement.style.display = 'none';
        return;
    }

    selectedFilesElement.style.display = 'block';
    selectedFilesGrid.innerHTML = '';
    fileCount.textContent = selectedFiles.length;

    selectedFiles.forEach((file, index) => {
        const fileItem = createFilePreview(file, index);
        selectedFilesGrid.appendChild(fileItem);
    });
}

/**
 * Crée un élément de prévisualisation de fichier
 */
function createFilePreview(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'selected-file-item';

    // Image de prévisualisation
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
        // Nettoyer l'URL après un délai pour éviter les problèmes d'affichage
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    };
    img.onerror = () => {
        img.src = createFallbackImage();
        URL.revokeObjectURL(objectUrl);
    };

    // Nom du fichier
    const filename = document.createElement('div');
    filename.className = 'filename';
    filename.title = file.name;
    filename.textContent = truncateFilename(file.name, 20);

    // Bouton de suppression
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Supprimer';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeFile(index);
    };

    fileItem.appendChild(img);
    fileItem.appendChild(filename);
    fileItem.appendChild(removeBtn);

    return fileItem;
}

/**
 * Supprime un fichier de la sélection
 */
function removeFile(index) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
    updateFileDisplay();
    analyzeBtn.disabled = selectedFiles.length === 0;
    
    // Cacher les résultats si plus de fichiers
    if (selectedFiles.length === 0) {
        resultsSection.style.display = 'none';
    }
}

/**
 * Tronque un nom de fichier s'il est trop long
 */
function truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
    
    return `${truncatedName}...${extension}`;
}

/**
 * Crée une image de fallback en cas d'erreur
 */
function createFallbackImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjY2NjIi8+Cjwvc3ZnPg==';
}

/**
 * Gère le processus d'analyse
 */
async function handleAnalysis() {
    if (selectedFiles.length === 0) return;

    try {
        showLoading(true);
        clearResults();

        const confidence = confidenceSlider.value / 100;
        const visualize = visualizeCheckbox.checked;

        if (selectedFiles.length === 1) {
            await processSingleImage(selectedFiles[0], confidence, visualize);
        } else {
            await processBatchImages(selectedFiles, confidence);
        }

        showResults();
    } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
        showError('Une erreur est survenue lors de l\'analyse. Veuillez vérifier votre connexion et réessayer.');
    } finally {
        showLoading(false);
    }
}

/**
 * Traite une seule image
 */
async function processSingleImage(file, confidence, visualize) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confidence', confidence);
    formData.append('visualize', visualize);

    const response = await fetchWithTimeout(`${API_URL}/detect`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    displayResult(result, file.name, file);
}

/**
 * Traite plusieurs images en lot
 */
async function processBatchImages(files, confidence) {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('confidence', confidence);

    const response = await fetchWithTimeout(`${API_URL}/detect-batch`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.results && Array.isArray(result.results)) {
        result.results.forEach(r => {
            const file = files.find(f => f.name === r.filename);
            displayResult(r, r.filename, file);
        });
    } else {
        throw new Error('Format de réponse inattendu pour le traitement par lots');
    }
}

/**
 * Fetch avec timeout
 */
async function fetchWithTimeout(url, options, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('La requête a expiré. Veuillez réessayer.');
        }
        throw error;
    }
}

/**
 * Affiche un résultat d'analyse
 */
function displayResult(result, filename, file) {
    const card = document.createElement('div');
    card.className = 'result-card';

    // En-tête
    const header = document.createElement('h3');
    header.textContent = filename;
    card.appendChild(header);

    // Contenu
    const info = document.createElement('div');
    info.className = 'detection-info';

    if (result.success) {
        // Conteneur d'images
        const imageContainer = createImageContainer(result, file);
        if (imageContainer) {
            card.appendChild(imageContainer);
        }

        // Statistiques
        const stats = createStatsSection(result);
        info.appendChild(stats);

        // Détections
        const detections = createDetectionsSection(result);
        info.appendChild(detections);
    } else {
        info.innerHTML = `<div class="error">❌ Erreur: ${result.error || 'Échec de l\'analyse'}</div>`;
    }

    card.appendChild(info);
    resultsGrid.appendChild(card);
}

/**
 * Crée le conteneur d'images pour un résultat
 */
function createImageContainer(result, file) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    // Image originale
    if (file) {
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'thumbnail';
        
        const thumbnailLabel = document.createElement('h4');
        thumbnailLabel.textContent = 'Image originale';
        thumbnailContainer.appendChild(thumbnailLabel);
        
        const thumbnail = document.createElement('img');
        const objectUrl = URL.createObjectURL(file);
        thumbnail.src = objectUrl;
        thumbnail.alt = 'Image originale';
        thumbnail.onload = () => {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        };
        thumbnail.onerror = () => {
            thumbnail.src = createFallbackImage();
            URL.revokeObjectURL(objectUrl);
        };
        
        thumbnailContainer.appendChild(thumbnail);
        imageContainer.appendChild(thumbnailContainer);
    }

    // Visualisation des détections
    if (result.visualization_url) {
        const visContainer = document.createElement('div');
        visContainer.className = 'visualization';
        
        const visLabel = document.createElement('h4');
        visLabel.textContent = 'Détections';
        visContainer.appendChild(visLabel);
        
        const visImg = document.createElement('img');
        visImg.src = `${API_URL}${result.visualization_url}`;
        visImg.alt = 'Visualisation des détections';
        visImg.onerror = () => {
            visContainer.innerHTML = '<p class="error">Impossible de charger la visualisation</p>';
        };
        
        visContainer.appendChild(visImg);
        imageContainer.appendChild(visContainer);
    }

    return imageContainer.children.length > 0 ? imageContainer : null;
}

/**
 * Crée la section des statistiques
 */
function createStatsSection(result) {
    const stats = document.createElement('div');
    stats.innerHTML = `
        <p><span class="label">⏱️ Temps de traitement:</span> ${result.processing_time?.toFixed(2) || 'N/A'}s</p>
        <p><span class="label">📊 Tableaux détectés:</span> ${result.detections?.length || 0}</p>
    `;
    return stats;
}

/**
 * Crée la section des détections
 */
function createDetectionsSection(result) {
    const detectionsDiv = document.createElement('div');
    
    if (result.detections && result.detections.length > 0) {
        detectionsDiv.innerHTML = '<h4>Détails des détections:</h4>';
        
        result.detections.forEach((det, i) => {
            const detDiv = document.createElement('div');
            detDiv.style.marginBottom = '8px';
            detDiv.innerHTML = `
                <strong>📋 Table ${i + 1}:</strong> 
                <span class="success">${(det.confidence * 100).toFixed(1)}% de confiance</span>
            `;
            
            // Ajouter les coordonnées si disponibles
            if (det.bbox) {
                const coords = document.createElement('div');
                coords.style.fontSize = '0.9em';
                coords.style.color = '#666';
                coords.style.marginLeft = '20px';
                coords.textContent = `Position: (${det.bbox.x1?.toFixed(0) || 'N/A'}, ${det.bbox.y1?.toFixed(0) || 'N/A'}) - (${det.bbox.x2?.toFixed(0) || 'N/A'}, ${det.bbox.y2?.toFixed(0) || 'N/A'})`;
                detDiv.appendChild(coords);
            }
            
            detectionsDiv.appendChild(detDiv);
        });
    } else {
        const noDetection = document.createElement('p');
        noDetection.innerHTML = '<span class="error">❌ Aucun tableau détecté</span>';
        detectionsDiv.appendChild(noDetection);
    }
    
    return detectionsDiv;
}

/**
 * Efface les résultats précédents
 */
function clearResults() {
    resultsSection.style.display = 'none';
    resultsGrid.innerHTML = '';
    
    // Nettoyer les ObjectURL précédents pour éviter les fuites mémoire
    const oldImages = document.querySelectorAll('.result-card img');
    oldImages.forEach(img => {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    });
}

/**
 * Affiche la section des résultats
 */
function showResults() {
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * Affiche/cache l'overlay de chargement
 */
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    
    // Désactiver les interactions pendant le chargement
    if (show) {
        document.body.style.pointerEvents = 'none';
        loadingOverlay.style.pointerEvents = 'auto';
    } else {
        document.body.style.pointerEvents = 'auto';
    }
}

/**
 * Affiche un message d'erreur temporaire
 */
function showError(message) {
    // Vérifier si une erreur est déjà affichée
    const existingError = document.querySelector('.error-notification');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error error-notification';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(errorDiv);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
                if (style.parentNode) {
                    style.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Permettre de fermer manuellement
    errorDiv.addEventListener('click', () => {
        errorDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 300);
    });
}

/**
 * Affiche un message de succès temporaire
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        background-color: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
        padding: 15px;
        border-radius: 8px;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.remove();
                }
            }, 300);
        }
    }, 3000);
}

/**
 * Valide la configuration de l'API
 */
function validateApiConfiguration() {
    if (!API_URL) {
        showError('Configuration API manquante. Veuillez configurer l\'URL de l\'API.');
        return false;
    }
    
    // Test de connectivité simple (optionnel)
    fetch(API_URL + '/health', { method: 'GET' })
        .then(response => {
            if (response.ok) {
                console.log('✅ API accessible');
            }
        })
        .catch(error => {
            console.warn('⚠️ API potentiellement inaccessible:', error.message);
        });
    
    return true;
}

/**
 * Nettoie les ressources avant la fermeture de la page
 */
function cleanup() {
    // Nettoyer tous les ObjectURL pour éviter les fuites mémoire
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    });
}

/**
 * Initialisation de l'application
 */
function initializeApp() {
    // Vérifier la configuration
    if (!validateApiConfiguration()) {
        return;
    }
    
    // Initialiser les gestionnaires d'événements
    initializeEventListeners();
    
    // Initialiser la valeur du slider
    updateConfidenceValue();
    
    // Gestionnaire de nettoyage avant fermeture
    window.addEventListener('beforeunload', cleanup);
    
    // Gestionnaire pour les erreurs globales
    window.addEventListener('error', (event) => {
        console.error('Erreur globale:', event.error);
        showError('Une erreur inattendue s\'est produite.');
    });
    
    // Gestionnaire pour les erreurs de promesses non gérées
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promesse rejetée non gérée:', event.reason);
        showError('Une erreur de réseau s\'est produite.');
        event.preventDefault();
    });
    
    console.log('🚀 Application initialisée avec succès');
}

// Initialisation quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}