# Architectural and Design Issues

## Issue #5: Global State Pollution and Tight Coupling (MEDIUM)

**Severity**: Medium  
**Type**: Architecture  
**Component**: main.js, phase2Manager.js  

### Description
Heavy reliance on global variables and tight coupling between components makes the application difficult to test, maintain, and extend.

### Problematic Patterns

1. **Global Variables** - main.js:362-364
```javascript
window.app = new ScreenplayAnalyzer();
window.phase2Manager = new Phase2Manager(window.app);
```

2. **Tight Coupling** - phase2Manager.js constructor directly manipulates DOM
```javascript
constructor(screenplayAnalyzer) {
    this.app = screenplayAnalyzer;
    this.initializePhase2Features(); // Immediately starts DOM manipulation
    this.setupEnhancedSceneInterface(); // Tightly coupled to specific DOM structure
}
```

3. **Direct DOM Dependencies** throughout phase2Manager.js
```javascript
const resultsSection = document.getElementById('resultsSection'); // Hard dependency
```

### Impact
- Difficult to unit test components in isolation
- Components cannot be reused in different contexts
- Changes in one component require changes in others
- Hard to implement different UI frameworks

### Recommended Refactor
Implement dependency injection and loose coupling:

```javascript
// Service container for dependency management
class ServiceContainer {
    constructor() {
        this.services = new Map();
    }
    
    register(name, factory) {
        this.services.set(name, factory);
    }
    
    get(name) {
        const factory = this.services.get(name);
        return factory ? factory() : null;
    }
}

// Abstract DOM adapter
class DOMAdapter {
    getElementById(id) { throw new Error('Must implement'); }
    createElement(tag) { throw new Error('Must implement'); }
    // ... other DOM methods
}

class BrowserDOMAdapter extends DOMAdapter {
    getElementById(id) { return document.getElementById(id); }
    createElement(tag) { return document.createElement(tag); }
}

// Phase2Manager with dependency injection
class Phase2Manager {
    constructor(app, domAdapter) {
        this.app = app;
        this.dom = domAdapter;
        // No immediate DOM manipulation
    }
    
    initialize() {
        if (this.dom.getElementById('resultsSection')) {
            this.initializePhase2Features();
        }
    }
}
```

---

## Issue #6: Single Responsibility Principle Violations (MEDIUM)

**Severity**: Medium  
**Type**: Design  
**Component**: phase2Manager.js, main.js  

### Description
Classes have too many responsibilities, violating the Single Responsibility Principle and making them difficult to maintain.

### Examples

**Phase2Manager** (1388 lines) handles:
- UI state management
- Drag/drop functionality  
- Modal dialog creation
- Data export/import
- Conflict resolution
- Character/location grouping
- Scene editing
- File I/O operations

**ScreenplayAnalyzer** handles:
- File upload
- Progress tracking
- UI rendering
- Error display
- Event handling

### Recommended Refactor
Split into focused, single-responsibility classes:

```javascript
// Separate concerns into focused classes
class UIStateManager {
    constructor(domAdapter) {
        this.dom = domAdapter;
        this.editMode = false;
        this.selectedScenes = new Set();
    }
    
    toggleEditMode() { /* focused on edit mode only */ }
    updateUI() { /* focused on UI updates only */ }
}

class DragDropManager {
    constructor(domAdapter) {
        this.dom = domAdapter;
        this.handlers = new Map();
    }
    
    enableDragDrop(elements) { /* focused on drag/drop only */ }
    cleanup() { /* focused on cleanup only */ }
}

class ModalManager {
    constructor(domAdapter) {
        this.dom = domAdapter;
        this.activeModals = [];
    }
    
    createModal(title, content) { /* focused on modals only */ }
    closeModal() { /* focused on modals only */ }
}

class SceneEditor {
    constructor(domAdapter, modalManager) {
        this.dom = domAdapter;
        this.modalManager = modalManager;
    }
    
    openEditor(scene) { /* focused on scene editing only */ }
    saveChanges(sceneData) { /* focused on scene editing only */ }
}
```