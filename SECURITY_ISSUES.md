# Critical Security Vulnerabilities Found in Screenplay Analysis Tool

## Issue #1: XSS Vulnerabilities in Multiple Components (CRITICAL)

**Severity**: Critical  
**Type**: Security Vulnerability  
**Component**: main.js, phase2Manager.js  

### Description
Multiple instances of Cross-Site Scripting (XSS) vulnerabilities exist where user input is directly inserted into innerHTML without proper sanitization.

### Affected Code Locations

1. **main.js:190-206** - Scene content display
```javascript
html += `
    <div class="scene-item">
        <div class="scene-header">
            <span class="scene-number">Scene ${scene.number || 'Unknown'}</span>
            <span class="scene-location">${scene.location || 'Unknown Location'}</span>
            <span class="scene-time">${scene.timeOfDay || 'Unknown Time'}</span>
        </div>
        <div class="scene-content">
            <p><strong>Slugline:</strong> ${scene.slugline || 'No slugline'}</p>
            <div class="scene-text">${this.truncateText(scene.content, 300)}</div>
        </div>
    </div>
`;
```

2. **phase2Manager.js:196-238** - Scene editor modal
```javascript
const modal = this.createModal('Edit Scene', `
    <form id="sceneEditForm">
        <input type="text" id="sceneSlugline" value="${scene.slugline}" placeholder="INT./EXT. LOCATION - TIME">
        <input type="text" id="sceneLocation" value="${scene.location}">
        <textarea id="sceneContent" rows="10">${scene.content}</textarea>
    </form>
`);
```

### Impact
- Malicious scripts can be executed in user's browser
- Potential for session hijacking, credential theft
- Data exfiltration from user's analysis results
- Defacement of application interface

### Reproduction Steps
1. Upload a PDF containing malicious content like `<script>alert('XSS')</script>` in scene descriptions
2. Navigate to scenes tab to view extracted content
3. Malicious script executes in browser context

### Recommended Fix
Implement proper HTML escaping for all user-generated content:

```javascript
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Use in templates:
<span class="scene-location">${escapeHtml(scene.location || 'Unknown Location')}</span>
```

---

## Issue #2: Memory Leaks from Unmanaged Event Listeners (HIGH)

**Severity**: High  
**Type**: Performance/Memory  
**Component**: phase2Manager.js  

### Description
Event listeners are repeatedly added without proper cleanup, causing memory leaks during scene editing operations.

### Affected Code
**phase2Manager.js:488-505, 524-541** - Drag/drop event handlers added without removal

```javascript
// Event listeners added repeatedly without cleanup
item.addEventListener('dragstart', (e) => { ... });
item.addEventListener('dragend', (e) => { ... });
```

### Impact
- Browser memory consumption increases over time
- Performance degradation during extended use
- Potential browser crashes on resource-constrained devices

### Recommended Fix
Implement proper event listener lifecycle management:

```javascript
class Phase2Manager {
    constructor() {
        this.eventListeners = new Map();
    }
    
    addEventListenerWithCleanup(element, event, handler) {
        element.addEventListener(event, handler);
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }
        this.eventListeners.get(element).push({ event, handler });
    }
    
    cleanup() {
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();
    }
}
```