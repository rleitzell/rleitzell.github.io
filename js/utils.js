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

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        safeJoin,
        createSafeTextNode
    };
}