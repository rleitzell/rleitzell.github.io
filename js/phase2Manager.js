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
        
        // Re-enable drag/drop if in edit mode
        setTimeout(() => {
            this.enableDragDropInEditMode();
        }, 100);

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
        // Add drag/drop interface to character and location tabs
        this.setupCharacterGrouping();
        this.setupLocationGrouping();
        console.log('Drag/drop system initialized');
    }

    /**
     * Setup character grouping with drag/drop
     */
    setupCharacterGrouping() {
        // Add grouping controls to characters tab
        const charactersTab = document.getElementById('charactersTab');
        if (charactersTab && !charactersTab.querySelector('.grouping-controls')) {
            const groupingControls = document.createElement('div');
            groupingControls.className = 'grouping-controls';
            groupingControls.innerHTML = `
                <div class="grouping-header">
                    <h4>Character Grouping</h4>
                    <p>Drag characters to group similar names together (e.g., "JOHN" and "John")</p>
                    <button id="createCharacterGroup" onclick="window.phase2Manager.createCharacterGroup()">Create New Group</button>
                    <button id="clearCharacterGroups" onclick="window.phase2Manager.clearCharacterGroups()">Clear All Groups</button>
                </div>
                <div id="characterGroups" class="grouping-area">
                    <div class="drop-zone" data-type="character">
                        <p>Drop characters here to create groups</p>
                    </div>
                </div>
            `;
            charactersTab.insertBefore(groupingControls, charactersTab.firstChild);
        }
    }

    /**
     * Setup location grouping with drag/drop
     */
    setupLocationGrouping() {
        // Add grouping controls to locations tab
        const locationsTab = document.getElementById('locationsTab');
        if (locationsTab && !locationsTab.querySelector('.grouping-controls')) {
            const groupingControls = document.createElement('div');
            groupingControls.className = 'grouping-controls';
            groupingControls.innerHTML = `
                <div class="grouping-header">
                    <h4>Location Grouping</h4>
                    <p>Drag locations to group similar names together (e.g., "KITCHEN" and "Kitchen")</p>
                    <button id="createLocationGroup" onclick="window.phase2Manager.createLocationGroup()">Create New Group</button>
                    <button id="clearLocationGroups" onclick="window.phase2Manager.clearLocationGroups()">Clear All Groups</button>
                </div>
                <div id="locationGroups" class="grouping-area">
                    <div class="drop-zone" data-type="location">
                        <p>Drop locations here to create groups</p>
                    </div>
                </div>
            `;
            locationsTab.insertBefore(groupingControls, locationsTab.firstChild);
        }
    }

    /**
     * Enable drag/drop for characters list
     */
    enableCharacterDragDrop() {
        const charactersList = document.getElementById('charactersList');
        if (!charactersList) return;

        const characterItems = charactersList.querySelectorAll('.character-item');
        characterItems.forEach((item, index) => {
            if (!item.hasAttribute('draggable')) {
                item.setAttribute('draggable', 'true');
                item.className += ' draggable-item';
                item.dataset.characterIndex = index;
                
                item.addEventListener('dragstart', (e) => {
                    this.draggedElement = {
                        type: 'character',
                        index: index,
                        element: item,
                        data: this.app.currentAnalysis.characters[index]
                    };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', item.outerHTML);
                    item.classList.add('dragging');
                });

                item.addEventListener('dragend', (e) => {
                    item.classList.remove('dragging');
                    this.draggedElement = null;
                });
            }
        });

        this.setupDropZones('character');
    }

    /**
     * Enable drag/drop for locations list
     */
    enableLocationDragDrop() {
        const locationsList = document.getElementById('locationsList');
        if (!locationsList) return;

        const locationItems = locationsList.querySelectorAll('.location-item');
        locationItems.forEach((item, index) => {
            if (!item.hasAttribute('draggable')) {
                item.setAttribute('draggable', 'true');
                item.className += ' draggable-item';
                item.dataset.locationIndex = index;
                
                item.addEventListener('dragstart', (e) => {
                    this.draggedElement = {
                        type: 'location',
                        index: index,
                        element: item,
                        data: this.app.currentAnalysis.locations[index]
                    };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', item.outerHTML);
                    item.classList.add('dragging');
                });

                item.addEventListener('dragend', (e) => {
                    item.classList.remove('dragging');
                    this.draggedElement = null;
                });
            }
        });

        this.setupDropZones('location');
    }

    /**
     * Setup drop zones for grouping
     */
    setupDropZones(type) {
        const dropZones = document.querySelectorAll(`.drop-zone[data-type="${type}"], .group-container[data-type="${type}"]`);
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                if (this.draggedElement && this.draggedElement.type === type) {
                    this.handleDrop(zone, this.draggedElement);
                }
            });
        });
    }

    /**
     * Handle drop event for grouping
     */
    handleDrop(dropZone, draggedElement) {
        if (dropZone.classList.contains('drop-zone')) {
            // Create new group
            this.createGroupFromDrop(dropZone, draggedElement);
        } else if (dropZone.classList.contains('group-container')) {
            // Add to existing group
            this.addToExistingGroup(dropZone, draggedElement);
        }
    }

    /**
     * Create new group from dropped element
     */
    createGroupFromDrop(dropZone, draggedElement) {
        const type = draggedElement.type;
        const groupId = `group-${type}-${Date.now()}`;
        
        const groupContainer = document.createElement('div');
        groupContainer.className = 'group-container';
        groupContainer.dataset.type = type;
        groupContainer.dataset.groupId = groupId;
        groupContainer.innerHTML = `
            <div class="group-header">
                <h5>Group ${this.getGroupCount(type) + 1}</h5>
                <input type="text" class="group-name" placeholder="Enter group name" value="${draggedElement.data.name}">
                <button onclick="window.phase2Manager.mergeGroup('${groupId}')" class="merge-btn">Merge</button>
                <button onclick="window.phase2Manager.ungroup('${groupId}')" class="ungroup-btn">Ungroup</button>
                <button onclick="window.phase2Manager.deleteGroup('${groupId}')" class="delete-btn">Delete</button>
            </div>
            <div class="group-items">
                <div class="group-item" data-original-index="${draggedElement.index}">
                    <span class="item-name">${draggedElement.data.name}</span>
                    <span class="item-count">${draggedElement.data.totalAppearances || draggedElement.data.totalUses} scenes</span>
                </div>
            </div>
        `;

        // Replace drop zone with group container
        const groupingArea = dropZone.parentElement;
        groupingArea.insertBefore(groupContainer, dropZone);
        
        // Setup drop zone for this group
        this.setupDropZones(type);
        
        // Hide original item
        draggedElement.element.style.display = 'none';
    }

    /**
     * Add element to existing group
     */
    addToExistingGroup(groupContainer, draggedElement) {
        const groupItems = groupContainer.querySelector('.group-items');
        
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
        groupItem.dataset.originalIndex = draggedElement.index;
        groupItem.innerHTML = `
            <span class="item-name">${draggedElement.data.name}</span>
            <span class="item-count">${draggedElement.data.totalAppearances || draggedElement.data.totalUses} scenes</span>
        `;
        
        groupItems.appendChild(groupItem);
        
        // Hide original item
        draggedElement.element.style.display = 'none';
    }

    /**
     * Create character group manually
     */
    createCharacterGroup() {
        const groupingArea = document.getElementById('characterGroups');
        const groupId = `group-character-${Date.now()}`;
        
        const groupContainer = document.createElement('div');
        groupContainer.className = 'group-container';
        groupContainer.dataset.type = 'character';
        groupContainer.dataset.groupId = groupId;
        groupContainer.innerHTML = `
            <div class="group-header">
                <h5>New Character Group</h5>
                <input type="text" class="group-name" placeholder="Enter group name">
                <button onclick="window.phase2Manager.mergeGroup('${groupId}')" class="merge-btn">Merge</button>
                <button onclick="window.phase2Manager.ungroup('${groupId}')" class="ungroup-btn">Ungroup</button>
                <button onclick="window.phase2Manager.deleteGroup('${groupId}')" class="delete-btn">Delete</button>
            </div>
            <div class="group-items">
                <p class="empty-group">Drag characters here to add them to this group</p>
            </div>
        `;
        
        groupingArea.appendChild(groupContainer);
        this.setupDropZones('character');
    }

    /**
     * Create location group manually
     */
    createLocationGroup() {
        const groupingArea = document.getElementById('locationGroups');
        const groupId = `group-location-${Date.now()}`;
        
        const groupContainer = document.createElement('div');
        groupContainer.className = 'group-container';
        groupContainer.dataset.type = 'location';
        groupContainer.dataset.groupId = groupId;
        groupContainer.innerHTML = `
            <div class="group-header">
                <h5>New Location Group</h5>
                <input type="text" class="group-name" placeholder="Enter group name">
                <button onclick="window.phase2Manager.mergeGroup('${groupId}')" class="merge-btn">Merge</button>
                <button onclick="window.phase2Manager.ungroup('${groupId}')" class="ungroup-btn">Ungroup</button>
                <button onclick="window.phase2Manager.deleteGroup('${groupId}')" class="delete-btn">Delete</button>
            </div>
            <div class="group-items">
                <p class="empty-group">Drag locations here to add them to this group</p>
            </div>
        `;
        
        groupingArea.appendChild(groupContainer);
        this.setupDropZones('location');
    }

    /**
     * Merge items in a group
     */
    mergeGroup(groupId) {
        const groupContainer = document.querySelector(`[data-group-id="${groupId}"]`);
        if (!groupContainer) return;

        const groupName = groupContainer.querySelector('.group-name').value.trim();
        if (!groupName) {
            alert('Please enter a name for the merged group');
            return;
        }

        const type = groupContainer.dataset.type;
        const groupItems = groupContainer.querySelectorAll('.group-item');
        const originalIndices = Array.from(groupItems).map(item => parseInt(item.dataset.originalIndex));

        if (originalIndices.length < 2) {
            alert('Need at least 2 items to merge');
            return;
        }

        // Apply merge to analysis data
        this.applyMerge(type, originalIndices, groupName);

        // Update display
        this.app.displayResults();
        
        // Show confirmation
        alert(`Merged ${originalIndices.length} ${type}s into "${groupName}"`);
    }

    /**
     * Apply merge to analysis data
     */
    applyMerge(type, originalIndices, newName) {
        if (type === 'character') {
            this.mergeCharacters(originalIndices, newName);
        } else if (type === 'location') {
            this.mergeLocations(originalIndices, newName);
        }
    }

    /**
     * Merge characters in analysis data
     */
    mergeCharacters(indices, newName) {
        const characters = this.app.currentAnalysis.characters;
        const scenes = this.app.currentAnalysis.scenes;
        
        // Get characters to merge
        const charactersToMerge = indices.map(i => characters[i]).filter(c => c);
        if (charactersToMerge.length < 2) return;

        // Get all old names
        const oldNames = charactersToMerge.map(c => c.name);
        
        // Create merged character
        const mergedCharacter = new Character(newName);
        const allScenes = new Set();
        
        charactersToMerge.forEach(char => {
            char.scenes.forEach(sceneId => allScenes.add(sceneId));
        });
        
        mergedCharacter.scenes = Array.from(allScenes);
        mergedCharacter.totalAppearances = mergedCharacter.scenes.length;

        // Update scenes to use new character name
        scenes.forEach(scene => {
            scene.characters = scene.characters.map(charName => 
                oldNames.includes(charName) ? newName : charName
            );
        });

        // Remove old characters and add merged one
        const sortedIndices = indices.sort((a, b) => b - a);
        sortedIndices.forEach(index => {
            if (index < characters.length) {
                characters.splice(index, 1);
            }
        });
        
        characters.push(mergedCharacter);

        // Update character mappings
        oldNames.forEach(oldName => {
            this.characterMappings.set(oldName, newName);
        });

        console.log(`Merged characters: ${oldNames.join(', ')} -> ${newName}`);
    }

    /**
     * Merge locations in analysis data
     */
    mergeLocations(indices, newName) {
        const locations = this.app.currentAnalysis.locations;
        const scenes = this.app.currentAnalysis.scenes;
        
        // Get locations to merge
        const locationsToMerge = indices.map(i => locations[i]).filter(l => l);
        if (locationsToMerge.length < 2) return;

        // Get all old names
        const oldNames = locationsToMerge.map(l => l.name);
        
        // Create merged location
        const mergedLocation = {
            name: newName,
            scenes: [],
            totalUses: 0
        };
        
        const allScenes = new Set();
        locationsToMerge.forEach(loc => {
            if (loc.scenes) {
                loc.scenes.forEach(sceneId => allScenes.add(sceneId));
            }
        });
        
        mergedLocation.scenes = Array.from(allScenes);
        mergedLocation.totalUses = mergedLocation.scenes.length;

        // Update scenes to use new location name
        scenes.forEach(scene => {
            if (oldNames.includes(scene.location)) {
                scene.location = newName;
                // Update slugline if it exists
                if (scene.slugline) {
                    oldNames.forEach(oldName => {
                        scene.slugline = scene.slugline.replace(oldName, newName);
                    });
                }
            }
        });

        // Remove old locations and add merged one
        const sortedIndices = indices.sort((a, b) => b - a);
        sortedIndices.forEach(index => {
            if (index < locations.length) {
                locations.splice(index, 1);
            }
        });
        
        locations.push(mergedLocation);

        // Update location mappings
        oldNames.forEach(oldName => {
            this.locationMappings.set(oldName, newName);
        });

        console.log(`Merged locations: ${oldNames.join(', ')} -> ${newName}`);
    }

    /**
     * Ungroup items (restore original state)
     */
    ungroup(groupId) {
        const groupContainer = document.querySelector(`[data-group-id="${groupId}"]`);
        if (!groupContainer) return;

        const groupItems = groupContainer.querySelectorAll('.group-item');
        const type = groupContainer.dataset.type;
        
        // Show original items
        groupItems.forEach(item => {
            const originalIndex = parseInt(item.dataset.originalIndex);
            const listSelector = type === 'character' ? '.character-item' : '.location-item';
            const originalItems = document.querySelectorAll(listSelector);
            
            if (originalItems[originalIndex]) {
                originalItems[originalIndex].style.display = '';
            }
        });

        // Remove group container
        groupContainer.remove();
    }

    /**
     * Delete group
     */
    deleteGroup(groupId) {
        if (confirm('Are you sure you want to delete this group?')) {
            this.ungroup(groupId);
        }
    }

    /**
     * Clear all character groups
     */
    clearCharacterGroups() {
        if (confirm('Are you sure you want to clear all character groups?')) {
            const characterGroups = document.querySelectorAll('.group-container[data-type="character"]');
            characterGroups.forEach(group => {
                this.ungroup(group.dataset.groupId);
            });
            this.characterMappings.clear();
        }
    }

    /**
     * Clear all location groups
     */
    clearLocationGroups() {
        if (confirm('Are you sure you want to clear all location groups?')) {
            const locationGroups = document.querySelectorAll('.group-container[data-type="location"]');
            locationGroups.forEach(group => {
                this.ungroup(group.dataset.groupId);
            });
            this.locationMappings.clear();
        }
    }

    /**
     * Get group count for type
     */
    getGroupCount(type) {
        return document.querySelectorAll(`.group-container[data-type="${type}"]`).length;
    }

    /**
     * Enable drag/drop when edit mode is enabled
     */
    enableDragDropInEditMode() {
        if (this.isEditMode) {
            this.enableCharacterDragDrop();
            this.enableLocationDragDrop();
        }
    }

    /**
     * Setup mapping system
     */
    setupMappingSystem() {
        // Add mapping controls to export tab
        this.addMappingControls();
        console.log('Mapping system initialized');
    }

    /**
     * Add mapping import/export controls
     */
    addMappingControls() {
        const exportTab = document.getElementById('exportTab');
        if (exportTab && !exportTab.querySelector('.mapping-controls')) {
            const mappingControls = document.createElement('div');
            mappingControls.className = 'mapping-controls';
            mappingControls.innerHTML = `
                <div class="mapping-section">
                    <h3>Character & Location Mapping</h3>
                    <p>Import/export mapping configurations to standardize character and location names across projects.</p>
                    
                    <div class="mapping-actions">
                        <div class="mapping-group">
                            <h4>Import Mappings</h4>
                            <input type="file" id="mappingFileInput" accept=".json" style="display: none;">
                            <button onclick="document.getElementById('mappingFileInput').click()">Import Mapping File</button>
                            <button onclick="window.phase2Manager.showSampleMapping()">Show Sample Format</button>
                        </div>
                        
                        <div class="mapping-group">
                            <h4>Export Mappings</h4>
                            <button onclick="window.phase2Manager.exportMappings()">Export Current Mappings</button>
                            <button onclick="window.phase2Manager.exportMappingTemplate()">Export Template</button>
                        </div>
                        
                        <div class="mapping-group">
                            <h4>Apply Mappings</h4>
                            <button onclick="window.phase2Manager.applyAllMappings()" id="applyMappingsBtn" disabled>Apply All Mappings</button>
                            <button onclick="window.phase2Manager.clearAllMappings()">Clear All Mappings</button>
                        </div>
                    </div>
                    
                    <div class="current-mappings">
                        <h4>Current Mappings</h4>
                        <div id="characterMappingsList" class="mappings-list">
                            <h5>Character Mappings:</h5>
                            <div class="mappings-content">No character mappings defined</div>
                        </div>
                        <div id="locationMappingsList" class="mappings-list">
                            <h5>Location Mappings:</h5>
                            <div class="mappings-content">No location mappings defined</div>
                        </div>
                    </div>
                </div>
            `;
            
            exportTab.appendChild(mappingControls);
            
            // Set up file input handler
            document.getElementById('mappingFileInput').addEventListener('change', (e) => {
                this.handleMappingFileImport(e.target.files[0]);
            });
        }
    }

    /**
     * Handle mapping file import
     */
    async handleMappingFileImport(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const mappingData = JSON.parse(text);
            
            // Validate mapping structure
            if (!this.validateMappingData(mappingData)) {
                throw new Error('Invalid mapping file format');
            }

            // Import character mappings
            if (mappingData.characterMappings) {
                Object.entries(mappingData.characterMappings).forEach(([from, to]) => {
                    this.characterMappings.set(from, to);
                });
            }

            // Import location mappings
            if (mappingData.locationMappings) {
                Object.entries(mappingData.locationMappings).forEach(([from, to]) => {
                    this.locationMappings.set(from, to);
                });
            }

            // Update display
            this.updateMappingsDisplay();
            
            alert(`Successfully imported ${Object.keys(mappingData.characterMappings || {}).length} character mappings and ${Object.keys(mappingData.locationMappings || {}).length} location mappings`);

        } catch (error) {
            console.error('Mapping import error:', error);
            alert(`Error importing mapping file: ${error.message}`);
        }
    }

    /**
     * Validate mapping data structure
     */
    validateMappingData(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Check if it has the expected structure
        const hasCharacterMappings = !data.characterMappings || typeof data.characterMappings === 'object';
        const hasLocationMappings = !data.locationMappings || typeof data.locationMappings === 'object';
        
        return hasCharacterMappings && hasLocationMappings;
    }

    /**
     * Export current mappings
     */
    exportMappings() {
        const mappingData = {
            characterMappings: Object.fromEntries(this.characterMappings),
            locationMappings: Object.fromEntries(this.locationMappings),
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0',
                projectName: 'Screenplay Analysis Mappings'
            }
        };

        const filename = this.app.exportUtils.generateFilename('mappings', 'json');
        const jsonData = JSON.stringify(mappingData, null, 2);
        
        this.app.exportUtils.downloadFile(jsonData, filename, 'application/json');
        
        console.log('Mappings exported:', mappingData);
    }

    /**
     * Export mapping template
     */
    exportMappingTemplate() {
        const template = {
            characterMappings: {
                "JOHN": "John Smith",
                "JANE": "Jane Doe",
                "OLD_NAME": "NEW_NAME"
            },
            locationMappings: {
                "KITCHEN": "Kitchen",
                "LIVING ROOM": "Living Room",
                "OLD_LOCATION": "NEW_LOCATION"
            },
            metadata: {
                description: "This is a template for character and location mappings",
                instructions: "Replace the example mappings with your own. Keys are original names, values are standardized names.",
                version: "1.0"
            }
        };

        const filename = 'mapping_template.json';
        const jsonData = JSON.stringify(template, null, 2);
        
        this.app.exportUtils.downloadFile(jsonData, filename, 'application/json');
    }

    /**
     * Show sample mapping format
     */
    showSampleMapping() {
        const modal = this.createModal('Sample Mapping Format', `
            <div class="sample-mapping">
                <p>Here's the expected JSON format for mapping files:</p>
                <pre><code>{
  "characterMappings": {
    "JOHN": "John Smith",
    "john": "John Smith", 
    "J. SMITH": "John Smith",
    "JANE": "Jane Doe",
    "jane": "Jane Doe"
  },
  "locationMappings": {
    "KITCHEN": "Kitchen",
    "kitchen": "Kitchen",
    "LIVING ROOM": "Living Room",
    "living room": "Living Room",
    "LR": "Living Room"
  },
  "metadata": {
    "description": "Character and location standardization mappings",
    "version": "1.0"
  }
}</code></pre>
                <p><strong>Usage:</strong></p>
                <ul>
                    <li>Keys are the original names found in the screenplay</li>
                    <li>Values are the standardized names you want to use</li>
                    <li>This helps consolidate variations like "JOHN", "john", "J. SMITH" into "John Smith"</li>
                </ul>
                <div class="form-actions">
                    <button type="button" onclick="window.phase2Manager.closeModal()">Close</button>
                </div>
            </div>
        `);

        document.body.appendChild(modal);
    }

    /**
     * Apply all current mappings to analysis data
     */
    applyAllMappings() {
        if (this.characterMappings.size === 0 && this.locationMappings.size === 0) {
            alert('No mappings to apply');
            return;
        }

        const characterChanges = this.applyCharacterMappings();
        const locationChanges = this.applyLocationMappings();

        // Update analysis data
        this.app.sceneAnalyzer.updateAnalysisData(this.app.currentAnalysis);

        // Refresh display
        this.app.displayResults();

        alert(`Applied mappings: ${characterChanges} character changes, ${locationChanges} location changes`);
    }

    /**
     * Apply character mappings to scenes
     */
    applyCharacterMappings() {
        let changeCount = 0;
        const scenes = this.app.currentAnalysis.scenes;

        scenes.forEach(scene => {
            const originalCharacters = [...scene.characters];
            scene.characters = scene.characters.map(charName => {
                if (this.characterMappings.has(charName)) {
                    changeCount++;
                    return this.characterMappings.get(charName);
                }
                return charName;
            });

            // Remove duplicates
            scene.characters = [...new Set(scene.characters)];
        });

        return changeCount;
    }

    /**
     * Apply location mappings to scenes
     */
    applyLocationMappings() {
        let changeCount = 0;
        const scenes = this.app.currentAnalysis.scenes;

        scenes.forEach(scene => {
            if (this.locationMappings.has(scene.location)) {
                const newLocation = this.locationMappings.get(scene.location);
                scene.location = newLocation;
                
                // Update slugline if it exists
                if (scene.slugline) {
                    scene.slugline = scene.slugline.replace(/(?:INT\.|EXT\.)\s+([^-]+)\s+-/, 
                        (match, oldLocation) => match.replace(oldLocation.trim(), newLocation));
                }
                
                changeCount++;
            }
        });

        return changeCount;
    }

    /**
     * Clear all mappings
     */
    clearAllMappings() {
        if (confirm('Are you sure you want to clear all mappings?')) {
            this.characterMappings.clear();
            this.locationMappings.clear();
            this.updateMappingsDisplay();
            alert('All mappings cleared');
        }
    }

    /**
     * Update mappings display
     */
    updateMappingsDisplay() {
        // Update character mappings display
        const charMappingsList = document.getElementById('characterMappingsList');
        if (charMappingsList) {
            const content = charMappingsList.querySelector('.mappings-content');
            if (this.characterMappings.size > 0) {
                content.innerHTML = Array.from(this.characterMappings.entries())
                    .map(([from, to]) => `<div class="mapping-item">"${from}" → "${to}"</div>`)
                    .join('');
            } else {
                content.textContent = 'No character mappings defined';
            }
        }

        // Update location mappings display
        const locMappingsList = document.getElementById('locationMappingsList');
        if (locMappingsList) {
            const content = locMappingsList.querySelector('.mappings-content');
            if (this.locationMappings.size > 0) {
                content.innerHTML = Array.from(this.locationMappings.entries())
                    .map(([from, to]) => `<div class="mapping-item">"${from}" → "${to}"</div>`)
                    .join('');
            } else {
                content.textContent = 'No location mappings defined';
            }
        }

        // Enable/disable apply button
        const applyBtn = document.getElementById('applyMappingsBtn');
        if (applyBtn) {
            applyBtn.disabled = this.characterMappings.size === 0 && this.locationMappings.size === 0;
        }
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