/**
 * Phase 2 Manager - Enhanced GUI and Mapping Workflow
 * Handles advanced scene editing, drag/drop grouping, and mapping functionality
 */

class Phase2Manager {
    constructor(screenplayAnalyzer) {
        this.app = screenplayAnalyzer;
        this.isEditMode = false;
        this.selectedScenes = new Set();
        this.characterMappings = new Map();
        this.locationMappings = new Map();
        this.draggedElement = null;
        this.duplicateScenes = [];
        
        this.initializePhase2Features();
    }

    /**
     * Initialize Phase 2 features
     */
    initializePhase2Features() {
        this.setupEnhancedSceneInterface();
        this.setupDragDropSystem();
        this.setupMappingSystem();
        this.setupDuplicateResolution();
    }

    /**
     * Enhanced Scene Review Interface
     */
    setupEnhancedSceneInterface() {
        // Add edit mode toggle button to results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection && !document.getElementById('editModeToggle')) {
            const editControls = document.createElement('div');
            editControls.className = 'edit-controls';
            editControls.innerHTML = `
                <div class="edit-mode-controls">
                    <button id="editModeToggle" onclick="window.phase2Manager.toggleEditMode()">
                        <span id="editModeIcon">✏️</span> Enable Edit Mode
                    </button>
                    <button id="selectAllScenes" onclick="window.phase2Manager.toggleSelectAll()" disabled>
                        Select All
                    </button>
                    <button id="bulkEditBtn" onclick="window.phase2Manager.openBulkEdit()" disabled>
                        Bulk Edit
                    </button>
                    <button id="resolveConflictsBtn" onclick="window.phase2Manager.openConflictResolution()" disabled>
                        Resolve Conflicts
                    </button>
                </div>
            `;
            
            resultsSection.insertBefore(editControls, resultsSection.querySelector('.results-tabs'));
        }
    }

    /**
     * Toggle edit mode for scenes
     */
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const toggleBtn = document.getElementById('editModeToggle');
        const icon = document.getElementById('editModeIcon');
        const selectAllBtn = document.getElementById('selectAllScenes');
        const bulkEditBtn = document.getElementById('bulkEditBtn');
        const resolveBtn = document.getElementById('resolveConflictsBtn');

        if (this.isEditMode) {
            toggleBtn.innerHTML = '<span id="editModeIcon">👁️</span> View Mode';
            selectAllBtn.disabled = false;
            bulkEditBtn.disabled = false;
            resolveBtn.disabled = false;
            this.enableSceneEditing();
        } else {
            toggleBtn.innerHTML = '<span id="editModeIcon">✏️</span> Enable Edit Mode';
            selectAllBtn.disabled = true;
            bulkEditBtn.disabled = true;
            resolveBtn.disabled = true;
            this.disableSceneEditing();
            this.selectedScenes.clear();
        }

        // Refresh scene display
        this.app.displayScenes();
    }

    /**
     * Enable editing features for scenes
     */
    enableSceneEditing() {
        const scenesList = document.getElementById('scenesList');
        if (!scenesList) return;

        // Add checkboxes and edit buttons to each scene
        const sceneItems = scenesList.querySelectorAll('.scene-item');
        sceneItems.forEach((sceneItem, index) => {
            // Add selection checkbox
            if (!sceneItem.querySelector('.scene-selector')) {
                const selector = document.createElement('div');
                selector.className = 'scene-selector';
                selector.innerHTML = `
                    <input type="checkbox" id="scene-${index}" onchange="window.phase2Manager.toggleSceneSelection(${index}, this.checked)">
                    <label for="scene-${index}">Select</label>
                `;
                sceneItem.insertBefore(selector, sceneItem.firstChild);
            }

            // Add edit button
            if (!sceneItem.querySelector('.scene-edit-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'scene-edit-btn';
                editBtn.innerHTML = '✏️ Edit';
                editBtn.onclick = () => this.openSceneEditor(index);
                sceneItem.querySelector('.scene-header').appendChild(editBtn);
            }

            // Add conflict indicator if duplicate scene number
            const scene = this.app.currentAnalysis.scenes[index];
            if (this.isDuplicateSceneNumber(scene)) {
                if (!sceneItem.querySelector('.conflict-indicator')) {
                    const conflictIndicator = document.createElement('div');
                    conflictIndicator.className = 'conflict-indicator';
                    conflictIndicator.innerHTML = '⚠️ Duplicate Scene Number';
                    conflictIndicator.title = 'This scene number conflicts with another scene';
                    sceneItem.querySelector('.scene-header').appendChild(conflictIndicator);
                }
            }
        });
    }

    /**
     * Disable editing features
     */
    disableSceneEditing() {
        const scenesList = document.getElementById('scenesList');
        if (!scenesList) return;

        // Remove editing elements
        scenesList.querySelectorAll('.scene-selector').forEach(el => el.remove());
        scenesList.querySelectorAll('.scene-edit-btn').forEach(el => el.remove());
        scenesList.querySelectorAll('.conflict-indicator').forEach(el => el.remove());
    }

    /**
     * Toggle scene selection
     */
    toggleSceneSelection(sceneIndex, isSelected) {
        if (isSelected) {
            this.selectedScenes.add(sceneIndex);
        } else {
            this.selectedScenes.delete(sceneIndex);
        }

        // Update UI state
        const bulkEditBtn = document.getElementById('bulkEditBtn');
        bulkEditBtn.disabled = this.selectedScenes.size === 0;
    }

    /**
     * Toggle select all scenes
     */
    toggleSelectAll() {
        const selectAllBtn = document.getElementById('selectAllScenes');
        const scenesList = document.getElementById('scenesList');
        const checkboxes = scenesList.querySelectorAll('input[type="checkbox"]');
        
        const allSelected = this.selectedScenes.size === checkboxes.length;
        
        if (allSelected) {
            // Deselect all
            checkboxes.forEach(cb => cb.checked = false);
            this.selectedScenes.clear();
            selectAllBtn.textContent = 'Select All';
        } else {
            // Select all
            checkboxes.forEach((cb, index) => {
                cb.checked = true;
                this.selectedScenes.add(index);
            });
            selectAllBtn.textContent = 'Deselect All';
        }

        const bulkEditBtn = document.getElementById('bulkEditBtn');
        bulkEditBtn.disabled = this.selectedScenes.size === 0;
    }

    /**
     * Open scene editor modal
     */
    openSceneEditor(sceneIndex) {
        const scene = this.app.currentAnalysis.scenes[sceneIndex];
        if (!scene) return;

        const modal = this.createModal('Edit Scene', `
            <form id="sceneEditForm">
                <div class="form-group">
                    <label for="sceneNumber">Scene Number:</label>
                    <input type="number" id="sceneNumber" value="${scene.number || ''}">
                </div>
                <div class="form-group">
                    <label for="sceneSlugline">Slugline:</label>
                    <input type="text" id="sceneSlugline" value="${scene.slugline}" placeholder="INT./EXT. LOCATION - TIME">
                </div>
                <div class="form-group">
                    <label for="sceneLocation">Location:</label>
                    <input type="text" id="sceneLocation" value="${scene.location}">
                </div>
                <div class="form-group">
                    <label for="sceneTimeOfDay">Time of Day:</label>
                    <select id="sceneTimeOfDay">
                        <option value="DAY" ${scene.timeOfDay === 'DAY' ? 'selected' : ''}>Day</option>
                        <option value="NIGHT" ${scene.timeOfDay === 'NIGHT' ? 'selected' : ''}>Night</option>
                        <option value="DAWN" ${scene.timeOfDay === 'DAWN' ? 'selected' : ''}>Dawn</option>
                        <option value="DUSK" ${scene.timeOfDay === 'DUSK' ? 'selected' : ''}>Dusk</option>
                        <option value="CONTINUOUS" ${scene.timeOfDay === 'CONTINUOUS' ? 'selected' : ''}>Continuous</option>
                        <option value="LATER" ${scene.timeOfDay === 'LATER' ? 'selected' : ''}>Later</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="sceneCharacters">Characters (comma-separated):</label>
                    <input type="text" id="sceneCharacters" value="${scene.characters.join(', ')}">
                </div>
                <div class="form-group">
                    <label for="sceneLength">Estimated Length (1/8 pages):</label>
                    <input type="number" id="sceneLength" step="0.125" value="${scene.estimatedLength}">
                </div>
                <div class="form-group">
                    <label for="sceneContent">Content:</label>
                    <textarea id="sceneContent" rows="10">${scene.content}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="window.phase2Manager.saveSceneEdit(${sceneIndex})">Save Changes</button>
                    <button type="button" onclick="window.phase2Manager.closeModal()">Cancel</button>
                </div>
            </form>
        `);

        document.body.appendChild(modal);
    }

    /**
     * Save scene edits
     */
    saveSceneEdit(sceneIndex) {
        const scene = this.app.currentAnalysis.scenes[sceneIndex];
        if (!scene) return;

        // Get form values
        const number = parseInt(document.getElementById('sceneNumber').value) || null;
        const slugline = document.getElementById('sceneSlugline').value.trim();
        const location = document.getElementById('sceneLocation').value.trim();
        const timeOfDay = document.getElementById('sceneTimeOfDay').value;
        const characters = document.getElementById('sceneCharacters').value
            .split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);
        const estimatedLength = parseFloat(document.getElementById('sceneLength').value) || 0;
        const content = document.getElementById('sceneContent').value;

        // Update scene
        scene.number = number;
        scene.slugline = slugline;
        scene.location = location;
        scene.timeOfDay = timeOfDay;
        scene.characters = characters;
        scene.estimatedLength = estimatedLength;
        scene.content = content;

        // Regenerate scene ID based on updated data
        scene.id = scene.generateId();

        // Update analysis data
        this.app.sceneAnalyzer.updateAnalysisData(this.app.currentAnalysis);

        // Refresh display
        this.app.displayResults();

        // Close modal
        this.closeModal();

        console.log('Scene updated:', scene);
    }

    /**
     * Open bulk edit modal
     */
    openBulkEdit() {
        if (this.selectedScenes.size === 0) return;

        const modal = this.createModal('Bulk Edit Scenes', `
            <form id="bulkEditForm">
                <p>Editing ${this.selectedScenes.size} selected scenes</p>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bulkEditLocation"> Update Location:
                        <input type="text" id="bulkLocation" placeholder="New location" disabled>
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bulkEditTimeOfDay"> Update Time of Day:
                        <select id="bulkTimeOfDay" disabled>
                            <option value="DAY">Day</option>
                            <option value="NIGHT">Night</option>
                            <option value="DAWN">Dawn</option>
                            <option value="DUSK">Dusk</option>
                            <option value="CONTINUOUS">Continuous</option>
                            <option value="LATER">Later</option>
                        </select>
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bulkEditRenumber"> Renumber Scenes Starting From:
                        <input type="number" id="bulkStartNumber" value="1" disabled>
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="window.phase2Manager.applyBulkEdit()">Apply Changes</button>
                    <button type="button" onclick="window.phase2Manager.closeModal()">Cancel</button>
                </div>
            </form>
        `);

        // Setup checkbox handlers
        modal.querySelector('#bulkEditLocation').onchange = function() {
            document.getElementById('bulkLocation').disabled = !this.checked;
        };
        modal.querySelector('#bulkEditTimeOfDay').onchange = function() {
            document.getElementById('bulkTimeOfDay').disabled = !this.checked;
        };
        modal.querySelector('#bulkEditRenumber').onchange = function() {
            document.getElementById('bulkStartNumber').disabled = !this.checked;
        };

        document.body.appendChild(modal);
    }

    /**
     * Apply bulk edit changes
     */
    applyBulkEdit() {
        const selectedIndices = Array.from(this.selectedScenes).sort((a, b) => a - b);
        
        const updateLocation = document.getElementById('bulkEditLocation').checked;
        const updateTimeOfDay = document.getElementById('bulkEditTimeOfDay').checked;
        const renumberScenes = document.getElementById('bulkEditRenumber').checked;
        
        const newLocation = document.getElementById('bulkLocation').value.trim();
        const newTimeOfDay = document.getElementById('bulkTimeOfDay').value;
        const startNumber = parseInt(document.getElementById('bulkStartNumber').value) || 1;

        // Apply changes
        selectedIndices.forEach((sceneIndex, i) => {
            const scene = this.app.currentAnalysis.scenes[sceneIndex];
            if (!scene) return;

            if (updateLocation && newLocation) {
                scene.location = newLocation;
                // Update slugline if it exists
                if (scene.slugline) {
                    scene.slugline = scene.slugline.replace(/(?:INT\.|EXT\.)\s+([^-]+)\s+-/, 
                        (match, oldLocation) => match.replace(oldLocation.trim(), newLocation));
                }
            }

            if (updateTimeOfDay) {
                scene.timeOfDay = newTimeOfDay;
                // Update slugline if it exists
                if (scene.slugline) {
                    scene.slugline = scene.slugline.replace(/-\s*\w+\s*$/, `- ${newTimeOfDay}`);
                }
            }

            if (renumberScenes) {
                scene.number = startNumber + i;
            }

            // Regenerate scene ID
            scene.id = scene.generateId();
        });

        // Update analysis data
        this.app.sceneAnalyzer.updateAnalysisData(this.app.currentAnalysis);

        // Refresh display
        this.app.displayResults();

        // Close modal
        this.closeModal();

        console.log('Bulk edit applied to', selectedIndices.length, 'scenes');
    }

    /**
     * Check if scene has duplicate number
     */
    isDuplicateSceneNumber(scene) {
        if (!scene.number) return false;
        
        const scenesWithSameNumber = this.app.currentAnalysis.scenes.filter(s => s.number === scene.number);
        return scenesWithSameNumber.length > 1;
    }

    /**
     * Setup drag and drop system
     */
    setupDragDropSystem() {
        // Will be implemented in next step
        console.log('Drag/drop system initialized');
    }

    /**
     * Setup mapping system
     */
    setupMappingSystem() {
        // Will be implemented in next step
        console.log('Mapping system initialized');
    }

    /**
     * Setup duplicate resolution
     */
    setupDuplicateResolution() {
        // Will be implemented in next step
        console.log('Duplicate resolution system initialized');
    }

    /**
     * Open conflict resolution modal
     */
    openConflictResolution() {
        // Find duplicate scene numbers
        const duplicates = this.findDuplicateScenes();
        
        if (duplicates.length === 0) {
            alert('No duplicate scene numbers found!');
            return;
        }

        const modal = this.createModal('Resolve Scene Number Conflicts', `
            <div class="conflict-resolution">
                <p>Found ${duplicates.length} sets of duplicate scene numbers:</p>
                <div id="conflictsList">
                    ${duplicates.map((group, index) => `
                        <div class="conflict-group">
                            <h4>Scene Number ${group.number} (${group.scenes.length} conflicts)</h4>
                            ${group.scenes.map((scene, sceneIndex) => `
                                <div class="conflict-scene">
                                    <label>
                                        <input type="radio" name="keep-${index}" value="${scene.originalIndex}">
                                        Keep: ${scene.slugline || 'No slugline'} (${scene.location || 'Unknown location'})
                                    </label>
                                    <label>
                                        New number: <input type="number" id="newNumber-${scene.originalIndex}" value="${group.number}">
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                <div class="form-actions">
                    <button type="button" onclick="window.phase2Manager.applyConflictResolution()">Apply Resolution</button>
                    <button type="button" onclick="window.phase2Manager.autoResolveConflicts()">Auto-Renumber</button>
                    <button type="button" onclick="window.phase2Manager.closeModal()">Cancel</button>
                </div>
            </div>
        `);

        document.body.appendChild(modal);
    }

    /**
     * Find duplicate scene numbers
     */
    findDuplicateScenes() {
        const sceneGroups = new Map();
        
        this.app.currentAnalysis.scenes.forEach((scene, index) => {
            if (scene.number) {
                if (!sceneGroups.has(scene.number)) {
                    sceneGroups.set(scene.number, []);
                }
                sceneGroups.get(scene.number).push({
                    ...scene,
                    originalIndex: index
                });
            }
        });

        // Return only groups with duplicates
        return Array.from(sceneGroups.entries())
            .filter(([number, scenes]) => scenes.length > 1)
            .map(([number, scenes]) => ({ number, scenes }));
    }

    /**
     * Auto-resolve conflicts by renumbering
     */
    autoResolveConflicts() {
        const scenes = this.app.currentAnalysis.scenes;
        scenes.forEach((scene, index) => {
            scene.number = index + 1;
            scene.id = scene.generateId();
        });

        // Update analysis and refresh
        this.app.sceneAnalyzer.updateAnalysisData(this.app.currentAnalysis);
        this.app.displayResults();
        this.closeModal();

        console.log('Auto-renumbered all scenes');
    }

    /**
     * Create modal dialog
     */
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="window.phase2Manager.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Close modal dialog
     */
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
}

// Make Phase2Manager available globally
window.Phase2Manager = Phase2Manager;