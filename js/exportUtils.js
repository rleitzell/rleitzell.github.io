/**
 * Export utilities for screenplay analysis data
 */

class ExportUtils {
    constructor() {
        this.formats = ['csv', 'json', 'xml'];
    }

    /**
     * Export scenes to CSV format
     */
    exportScenesCSV(scenes, options = {}) {
        if (!scenes || scenes.length === 0) {
            throw new Error('No scenes to export');
        }

        const headers = [
            'Scene Number',
            'Location',
            'Time of Day',
            'Slugline',
            'Characters',
            'Estimated Length (1/8 pages)',
            'Page Number',
            'Content'
        ];

        // Add optional headers
        if (options.includeIds) {
            headers.unshift('Scene ID');
        }

        const csvRows = [headers.join(',')];

        for (const scene of scenes) {
            const row = [
                this.escapeCsvValue(scene.number || ''),
                this.escapeCsvValue(scene.location || ''),
                this.escapeCsvValue(scene.timeOfDay || ''),
                this.escapeCsvValue(scene.slugline || ''),
                this.escapeCsvValue(scene.characters.join('; ') || ''),
                scene.estimatedLength || 0,
                scene.pageNumber || '',
                this.escapeCsvValue(scene.content || '')
            ];

            if (options.includeIds) {
                row.unshift(this.escapeCsvValue(scene.id || ''));
            }

            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Export characters to CSV format
     */
    exportCharactersCSV(characters) {
        if (!characters || characters.length === 0) {
            throw new Error('No characters to export');
        }

        const headers = [
            'Character Name',
            'Total Appearances',
            'Scene IDs'
        ];

        const csvRows = [headers.join(',')];

        for (const character of characters) {
            const row = [
                this.escapeCsvValue(character.name),
                character.totalAppearances,
                this.escapeCsvValue(character.scenes.join('; '))
            ];

            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Export locations to CSV format
     */
    exportLocationsCSV(locations) {
        if (!locations || locations.length === 0) {
            throw new Error('No locations to export');
        }

        const headers = [
            'Location Name',
            'Total Uses',
            'Scene IDs'
        ];

        const csvRows = [headers.join(',')];

        for (const location of locations) {
            const row = [
                this.escapeCsvValue(location.name),
                location.totalUses,
                this.escapeCsvValue(location.scenes.join('; '))
            ];

            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Export complete analysis to JSON
     */
    exportAnalysisJSON(analysisData) {
        return JSON.stringify(analysisData, null, 2);
    }

    /**
     * Export analysis to XML format
     */
    exportAnalysisXML(analysisData) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<screenplay_analysis>\n';
        
        // Metadata
        if (analysisData.metadata) {
            xml += '  <metadata>\n';
            for (const [key, value] of Object.entries(analysisData.metadata)) {
                xml += `    <${key}>${this.escapeXml(value)}</${key}>\n`;
            }
            xml += '  </metadata>\n';
        }

        // Summary
        if (analysisData.summary) {
            xml += '  <summary>\n';
            for (const [key, value] of Object.entries(analysisData.summary)) {
                if (Array.isArray(value)) {
                    xml += `    <${key}>\n`;
                    for (const item of value) {
                        xml += `      <item>${this.escapeXml(JSON.stringify(item))}</item>\n`;
                    }
                    xml += `    </${key}>\n`;
                } else {
                    xml += `    <${key}>${this.escapeXml(value)}</${key}>\n`;
                }
            }
            xml += '  </summary>\n';
        }

        // Scenes
        xml += '  <scenes>\n';
        for (const scene of analysisData.scenes || []) {
            xml += '    <scene>\n';
            xml += `      <id>${this.escapeXml(scene.id)}</id>\n`;
            xml += `      <number>${this.escapeXml(scene.number)}</number>\n`;
            xml += `      <location>${this.escapeXml(scene.location)}</location>\n`;
            xml += `      <time_of_day>${this.escapeXml(scene.timeOfDay)}</time_of_day>\n`;
            xml += `      <slugline>${this.escapeXml(scene.slugline)}</slugline>\n`;
            xml += `      <estimated_length>${scene.estimatedLength}</estimated_length>\n`;
            xml += `      <page_number>${scene.pageNumber || ''}</page_number>\n`;
            xml += '      <characters>\n';
            for (const character of scene.characters || []) {
                xml += `        <character>${this.escapeXml(character)}</character>\n`;
            }
            xml += '      </characters>\n';
            xml += `      <content>${this.escapeXml(scene.content)}</content>\n`;
            xml += '    </scene>\n';
        }
        xml += '  </scenes>\n';

        // Characters
        xml += '  <characters>\n';
        for (const character of analysisData.characters || []) {
            xml += '    <character>\n';
            xml += `      <name>${this.escapeXml(character.name)}</name>\n`;
            xml += `      <total_appearances>${character.totalAppearances}</total_appearances>\n`;
            xml += '      <scenes>\n';
            for (const sceneId of character.scenes || []) {
                xml += `        <scene_id>${this.escapeXml(sceneId)}</scene_id>\n`;
            }
            xml += '      </scenes>\n';
            xml += '    </character>\n';
        }
        xml += '  </characters>\n';

        // Locations
        xml += '  <locations>\n';
        for (const location of analysisData.locations || []) {
            xml += '    <location>\n';
            xml += `      <name>${this.escapeXml(location.name)}</name>\n`;
            xml += `      <total_uses>${location.totalUses}</total_uses>\n`;
            xml += '      <scenes>\n';
            for (const sceneId of location.scenes || []) {
                xml += `        <scene_id>${this.escapeXml(sceneId)}</scene_id>\n`;
            }
            xml += '      </scenes>\n';
            xml += '    </location>\n';
        }
        xml += '  </locations>\n';

        xml += '</screenplay_analysis>';
        return xml;
    }

    /**
     * Download data as file
     */
    downloadFile(data, filename, mimeType = 'text/plain') {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
    }

    /**
     * Generate filename with timestamp
     */
    generateFilename(baseName, extension) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `${baseName}_${timestamp}.${extension}`;
    }

    /**
     * Escape CSV values
     */
    escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const stringValue = String(value);
        
        // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
    }

    /**
     * Escape XML values
     */
    escapeXml(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Create comprehensive export package
     */
    createExportPackage(analysisData, formats = ['csv', 'json']) {
        const exports = {};
        const baseName = 'screenplay_analysis';

        if (formats.includes('csv')) {
            exports.scenes_csv = {
                filename: this.generateFilename(baseName + '_scenes', 'csv'),
                data: this.exportScenesCSV(analysisData.scenes),
                mimeType: 'text/csv'
            };

            if (analysisData.characters && analysisData.characters.length > 0) {
                exports.characters_csv = {
                    filename: this.generateFilename(baseName + '_characters', 'csv'),
                    data: this.exportCharactersCSV(analysisData.characters),
                    mimeType: 'text/csv'
                };
            }

            if (analysisData.locations && analysisData.locations.length > 0) {
                exports.locations_csv = {
                    filename: this.generateFilename(baseName + '_locations', 'csv'),
                    data: this.exportLocationsCSV(analysisData.locations),
                    mimeType: 'text/csv'
                };
            }
        }

        if (formats.includes('json')) {
            exports.analysis_json = {
                filename: this.generateFilename(baseName + '_complete', 'json'),
                data: this.exportAnalysisJSON(analysisData),
                mimeType: 'application/json'
            };
        }

        if (formats.includes('xml')) {
            exports.analysis_xml = {
                filename: this.generateFilename(baseName + '_complete', 'xml'),
                data: this.exportAnalysisXML(analysisData),
                mimeType: 'application/xml'
            };
        }

        return exports;
    }

    /**
     * Download all exports in package
     */
    downloadExportPackage(analysisData, formats = ['csv', 'json']) {
        const exportPackage = this.createExportPackage(analysisData, formats);
        
        for (const [key, exportData] of Object.entries(exportPackage)) {
            setTimeout(() => {
                this.downloadFile(exportData.data, exportData.filename, exportData.mimeType);
            }, 100 * Object.keys(exportPackage).indexOf(key)); // Stagger downloads
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportUtils;
}