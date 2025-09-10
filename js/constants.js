/**
 * Application constants and configuration values
 * Extracted to eliminate magic numbers and centralize configuration
 */

const SCREENPLAY_CONSTANTS = {
    // Estimation constants for scene length calculations
    ESTIMATION: {
        WORDS_PER_PAGE: 250,
        WORDS_PER_EIGHTH_PAGE: 31,
        MIN_SCENE_LENGTH: 1,
        DEFAULT_SCENE_LENGTH: 1
    },
    
    // Text processing configuration
    PROCESSING: {
        MAX_CHUNK_SIZE: 5000,
        SAME_LINE_TOLERANCE: 5,
        PROGRESS_UPDATE_DELAY: 100,
        MAX_GAP_FOR_SPACING: 10
    },
    
    // UI timing and behavior constants
    UI: {
        MODAL_CLOSE_DELAY: 5000,
        DOWNLOAD_STAGGER_DELAY: 100,
        ERROR_DISPLAY_DURATION: 5000,
        PROGRESS_ANIMATION_DELAY: 100,
        DRAG_DROP_ENABLE_DELAY: 100
    },
    
    // PDF processing configuration
    PDF: {
        POSITION_TOLERANCE: 5,
        MAX_PAGES_WARNING: 200,
        DEFAULT_VIEWPORT_SCALE: 1.5
    },
    
    // Content validation limits
    VALIDATION: {
        MAX_SCENE_NUMBER: 9999,
        MIN_SCENE_NUMBER: 1,
        MAX_SLUGLINE_LENGTH: 200,
        MAX_CHARACTER_NAME_LENGTH: 50,
        MAX_LOCATION_NAME_LENGTH: 100,
        MAX_CONTENT_PREVIEW_LENGTH: 300
    },
    
    // Time of day options for scenes
    TIME_OF_DAY_OPTIONS: [
        'DAY',
        'NIGHT', 
        'DAWN',
        'DUSK',
        'CONTINUOUS',
        'LATER'
    ],
    
    // File type validation
    FILE_TYPES: {
        SUPPORTED_PDF_TYPE: 'application/pdf',
        MAX_FILE_SIZE_MB: 50
    }
};

// Make constants immutable
Object.freeze(SCREENPLAY_CONSTANTS.ESTIMATION);
Object.freeze(SCREENPLAY_CONSTANTS.PROCESSING);
Object.freeze(SCREENPLAY_CONSTANTS.UI);
Object.freeze(SCREENPLAY_CONSTANTS.PDF);
Object.freeze(SCREENPLAY_CONSTANTS.VALIDATION);
Object.freeze(SCREENPLAY_CONSTANTS.TIME_OF_DAY_OPTIONS);
Object.freeze(SCREENPLAY_CONSTANTS.FILE_TYPES);
Object.freeze(SCREENPLAY_CONSTANTS);

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SCREENPLAY_CONSTANTS
    };
}