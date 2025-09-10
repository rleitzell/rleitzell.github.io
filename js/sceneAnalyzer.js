/**
 * Scene analysis and aggregation
 */

class SceneAnalyzer {
    constructor() {
        this.textProcessor = new TextProcessor();
        this.scenes = [];
        this.characters = new Map();
        this.locations = new Map();
    }

    /**
     * Analyze extracted text and identify scenes
     */
    async analyzeText(extractedData) {
        try {
            if (!extractedData || !extractedData.text) {
                throw new Error('No text data to analyze');
            }

            // Process text to extract scenes
            const rawScenes = this.textProcessor.processText(extractedData.text);
            
            // Validate and clean scenes
            this.scenes = rawScenes.filter(scene => 
                this.textProcessor.validateScene(scene)
            );

            // Process characters and locations
            this.processCharactersAndLocations();

            // Handle duplicate scene numbers
            this.resolveDuplicateScenes();

            return {
                scenes: this.scenes,
                characters: Array.from(this.characters.values()),
                locations: Array.from(this.locations.values()),
                summary: this.generateSummary()
            };

        } catch (error) {
            console.error('Scene analysis error:', error);
            throw error;
        }
    }

    /**
     * Process characters and locations from scenes
     */
    processCharactersAndLocations() {
        this.characters.clear();
        this.locations.clear();

        for (const scene of this.scenes) {
            // Process characters
            for (const characterName of scene.characters) {
                if (!this.characters.has(characterName)) {
                    this.characters.set(characterName, new Character(characterName));
                }
                this.characters.get(characterName).addScene(scene.id);
            }

            // Process locations
            if (scene.location) {
                const locationKey = scene.location.toUpperCase();
                if (!this.locations.has(locationKey)) {
                    this.locations.set(locationKey, new Location(scene.location));
                }
                this.locations.get(locationKey).addScene(scene.id);
            }
        }
    }

    /**
     * Handle scenes with duplicate or missing scene numbers
     */
    resolveDuplicateScenes() {
        const sceneNumberMap = new Map();
        const duplicates = [];

        // Identify duplicates and missing numbers
        for (const scene of this.scenes) {
            if (scene.number) {
                if (sceneNumberMap.has(scene.number)) {
                    duplicates.push(scene);
                } else {
                    sceneNumberMap.set(scene.number, scene);
                }
            }
        }

        // Handle duplicates by adding suffix
        for (const duplicate of duplicates) {
            let suffix = 'A';
            let newNumber = `${duplicate.number}${suffix}`;
            
            while (sceneNumberMap.has(newNumber)) {
                suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
                newNumber = `${duplicate.number}${suffix}`;
            }
            
            duplicate.number = newNumber;
            sceneNumberMap.set(newNumber, duplicate);
        }

        // Assign numbers to scenes without them
        let nextNumber = 1;
        for (const scene of this.scenes) {
            if (!scene.number) {
                while (sceneNumberMap.has(nextNumber)) {
                    nextNumber++;
                }
                scene.number = nextNumber;
                sceneNumberMap.set(nextNumber, scene);
                nextNumber++;
            }
        }

        // Re-sort scenes by number
        this.scenes.sort((a, b) => {
            const aNum = parseInt(a.number) || 0;
            const bNum = parseInt(b.number) || 0;
            return aNum - bNum;
        });
    }

    /**
     * Generate analysis summary
     */
    generateSummary() {
        const totalLength = this.scenes.reduce((sum, scene) => 
            sum + scene.estimatedLength, 0
        );

        const averageSceneLength = this.scenes.length > 0 
            ? totalLength / this.scenes.length 
            : 0;

        const characterCount = this.characters.size;
        const locationCount = this.locations.size;

        // Find most used locations
        const topLocations = Array.from(this.locations.values())
            .sort((a, b) => b.totalUses - a.totalUses)
            .slice(0, 5);

        // Find characters with most appearances
        const topCharacters = Array.from(this.characters.values())
            .sort((a, b) => b.totalAppearances - a.totalAppearances)
            .slice(0, 10);

        return {
            totalScenes: this.scenes.length,
            totalLength: totalLength,
            averageSceneLength: Math.round(averageSceneLength * 100) / 100,
            characterCount: characterCount,
            locationCount: locationCount,
            topLocations: topLocations,
            topCharacters: topCharacters,
            estimatedPages: Math.round(totalLength / 8 * 100) / 100
        };
    }

    /**
     * Get scenes by criteria
     */
    getScenes(criteria = {}) {
        let filteredScenes = [...this.scenes];

        if (criteria.location) {
            filteredScenes = filteredScenes.filter(scene =>
                scene.location && scene.location.toLowerCase().includes(criteria.location.toLowerCase())
            );
        }

        if (criteria.character) {
            filteredScenes = filteredScenes.filter(scene =>
                scene.characters.some(char => 
                    char.toLowerCase().includes(criteria.character.toLowerCase())
                )
            );
        }

        if (criteria.timeOfDay) {
            filteredScenes = filteredScenes.filter(scene =>
                scene.timeOfDay && scene.timeOfDay.toLowerCase().includes(criteria.timeOfDay.toLowerCase())
            );
        }

        if (criteria.minLength) {
            filteredScenes = filteredScenes.filter(scene =>
                scene.estimatedLength >= criteria.minLength
            );
        }

        if (criteria.maxLength) {
            filteredScenes = filteredScenes.filter(scene =>
                scene.estimatedLength <= criteria.maxLength
            );
        }

        return filteredScenes;
    }

    /**
     * Get character analysis
     */
    getCharacterAnalysis(characterName) {
        const character = this.characters.get(characterName);
        if (!character) {
            return null;
        }

        const characterScenes = this.scenes.filter(scene =>
            character.scenes.includes(scene.id)
        );

        const totalScreenTime = characterScenes.reduce((sum, scene) =>
            sum + scene.estimatedLength, 0
        );

        const locations = new Set(
            characterScenes
                .filter(scene => scene.location)
                .map(scene => scene.location)
        );

        const timesOfDay = new Set(
            characterScenes
                .filter(scene => scene.timeOfDay)
                .map(scene => scene.timeOfDay)
        );

        return {
            character: character,
            scenes: characterScenes,
            totalScreenTime: totalScreenTime,
            locations: Array.from(locations),
            timesOfDay: Array.from(timesOfDay),
            averageSceneLength: characterScenes.length > 0 
                ? totalScreenTime / characterScenes.length 
                : 0
        };
    }

    /**
     * Get location analysis
     */
    getLocationAnalysis(locationName) {
        const locationKey = locationName.toUpperCase();
        const location = this.locations.get(locationKey);
        if (!location) {
            return null;
        }

        const locationScenes = this.scenes.filter(scene =>
            location.scenes.includes(scene.id)
        );

        const totalScreenTime = locationScenes.reduce((sum, scene) =>
            sum + scene.estimatedLength, 0
        );

        const characters = new Set();
        locationScenes.forEach(scene => {
            scene.characters.forEach(char => characters.add(char));
        });

        const timesOfDay = new Set(
            locationScenes
                .filter(scene => scene.timeOfDay)
                .map(scene => scene.timeOfDay)
        );

        return {
            location: location,
            scenes: locationScenes,
            totalScreenTime: totalScreenTime,
            characters: Array.from(characters),
            timesOfDay: Array.from(timesOfDay),
            averageSceneLength: locationScenes.length > 0 
                ? totalScreenTime / locationScenes.length 
                : 0
        };
    }

    /**
     * Export analysis data
     */
    exportData(format = 'json') {
        const data = {
            scenes: this.scenes.map(scene => scene.toJSON()),
            characters: Array.from(this.characters.values()).map(char => char.toJSON()),
            locations: Array.from(this.locations.values()).map(loc => loc.toJSON()),
            summary: this.generateSummary(),
            metadata: {
                exportDate: new Date().toISOString(),
                format: format,
                version: '1.0'
            }
        };

        return data;
    }

    /**
     * Update analysis data after scene modifications (Phase 2)
     */
    updateAnalysisData(analysisData) {
        if (!analysisData || !analysisData.scenes) {
            console.warn('Invalid analysis data provided for update');
            return;
        }

        // Update scenes
        this.scenes = analysisData.scenes;

        // Rebuild characters and locations from updated scenes
        this.characters.clear();
        this.locations.clear();
        this.processCharactersAndLocations();

        // Update the analysis data object
        analysisData.characters = Array.from(this.characters.values());
        analysisData.locations = Array.from(this.locations.values());
        analysisData.summary = this.generateSummary();

        console.log('Analysis data updated with new scene information');
    }

    /**
     * Clear all data
     */
    clear() {
        this.scenes = [];
        this.characters.clear();
        this.locations.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneAnalyzer;
}