# Major Bugs and Architectural Issues

## Issue #3: Race Conditions in Async Operations (HIGH)

**Severity**: High  
**Type**: Bug  
**Component**: main.js, pdfExtractor.js  

### Description
Multiple async operations lack proper error handling and state management, leading to race conditions and inconsistent application state.

### Affected Code Locations

1. **main.js:107-136** - File processing without proper state management
```javascript
async processScreenplay(file) {
    try {
        this.elements.processingSection.style.display = 'block';
        const extractedData = await this.pdfExtractor.extractTextFromPDF(file);
        this.currentAnalysis = await this.sceneAnalyzer.analyzeText(extractedData);
        // No protection against concurrent calls
        setTimeout(() => {
            this.displayResults(); // Could execute after new file is processed
        }, 500);
    } catch (error) {
        // Error state not properly managed
    }
}
```

### Impact
- UI shows stale data when multiple files processed quickly
- Partially processed results displayed
- Application can enter inconsistent state

### Recommended Fix
Implement proper state management with operation cancellation:

```javascript
class ScreenplayAnalyzer {
    constructor() {
        this.currentOperation = null;
    }
    
    async processScreenplay(file) {
        // Cancel previous operation
        if (this.currentOperation) {
            this.currentOperation.cancelled = true;
        }
        
        const operation = { cancelled: false };
        this.currentOperation = operation;
        
        try {
            if (operation.cancelled) return;
            const extractedData = await this.pdfExtractor.extractTextFromPDF(file);
            
            if (operation.cancelled) return;
            this.currentAnalysis = await this.sceneAnalyzer.analyzeText(extractedData);
            
            if (operation.cancelled) return;
            this.displayResults();
        } catch (error) {
            if (!operation.cancelled) {
                this.showError(error.message);
            }
        } finally {
            if (this.currentOperation === operation) {
                this.currentOperation = null;
            }
        }
    }
}
```

---

## Issue #4: Null Reference Errors and Missing Validation (MEDIUM)

**Severity**: Medium  
**Type**: Bug  
**Component**: Multiple files  

### Description
Multiple locations access object properties without proper null/undefined checks, leading to runtime errors.

### Examples

1. **main.js:316** - Event target could be null
```javascript
const clickedButton = event ? event.target : document.querySelector(`[onclick="showTab('${tabName}')"]`);
```

2. **phase2Manager.js:194** - Scene could be undefined
```javascript
openSceneEditor(sceneIndex) {
    const scene = this.app.currentAnalysis.scenes[sceneIndex]; // No bounds check
    if (!scene) return; // Check comes after potential access
}
```

3. **textProcessor.js:68** - Missing validation
```javascript
const sceneNumber = this.extractSceneNumber(line, i, lines);
// No validation that 'lines' array exists or 'i' is valid index
```

### Recommended Fix
Add comprehensive input validation:

```javascript
openSceneEditor(sceneIndex) {
    if (!this.app?.currentAnalysis?.scenes) {
        console.warn('No analysis data available');
        return;
    }
    
    if (sceneIndex < 0 || sceneIndex >= this.app.currentAnalysis.scenes.length) {
        console.warn(`Invalid scene index: ${sceneIndex}`);
        return;
    }
    
    const scene = this.app.currentAnalysis.scenes[sceneIndex];
    // Now safe to proceed...
}
```