// Configuration
const API_URL = 'http://localhost:8000';

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

// Gestionnaires d'événements pour le drag & drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

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

// Gestion du drop de fichiers
dropZone.addEventListener('drop', handleDrop);
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = [...dt.files];
    handleFiles(files);
}

// Gestion du bouton d'upload
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));

// Gestion du slider de confiance
confidenceSlider.addEventListener('input', () => {
    const value = confidenceSlider.value / 100;
    confidenceValue.textContent = value.toFixed(2);
});

// Gestion des fichiers sélectionnés
function handleFiles(files) {
    selectedFiles = files.filter(file => file.type.startsWith('image/'));
    analyzeBtn.disabled = selectedFiles.length === 0;
    
    if (selectedFiles.length === 0) {
        alert('Veuillez sélectionner des images valides.');
        return;
    }
}

// Gestion de l'analyse
analyzeBtn.addEventListener('click', async () => {
    try {
        loadingOverlay.style.display = 'flex';
        resultsSection.style.display = 'none';
        resultsGrid.innerHTML = '';

        const confidence = confidenceSlider.value / 100;
        const visualize = visualizeCheckbox.checked;

        if (selectedFiles.length === 1) {
            await processSingleImage(selectedFiles[0], confidence, visualize);
        } else {
            await processBatchImages(selectedFiles, confidence);
        }

        // Nettoyer les ObjectURL précédents
        const oldThumbnails = document.querySelectorAll('.thumbnail img');
        oldThumbnails.forEach(img => {
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        });

        resultsSection.style.display = 'block';
    } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
        alert('Une erreur est survenue lors de l\'analyse. Veuillez réessayer.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

// Traitement d'une seule image
async function processSingleImage(file, confidence, visualize) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confidence', confidence);
    formData.append('visualize', visualize);

    const response = await fetch(`${API_URL}/detect`, {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.detail || 'Erreur lors de l\'analyse');
    }

    displayResult(result, file.name);
}

// Traitement par lots
async function processBatchImages(files, confidence) {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('confidence', confidence);

    const response = await fetch(`${API_URL}/detect-batch`, {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.detail || 'Erreur lors de l\'analyse par lots');
    }

    result.results.forEach(r => {
        displayResult(r, r.filename);
    });
}

// Affichage des résultats
function displayResult(result, filename) {
    const card = document.createElement('div');
    card.className = 'result-card';

    // En-tête de la carte
    const header = document.createElement('h3');
    header.textContent = filename;
    card.appendChild(header);

    // Informations de détection
    const info = document.createElement('div');
    info.className = 'detection-info';

    if (result.success) {
        // Création d'un conteneur pour les images
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        // Affichage de la miniature de l'image originale
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'thumbnail';
        const thumbnail = document.createElement('img');
        
        // Créer un ObjectURL pour l'image originale
        const file = selectedFiles.find(f => f.name === filename);
        if (file) {
            thumbnail.src = URL.createObjectURL(file);
            thumbnail.alt = 'Image originale';
            thumbnailContainer.appendChild(thumbnail);
            imageContainer.appendChild(thumbnailContainer);
        }

        // Affichage de la visualisation si disponible
        if (result.visualization_url) {
            const visContainer = document.createElement('div');
            visContainer.className = 'visualization';
            const visImg = document.createElement('img');
            visImg.src = `${API_URL}${result.visualization_url}`;
            visImg.alt = 'Visualisation des détections';
            visContainer.appendChild(visImg);
            imageContainer.appendChild(visContainer);
        }

        card.appendChild(imageContainer);

        // Statistiques
        const stats = document.createElement('div');
        stats.innerHTML = `
            <p><span class="label">Temps de traitement:</span> ${result.processing_time.toFixed(2)}s</p>
            <p><span class="label">Tableaux détectés:</span> ${result.detections?.length || 0}</p>
        `;
        info.appendChild(stats);

        // Détails des détections
        if (result.detections && result.detections.length > 0) {
            const detections = document.createElement('div');
            result.detections.forEach((det, i) => {
                detections.innerHTML += `
                    <p><strong>Table ${i + 1}:</strong> Confiance ${(det.confidence * 100).toFixed(1)}%</p>
                `;
            });
            info.appendChild(detections);
        }
    } else {
        info.innerHTML = `<p class="error">Erreur: ${result.error || 'Échec de l\'analyse'}</p>`;
    }

    card.appendChild(info);
    resultsGrid.appendChild(card);
}
