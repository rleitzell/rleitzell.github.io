/**
 * Utility functions for security and common operations
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} unsafe - The unsafe string that may contain HTML
 * @returns {string} - The escaped string safe for innerHTML
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return String(unsafe || '');
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Safely joins an array of strings with HTML escaping
 * @param {Array} arr - Array of strings to join
 * @param {string} separator - Separator to use (default: ', ')
 * @returns {string} - Escaped and joined string
 */
function safeJoin(arr, separator = ', ') {
    if (!Array.isArray(arr)) {
        return '';
    }
    
    return arr.map(item => escapeHtml(item)).join(separator);
}

/**
 * Creates a text node instead of innerHTML for safer DOM manipulation
 * @param {string} text - Text content
 * @returns {Text} - Text node
 */
function createSafeTextNode(text) {
    return document.createTextNode(text || '');
}

/**
 * Centralized Error Handler for consistent error handling across the application
 */
class ErrorHandler {
    constructor(options = {}) {
        this.options = {
            showUserMessages: true,
            logToConsole: true,
            logToService: false,
            ...options
        };
    }
    
    /**
     * Handle error with context and consistent user experience
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Additional context information
     */
    handle(error, context = {}) {
        const errorInfo = {
            message: error.message || error || 'Unknown error',
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
    
    /**
     * Show user-friendly error message
     * @param {Object} errorInfo - Error information object
     */
    showUserError(errorInfo) {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        
        // Create error notification element
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong style="display: block; margin-bottom: 5px;">Error</strong>
                    <span>${escapeHtml(userMessage)}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; margin-left: 10px;">×</button>
            </div>
        `;
        
        // Add CSS animation if not already present
        if (!document.querySelector('#error-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'error-notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    /**
     * Convert technical error messages to user-friendly ones
     * @param {Object} errorInfo - Error information
     * @returns {string} - User-friendly error message
     */
    getUserFriendlyMessage(errorInfo) {
        const technicalMessage = errorInfo.message.toLowerCase();
        
        if (technicalMessage.includes('pdf')) {
            return 'There was a problem processing your PDF file. Please ensure it\'s a valid screenplay PDF.';
        }
        
        if (technicalMessage.includes('network') || technicalMessage.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        if (technicalMessage.includes('permission') || technicalMessage.includes('access')) {
            return 'Permission denied. Please check your browser settings and try again.';
        }
        
        if (technicalMessage.includes('invalid') || technicalMessage.includes('malformed')) {
            return 'The file format is not supported or the data is corrupted.';
        }
        
        if (technicalMessage.includes('timeout')) {
            return 'The operation took too long. Please try again with a smaller file.';
        }
        
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
    
    /**
     * Log to external service (placeholder for future implementation)
     * @param {Object} errorInfo - Error information
     */
    logToService(errorInfo) {
        // Future implementation: send to logging service
        console.log('Would log to service:', errorInfo);
    }
}

// Create global error handler instance
window.errorHandler = new ErrorHandler();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        safeJoin,
        createSafeTextNode,
        ErrorHandler
    };
}