/**
 * Text processing utilities for screenplay analysis
 */

class TextProcessor {
    constructor() {
        this.sceneBreakPatterns = [
            // Standard sluglines
            /^(INT\.|EXT\.)\s+.+\s*-\s*.+$/i,
            // Scene numbers
            /^\s*\d+\s+(INT\.|EXT\.)/i,
            // Alternative patterns
            /^(INTERIOR|EXTERIOR)\s+.+\s*-\s*.+$/i
        ];
    }

    /**
     * Process raw text and extract scenes
     */
    processText(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const lines = text.split('\n');
        const scenes = [];
        let currentScene = null;
        let sceneContent = [];
        let pageNumber = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                if (currentScene) {
                    sceneContent.push('');
                }
                continue;
            }

            // Check for page breaks (common in PDFs)
            if (this.isPageBreak(line)) {
                pageNumber++;
                continue;
            }

            // Check if this line starts a new scene
            if (this.isSceneBreak(line)) {
                // Save previous scene if exists
                if (currentScene) {
                    currentScene.content = sceneContent.join('\n').trim();
                    currentScene.parseSlugline();
                    currentScene.extractCharacters();
                    currentScene.estimateLength();
                    currentScene.generateId();
                    scenes.push(currentScene);
                }

                // Start new scene
                currentScene = new Scene({
                    slugline: line,
                    pageNumber: pageNumber,
                    startPosition: i
                });

                // Try to extract scene number from the line
                const sceneNumber = this.extractSceneNumber(line, i, lines);
                if (sceneNumber) {
                    currentScene.number = sceneNumber;
                }

                sceneContent = [];
            } else if (currentScene) {
                // Add line to current scene content
                sceneContent.push(line);
            }
        }

        // Don't forget the last scene
        if (currentScene) {
            currentScene.content = sceneContent.join('\n').trim();
            currentScene.parseSlugline();
            currentScene.extractCharacters();
            currentScene.estimateLength();
            currentScene.generateId();
            scenes.push(currentScene);
        }

        return scenes;
    }

    /**
     * Check if a line indicates a scene break
     */
    isSceneBreak(line) {
        return this.sceneBreakPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if a line indicates a page break
     */
    isPageBreak(line) {
        const pageBreakPatterns = [
            /^\s*\d+\s*$/,  // Just a number
            /page\s+\d+/i,  // "Page 1", etc.
            /^\s*-\s*\d+\s*-\s*$/  // "- 1 -", etc.
        ];

        return pageBreakPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Extract scene number from slugline or surrounding context
     */
    extractSceneNumber(line, lineIndex, allLines) {
        // Pattern 1: Scene number at the beginning of slugline
        let match = line.match(/^\s*(\d+)\s*[A-Z]/);
        if (match) {
            return parseInt(match[1]);
        }

        // Pattern 2: Scene number on previous line
        if (lineIndex > 0) {
            const prevLine = allLines[lineIndex - 1].trim();
            match = prevLine.match(/^\s*(\d+)\s*$/);
            if (match) {
                return parseInt(match[1]);
            }
        }

        // Pattern 3: Scene number on next line
        if (lineIndex < allLines.length - 1) {
            const nextLine = allLines[lineIndex + 1].trim();
            match = nextLine.match(/^\s*(\d+)\s*$/);
            if (match) {
                return parseInt(match[1]);
            }
        }

        return null;
    }

    /**
     * Clean and normalize text content
     */
    cleanText(text) {
        if (!text) return '';

        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove common PDF artifacts
            .replace(/[^\x20-\x7E\n\r\t]/g, '')
            // Normalize line endings
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove multiple consecutive newlines
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Split text into manageable chunks for processing
     */
    chunkText(text, maxChunkSize = 5000) {
        if (!text || text.length <= maxChunkSize) {
            return [text || ''];
        }

        const chunks = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            // If adding this line would exceed the chunk size
            if (currentChunk.length + line.length + 1 > maxChunkSize) {
                // If we have accumulated content, save it as a chunk
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                
                // Start new chunk with current line
                currentChunk = line;
            } else {
                // Add line to current chunk
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }

        // Don't forget the last chunk
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Merge scenes from multiple chunks, handling overlaps
     */
    mergeScenes(sceneChunks) {
        if (!sceneChunks || sceneChunks.length === 0) {
            return [];
        }

        if (sceneChunks.length === 1) {
            return sceneChunks[0];
        }

        const mergedScenes = [];
        const sceneMap = new Map();

        // Process each chunk
        for (const scenes of sceneChunks) {
            for (const scene of scenes) {
                const key = `${scene.number || 'unknown'}_${scene.location}_${scene.timeOfDay}`;
                
                if (sceneMap.has(key)) {
                    // Merge with existing scene
                    const existingScene = sceneMap.get(key);
                    existingScene.content += '\n\n' + scene.content;
                    
                    // Merge characters
                    const allCharacters = new Set([...existingScene.characters, ...scene.characters]);
                    existingScene.characters = Array.from(allCharacters);
                    
                    // Update length estimate
                    existingScene.estimateLength();
                } else {
                    // Add new scene
                    sceneMap.set(key, scene);
                }
            }
        }

        return Array.from(sceneMap.values()).sort((a, b) => {
            // Sort by scene number if available, otherwise by page number
            const aNum = a.number || a.pageNumber || 0;
            const bNum = b.number || b.pageNumber || 0;
            return aNum - bNum;
        });
    }

    /**
     * Validate and clean a scene object
     */
    validateScene(scene) {
        if (!scene || typeof scene !== 'object') {
            return false;
        }

        // Ensure required fields exist
        if (!scene.slugline && !scene.content) {
            return false;
        }

        // Clean content
        if (scene.content) {
            scene.content = this.cleanText(scene.content);
        }

        // Ensure arrays are arrays
        if (!Array.isArray(scene.characters)) {
            scene.characters = [];
        }

        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextProcessor;
}