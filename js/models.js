/**
 * Data models for screenplay analysis
 */

class Scene {
    constructor(data = {}) {
        this.id = data.id || null;
        this.number = data.number || null;
        this.slugline = data.slugline || '';
        this.location = data.location || '';
        this.timeOfDay = data.timeOfDay || '';
        this.content = data.content || '';
        this.characters = data.characters || [];
        this.pageNumber = data.pageNumber || null;
        this.startPosition = data.startPosition || null;
        this.endPosition = data.endPosition || null;
        this.estimatedLength = data.estimatedLength || 0; // in 1/8 page units
    }

    /**
     * Generate deterministic scene ID based on content hash
     */
    generateId() {
        const content = `${this.number || 'unknown'}_${this.location}_${this.timeOfDay}`;
        this.id = this.hashCode(content);
        return this.id;
    }

    /**
     * Simple hash function for deterministic IDs
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Parse slugline to extract location and time of day
     */
    parseSlugline() {
        if (!this.slugline) return;

        // Common screenplay slugline patterns
        const patterns = [
            // INT./EXT. LOCATION - TIME
            /^(INT\.|EXT\.)\s+([^-]+)\s*-\s*(.+)$/i,
            // LOCATION - TIME
            /^([^-]+)\s*-\s*(.+)$/i
        ];

        for (const pattern of patterns) {
            const match = this.slugline.match(pattern);
            if (match) {
                if (match.length === 4) {
                    // INT./EXT. pattern
                    this.location = match[2].trim();
                    this.timeOfDay = match[3].trim();
                } else if (match.length === 3) {
                    // Simple location - time pattern
                    this.location = match[1].trim();
                    this.timeOfDay = match[2].trim();
                }
                break;
            }
        }

        // Normalize time of day
        this.timeOfDay = this.normalizeTimeOfDay(this.timeOfDay);
    }

    /**
     * Normalize time of day to standard values
     */
    normalizeTimeOfDay(time) {
        if (!time) return '';
        
        const timeStr = time.toLowerCase().trim();
        
        // Time mappings
        const timeMap = {
            'day': 'DAY',
            'night': 'NIGHT',
            'dawn': 'DAWN',
            'dusk': 'DUSK',
            'morning': 'MORNING',
            'afternoon': 'AFTERNOON',
            'evening': 'EVENING',
            'continuous': 'CONTINUOUS',
            'later': 'LATER',
            'same time': 'SAME TIME'
        };

        // Direct mapping
        if (timeMap[timeStr]) {
            return timeMap[timeStr];
        }

        // Partial matching
        for (const [key, value] of Object.entries(timeMap)) {
            if (timeStr.includes(key)) {
                return value;
            }
        }

        return time.toUpperCase();
    }

    /**
     * Extract character names from scene content
     */
    extractCharacters() {
        if (!this.content) return [];

        const characters = new Set();
        
        // Match character names (typically all caps followed by dialogue)
        const characterPattern = /^\s*([A-Z][A-Z\s\-'.]{1,30})\s*$/gm;
        let match;
        
        while ((match = characterPattern.exec(this.content)) !== null) {
            const name = match[1].trim();
            
            // Filter out common non-character elements
            if (!this.isNonCharacterElement(name)) {
                characters.add(name);
            }
        }

        this.characters = Array.from(characters);
        return this.characters;
    }

    /**
     * Check if a name is likely not a character
     */
    isNonCharacterElement(name) {
        const nonCharacterWords = [
            'FADE', 'CUT', 'DISSOLVE', 'SMASH', 'MATCH', 'INSERT', 'CLOSE',
            'WIDE', 'MEDIUM', 'TIGHT', 'ANGLE', 'SHOT', 'MONTAGE', 'SERIES',
            'VARIOUS', 'LATER', 'MEANWHILE', 'ELSEWHERE', 'BACK', 'REVERSE',
            'POV', 'POINT OF VIEW', 'TITLE', 'END', 'BEGIN', 'START'
        ];

        return nonCharacterWords.some(word => 
            name.includes(word) || name.length < 2 || name.length > 30
        );
    }

    /**
     * Estimate scene length in 1/8 page units
     */
    estimateLength() {
        if (!this.content) {
            this.estimatedLength = 0;
            return 0;
        }

        // Basic estimation: ~250 words per page, so ~31 words per 1/8 page
        const wordCount = this.content.split(/\s+/).length;
        this.estimatedLength = Math.max(1, Math.round(wordCount / 31));
        
        return this.estimatedLength;
    }

    /**
     * Convert to JSON-serializable object
     */
    toJSON() {
        return {
            id: this.id,
            number: this.number,
            slugline: this.slugline,
            location: this.location,
            timeOfDay: this.timeOfDay,
            content: this.content,
            characters: this.characters,
            pageNumber: this.pageNumber,
            startPosition: this.startPosition,
            endPosition: this.endPosition,
            estimatedLength: this.estimatedLength
        };
    }
}

class Character {
    constructor(name) {
        this.name = name;
        this.scenes = [];
        this.totalAppearances = 0;
    }

    addScene(sceneId) {
        if (!this.scenes.includes(sceneId)) {
            this.scenes.push(sceneId);
            this.totalAppearances++;
        }
    }

    toJSON() {
        return {
            name: this.name,
            scenes: this.scenes,
            totalAppearances: this.totalAppearances
        };
    }
}

class Location {
    constructor(name) {
        this.name = name;
        this.scenes = [];
        this.totalUses = 0;
    }

    addScene(sceneId) {
        if (!this.scenes.includes(sceneId)) {
            this.scenes.push(sceneId);
            this.totalUses++;
        }
    }

    toJSON() {
        return {
            name: this.name,
            scenes: this.scenes,
            totalUses: this.totalUses
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Scene, Character, Location };
}