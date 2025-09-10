# Code Quality and Performance Issues

## Issue #7: Inconsistent Error Handling (MEDIUM)

**Severity**: Medium  
**Type**: Code Quality  
**Component**: Multiple files  

### Description
The application uses inconsistent error handling patterns across different components, making debugging difficult and user experience unpredictable.

### Inconsistent Patterns

1. **Mix of Error Display Methods**
```javascript
// main.js - Uses alerts
alert('No analysis data to export');

// main.js - Uses console.error + alert  
console.error('Export error:', error);
alert(`Export failed: ${error.message}`);

// main.js - Custom error display
this.showError(`Error processing file: ${error.message}`);

// pdfExtractor.js - Throws errors
throw new Error(`Failed to extract text from PDF: ${error.message}`);
```

2. **Inconsistent Promise Handling**
```javascript
// Some places use try/catch
try {
    const result = await someAsyncOperation();
} catch (error) {
    console.error('Error:', error);
}

// Others use .catch()
someAsyncOperation()
    .catch(error => alert('Error: ' + error.message));

// Some have no error handling at all
const result = await riskyOperation(); // Could throw
```

### Recommended Solution
Implement centralized error handling:

```javascript
class ErrorHandler {
    constructor(options = {}) {
        this.options = {
            showUserMessages: true,
            logToConsole: true,
            logToService: false,
            ...options
        };
    }
    
    handle(error, context = {}) {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };
        
        if (this.options.logToConsole) {
            console.error('Application Error:', errorInfo);
        }
        
        if (this.options.showUserMessages) {
            this.showUserError(errorInfo);
        }
        
        if (this.options.logToService) {
            this.logToService(errorInfo);
        }
    }
    
    showUserError(errorInfo) {
        // Consistent user-facing error display
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = this.getUserFriendlyMessage(errorInfo);
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
    
    getUserFriendlyMessage(errorInfo) {
        // Convert technical errors to user-friendly messages
        const technicalMessage = errorInfo.message.toLowerCase();
        
        if (technicalMessage.includes('pdf')) {
            return 'There was a problem processing your PDF file. Please ensure it\'s a valid screenplay PDF.';
        }
        
        if (technicalMessage.includes('network') || technicalMessage.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        return 'An unexpected error occurred. Please try again or contact support.';
    }
}
```

---

## Issue #8: Magic Numbers and Hard-coded Values (LOW)

**Severity**: Low  
**Type**: Code Quality  
**Component**: models.js, textProcessor.js  

### Description
Magic numbers and hard-coded values are scattered throughout the code without explanation or centralized configuration.

### Examples

1. **models.js:165** - Word count calculation
```javascript
// ~250 words per page, so ~31 words per 1/8 page
const wordCount = this.content.split(/\s+/).length;
this.estimatedLength = Math.max(1, Math.round(wordCount / 31));
```

2. **textProcessor.js:167** - Chunk size
```javascript
chunkText(text, maxChunkSize = 5000) {
```

3. **pdfExtractor.js:174** - Position tolerance
```javascript
if (yDiff < 5) { // Same line tolerance
```

### Recommended Solution
Create a constants file and configuration system:

```javascript
// constants.js
export const SCREENPLAY_CONSTANTS = {
    ESTIMATION: {
        WORDS_PER_PAGE: 250,
        WORDS_PER_EIGHTH_PAGE: 31,
        MIN_SCENE_LENGTH: 1
    },
    
    PROCESSING: {
        MAX_CHUNK_SIZE: 5000,
        SAME_LINE_TOLERANCE: 5,
        PROGRESS_UPDATE_DELAY: 100
    },
    
    UI: {
        MODAL_CLOSE_DELAY: 5000,
        DOWNLOAD_STAGGER_DELAY: 100,
        ERROR_DISPLAY_DURATION: 5000
    },
    
    PDF: {
        POSITION_TOLERANCE: 5,
        MAX_GAP_FOR_SPACING: 10
    }
};

// Usage in models.js
import { SCREENPLAY_CONSTANTS } from './constants.js';

estimateLength() {
    if (!this.content) {
        this.estimatedLength = 0;
        return 0;
    }

    const wordCount = this.content.split(/\s+/).length;
    this.estimatedLength = Math.max(
        SCREENPLAY_CONSTANTS.ESTIMATION.MIN_SCENE_LENGTH, 
        Math.round(wordCount / SCREENPLAY_CONSTANTS.ESTIMATION.WORDS_PER_EIGHTH_PAGE)
    );
    
    return this.estimatedLength;
}
```