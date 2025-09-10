/**
 * Main application logic
 */

class ScreenplayAnalyzer {
    constructor() {
        this.pdfExtractor = new PDFExtractor();
        this.sceneAnalyzer = new SceneAnalyzer();
        this.exportUtils = new ExportUtils();
        this.currentAnalysis = null;
        
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
        try {
            // Show processing section
            this.elements.processingSection.style.display = 'block';
            this.elements.resultsSection.style.display = 'none';

            // Set up progress callback
            this.pdfExtractor.setProgressCallback((percentage, message) => {
                this.updateProgress(percentage, message);
            });

            // Extract text from PDF
            this.updateProgress(0, 'Starting extraction...');
            const extractedData = await this.pdfExtractor.extractTextFromPDF(file);

            // Analyze scenes
            this.updateProgress(95, 'Analyzing scenes...');
            this.currentAnalysis = await this.sceneAnalyzer.analyzeText(extractedData);

            // Display results
            this.updateProgress(100, 'Complete!');
            setTimeout(() => {
                this.displayResults();
            }, 500);

        } catch (error) {
            console.error('Processing error:', error);
            this.showError(`Error processing screenplay: ${error.message}`);
        }
    }

    /**
     * Update progress bar and status
     */
    updateProgress(percentage, message) {
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.processingStatus.textContent = message;
    }

    /**
     * Display analysis results
     */
    displayResults() {
        if (!this.currentAnalysis) return;

        this.elements.processingSection.style.display = 'none';
        this.elements.resultsSection.style.display = 'block';

        // Display scenes by default
        this.displayScenes();
        this.displayCharacters();
        this.displayLocations();
    }

    /**
     * Display scenes list
     */
    displayScenes() {
        const { scenes, summary } = this.currentAnalysis;
        
        let html = `
            <div class="summary-stats">
                <h3>Summary</h3>
                <p><strong>Total Scenes:</strong> ${summary.totalScenes}</p>
                <p><strong>Estimated Length:</strong> ${summary.estimatedPages} pages (${summary.totalLength}/8 page units)</p>
                <p><strong>Average Scene Length:</strong> ${summary.averageSceneLength}/8 pages</p>
                <p><strong>Characters:</strong> ${summary.characterCount}</p>
                <p><strong>Locations:</strong> ${summary.locationCount}</p>
            </div>
            <div class="scenes-grid">
        `;

        for (const scene of scenes) {
            html += `
                <div class="scene-item">
                    <div class="scene-header">
                        <span class="scene-number">Scene ${scene.number || 'Unknown'}</span>
                        <span class="scene-location">${scene.location || 'Unknown Location'}</span>
                        <span class="scene-time">${scene.timeOfDay || 'Unknown Time'}</span>
                    </div>
                    <div class="scene-content">
                        <p><strong>Slugline:</strong> ${scene.slugline || 'No slugline'}</p>
                        <p><strong>Characters:</strong> ${scene.characters.join(', ') || 'None identified'}</p>
                        <p><strong>Length:</strong> ${scene.estimatedLength}/8 pages</p>
                        ${scene.pageNumber ? `<p><strong>Page:</strong> ${scene.pageNumber}</p>` : ''}
                        <details>
                            <summary>Content Preview</summary>
                            <div class="scene-text">${this.truncateText(scene.content, 300)}</div>
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
                    <span class="character-name">${character.name}</span>
                    <span class="character-count">${character.totalAppearances} scenes</span>
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
                    <span class="location-name">${location.name}</span>
                    <span class="location-count">${location.totalUses} scenes</span>
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