# Performance and Accessibility Issues

## Issue #9: Inefficient DOM Manipulation and Performance (MEDIUM)

**Severity**: Medium  
**Type**: Performance  
**Component**: main.js, phase2Manager.js  

### Description
Repeated DOM queries and inefficient rendering patterns cause performance issues, especially with large screenplays.

### Performance Problems

1. **Repeated DOM Queries** - main.js and phase2Manager.js
```javascript
// These run multiple times without caching
const scenesList = document.getElementById('scenesList');
const charactersTab = document.getElementById('charactersTab');
const locationsList = document.getElementById('locationsList');
```

2. **Inefficient String Concatenation** - main.js:174-210
```javascript
// Building large HTML strings in loops
for (const scene of scenes) {
    html += `<div class="scene-item">...`; // String concatenation in loop
}
```

3. **Full Re-renders** - main.js:149-166
```javascript
displayResults() {
    // Completely rebuilds all displays every time
    this.displayScenes();
    this.displayCharacters(); 
    this.displayLocations();
}
```

### Recommended Solutions

**1. Implement DOM Element Caching**
```javascript
class DOMCache {
    constructor() {
        this.elements = new Map();
    }
    
    get(id) {
        if (!this.elements.has(id)) {
            this.elements.set(id, document.getElementById(id));
        }
        return this.elements.get(id);
    }
    
    invalidate(id) {
        this.elements.delete(id);
    }
    
    clear() {
        this.elements.clear();
    }
}
```

**2. Use Document Fragments for Efficient DOM Updates**
```javascript
displayScenes() {
    const { scenes } = this.currentAnalysis;
    const fragment = document.createDocumentFragment();
    
    scenes.forEach(scene => {
        const sceneElement = this.createSceneElement(scene);
        fragment.appendChild(sceneElement);
    });
    
    const scenesList = this.domCache.get('scenesList');
    scenesList.innerHTML = ''; // Clear once
    scenesList.appendChild(fragment); // Append once
}
```

**3. Implement Virtual Scrolling for Large Lists**
```javascript
class VirtualList {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollTop = 0;
    }
    
    render(items) {
        const containerHeight = this.container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / this.itemHeight) + 2;
        
        this.visibleStart = Math.floor(this.scrollTop / this.itemHeight);
        this.visibleEnd = Math.min(this.visibleStart + visibleCount, items.length);
        
        const fragment = document.createDocumentFragment();
        
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const element = this.renderItem(items[i], i);
            element.style.transform = `translateY(${i * this.itemHeight}px)`;
            fragment.appendChild(element);
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }
}
```

---

## Issue #10: Accessibility Issues (MEDIUM)

**Severity**: Medium  
**Type**: Accessibility  
**Component**: index.html, phase2Manager.js  

### Description
The application has significant accessibility issues that prevent screen reader users and keyboard-only users from effectively using the tool.

### Accessibility Problems

1. **Missing ARIA Labels and Roles**
```html
<!-- Modal dialogs lack proper ARIA attributes -->
<div class="modal-overlay">
    <div class="modal-content">
        <!-- Missing role="dialog", aria-labelledby, aria-describedby -->
    </div>
</div>

<!-- Dynamic content lacks live regions -->
<div id="processingStatus">Initializing...</div>
<!-- Should be: aria-live="polite" -->
```

2. **Keyboard Navigation Issues**
```javascript
// Drag/drop functionality not keyboard accessible
setupDragDropSystem() {
    // Only mouse/touch events, no keyboard alternatives
    item.addEventListener('dragstart', (e) => { ... });
}
```

3. **Missing Focus Management**
```javascript
openSceneEditor(sceneIndex) {
    // Modal opens but focus not moved to it
    const modal = this.createModal('Edit Scene', content);
    document.body.appendChild(modal);
    // Should focus first input or close button
}
```

### Recommended Solutions

**1. Add Proper ARIA Attributes**
```javascript
createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.setAttribute('aria-modal', 'true');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modal-title">${title}</h3>
                <button class="modal-close" aria-label="Close dialog">×</button>
            </div>
            <div class="modal-body" role="document">
                ${content}
            </div>
        </div>
    `;
    
    return modal;
}
```

**2. Implement Keyboard Navigation**
```javascript
class KeyboardAccessibleDragDrop {
    constructor() {
        this.selectedItems = new Set();
    }
    
    handleKeydown(event, item) {
        switch (event.key) {
            case ' ':
            case 'Enter':
                event.preventDefault();
                this.toggleSelection(item);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.moveSelection('up');
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.moveSelection('down');
                break;
            case 'Delete':
            case 'Backspace':
                event.preventDefault();
                this.deleteSelected();
                break;
        }
    }
    
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
}
```

**3. Add Focus Management**
```javascript
openSceneEditor(sceneIndex) {
    const modal = this.createModal('Edit Scene', content);
    document.body.appendChild(modal);
    
    // Store current focus
    this.previousFocus = document.activeElement;
    
    // Move focus to modal
    const firstInput = modal.querySelector('input, textarea, select, button');
    if (firstInput) {
        firstInput.focus();
    }
    
    // Trap focus within modal
    this.trapFocus(modal);
}

closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        
        // Restore previous focus
        if (this.previousFocus) {
            this.previousFocus.focus();
        }
    }
}
```