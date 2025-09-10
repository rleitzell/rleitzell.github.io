/**
 * Main application logic
 */

class ScreenplayAnalyzer {
    constructor() {
        this.pdfExtractor = new PDFExtractor();
        this.sceneAnalyzer = new SceneAnalyzer();
        this.exportUtils = new ExportUtils();
        this.currentAnalysis = null;
        
        // Operation management for race condition prevention
        this.currentOperation = null;
        this.operationId = 0;
        
        this.initializeUI();
        this.setupEventListeners();
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            processingSection: document.getElementById('processingSection'),
            progressFill: document.getElementById('progressFill'),
            processingStatus: document.getElementById('processingStatus'),
            resultsSection: document.getElementById('resultsSection'),
            scenesList: document.getElementById('scenesList'),
            charactersList: document.getElementById('charactersList'),
            locationsList: document.getElementById('locationsList')
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // File input change
        this.elements.fileInput.addEventListener('change', (event) => {
            this.handleFileSelect(event.target.files[0]);
        });

        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (event) => {
            event.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Click to upload
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(file) {
        if (!file) return;

        if (file.type !== 'application/pdf') {
            this.showError('Please select a PDF file.');
            return;
        }

        try {
            // Show file info
            this.displayFileInfo(file);

            // Start processing
            await this.processScreenplay(file);

        } catch (error) {
            console.error('File processing error:', error);
            this.showError(`Error processing file: ${error.message}`);
        }
    }

    /**
     * Display file information
     */
    displayFileInfo(file) {
        this.elements.fileName.textContent = file.name;
        this.elements.fileSize.textContent = this.formatFileSize(file.size);
        this.elements.fileInfo.style.display = 'block';
    }

    /**
     * Process screenplay PDF
     */
    async processScreenplay(file) {
        // Cancel any existing operation
        if (this.currentOperation) {
            this.currentOperation.cancelled = true;
        }

        // Create new operation with unique ID
        const operation = {
            id: ++this.operationId,
            cancelled: false,
            file: file
        };
        this.currentOperation = operation;

        try {
            // Check if operation was cancelled before we start
            if (operation.cancelled) return;

            // Show processing section
            this.elements.processingSection.style.display = 'block';
            this.elements.resultsSection.style.display = 'none';

            // Set up progress callback with cancellation check
            this.pdfExtractor.setProgressCallback((percentage, message) => {
                if (!operation.cancelled && this.currentOperation === operation) {
                    this.updateProgress(percentage, message);
                }
            });

            // Extract text from PDF
            this.updateProgress(0, 'Starting extraction...');
            if (operation.cancelled) return;
            
            const extractedData = await this.pdfExtractor.extractTextFromPDF(file);

            // Check if operation was cancelled after PDF extraction
            if (operation.cancelled || this.currentOperation !== operation) return;

            // Analyze scenes
            this.updateProgress(95, 'Analyzing scenes...');
            const analysisResult = await this.sceneAnalyzer.analyzeText(extractedData);

            // Final check before displaying results
            if (operation.cancelled || this.currentOperation !== operation) return;

            // Update current analysis and display results
            this.currentAnalysis = analysisResult;
            this.updateProgress(100, 'Complete!');
            
            // Use a more controlled approach instead of setTimeout
            this.displayResultsWhenReady(operation);

        } catch (error) {
            // Only show error if this operation is still current
            if (!operation.cancelled && this.currentOperation === operation) {
                console.error('Processing error:', error);
                this.showError(`Error processing screenplay: ${error.message}`);
            }
        } finally {
            // Clean up if this is still the current operation
            if (this.currentOperation === operation) {
                this.currentOperation = null;
            }
        }
    }

    /**
     * Display results when ready, with operation validation
     */
    displayResultsWhenReady(operation) {
        // Double-check that this operation is still current
        if (operation.cancelled || this.currentOperation !== operation) {
            return;
        }

        // Small delay to ensure UI is ready, but with validation
        setTimeout(() => {
            if (!operation.cancelled && this.currentOperation === operation) {
                this.displayResults();
                // Clear operation after successful display
                if (this.currentOperation === operation) {
                    this.currentOperation = null;
                }
            }
        }, 100); // Reduced from 500ms for better responsiveness
    }

    /**
     * Update progress bar and status
     */
    updateProgress(percentage, message) {
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.processingStatus.textContent = message;
    }

    /**
     * Display analysis results with comprehensive validation
     */
    displayResults() {
        if (!this.currentAnalysis) {
            console.warn('No analysis data available to display');
            this.showError('No analysis data available to display');
            return;
        }

        // Validate essential analysis data structure
        if (!this.currentAnalysis.scenes || !Array.isArray(this.currentAnalysis.scenes)) {
            console.error('Invalid analysis data: scenes array missing or invalid');
            this.showError('Invalid analysis data received');
            return;
        }

        if (!this.currentAnalysis.characters || !Array.isArray(this.currentAnalysis.characters)) {
            console.error('Invalid analysis data: characters array missing or invalid');
            this.showError('Invalid analysis data received');
            return;
        }

        if (!this.currentAnalysis.locations || !Array.isArray(this.currentAnalysis.locations)) {
            console.error('Invalid analysis data: locations array missing or invalid');
            this.showError('Invalid analysis data received');
            return;
        }

        this.elements.processingSection.style.display = 'none';
        this.elements.resultsSection.style.display = 'block';

        // Display scenes by default
        this.displayScenes();
        this.displayCharacters();
        this.displayLocations();
        
        // Enable Phase 2 drag/drop if in edit mode
        if (window.phase2Manager && window.phase2Manager.isEditMode) {
            setTimeout(() => {
                window.phase2Manager.enableDragDropInEditMode();
            }, 100);
        }
    }

    /**
     * Display scenes list with validation
     */
    displayScenes() {
        if (!this.currentAnalysis?.scenes || !this.currentAnalysis?.summary) {
            console.error('Invalid analysis data for scene display');
            return;
        }

        const { scenes, summary } = this.currentAnalysis;
        
        // Validate scenes array
        if (!Array.isArray(scenes)) {
            console.error('Scenes data is not an array');
            return;
        }

        let html = `
            <div class="summary-stats">
                <h3>Summary</h3>
                <p><strong>Total Scenes:</strong> ${escapeHtml(summary.totalScenes || 0)}</p>
                <p><strong>Estimated Length:</strong> ${escapeHtml(summary.estimatedPages || 0)} pages (${escapeHtml(summary.totalLength || 0)}/8 page units)</p>
                <p><strong>Average Scene Length:</strong> ${escapeHtml(summary.averageSceneLength || 0)}/8 pages</p>
                <p><strong>Characters:</strong> ${escapeHtml(summary.characterCount || 0)}</p>
                <p><strong>Locations:</strong> ${escapeHtml(summary.locationCount || 0)}</p>
            </div>
            <div class="scenes-grid">
        `;

        for (const scene of scenes) {
            // Validate each scene object
            if (!scene || typeof scene !== 'object') {
                console.warn('Invalid scene object found, skipping');
                continue;
            }

            html += `
                <div class="scene-item">
                    <div class="scene-header">
                        <span class="scene-number">Scene ${escapeHtml(scene.number || 'Unknown')}</span>
                        <span class="scene-location">${escapeHtml(scene.location || 'Unknown Location')}</span>
                        <span class="scene-time">${escapeHtml(scene.timeOfDay || 'Unknown Time')}</span>
                    </div>
                    <div class="scene-content">
                        <p><strong>Slugline:</strong> ${escapeHtml(scene.slugline || 'No slugline')}</p>
                        <p><strong>Characters:</strong> ${safeJoin(scene.characters) || 'None identified'}</p>
                        <p><strong>Length:</strong> ${escapeHtml(scene.estimatedLength || 0)}/8 pages</p>
                        ${scene.pageNumber ? `<p><strong>Page:</strong> ${escapeHtml(scene.pageNumber)}</p>` : ''}
                        <details>
                            <summary>Content Preview</summary>
                            <div class="scene-text">${escapeHtml(this.truncateText(scene.content || '', 300))}</div>
                        </details>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        this.elements.scenesList.innerHTML = html;
    }

    /**
     * Display characters list
     */
    displayCharacters() {
        const { characters } = this.currentAnalysis;
        
        // Sort by total appearances
        const sortedCharacters = characters.sort((a, b) => b.totalAppearances - a.totalAppearances);

        let html = '<h3>Characters</h3>';
        
        for (const character of sortedCharacters) {
            html += `
                <div class="character-item">
                    <span class="character-name">${escapeHtml(character.name)}</span>
                    <span class="character-count">${escapeHtml(character.totalAppearances)} scenes</span>
                </div>
            `;
        }

        this.elements.charactersList.innerHTML = html;
    }

    /**
     * Display locations list
     */
    displayLocations() {
        const { locations } = this.currentAnalysis;
        
        // Sort by total uses
        const sortedLocations = locations.sort((a, b) => b.totalUses - a.totalUses);

        let html = '<h3>Locations</h3>';
        
        for (const location of sortedLocations) {
            html += `
                <div class="location-item">
                    <span class="location-name">${escapeHtml(location.name)}</span>
                    <span class="location-count">${escapeHtml(location.totalUses)} scenes</span>
                </div>
            `;
        }

        this.elements.locationsList.innerHTML = html;
    }

    /**
     * Show error message
     */
    showError(message) {
        // Hide processing section
        this.elements.processingSection.style.display = 'none';
        
        // Show error in processing status area
        this.elements.processingSection.style.display = 'block';
        this.elements.progressFill.style.width = '0%';
        this.elements.processingStatus.innerHTML = `<span style="color: red;">Error: ${message}</span>`;
        
        setTimeout(() => {
            this.elements.processingSection.style.display = 'none';
        }, 5000);
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Truncate text for preview
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }
}

/**
 * Tab switching functionality
 */
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.style.display = 'none');
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to clicked button
    const clickedButton = event ? event.target : document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

/**
 * Export functions
 */
function exportToCSV() {
    if (!window.app || !window.app.currentAnalysis) {
        alert('No analysis data to export');
        return;
    }

    try {
        window.app.exportUtils.downloadExportPackage(
            window.app.currentAnalysis, 
            ['csv']
        );
    } catch (error) {
        console.error('Export error:', error);
        alert(`Export failed: ${error.message}`);
    }
}

function exportToJSON() {
    if (!window.app || !window.app.currentAnalysis) {
        alert('No analysis data to export');
        return;
    }

    try {
        const analysisData = window.app.sceneAnalyzer.exportData('json');
        const filename = window.app.exportUtils.generateFilename('screenplay_analysis', 'json');
        const jsonData = window.app.exportUtils.exportAnalysisJSON(analysisData);
        
        window.app.exportUtils.downloadFile(jsonData, filename, 'application/json');
    } catch (error) {
        console.error('Export error:', error);
        alert(`Export failed: ${error.message}`);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ScreenplayAnalyzer();
    // Initialize Phase 2 features
    window.phase2Manager = new Phase2Manager(window.app);
});