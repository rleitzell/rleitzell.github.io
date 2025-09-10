/**
 * PDF text extraction using PDF.js
 */

class PDFExtractor {
    constructor() {
        this.textProcessor = new TextProcessor();
        this.progressCallback = null;
        
        // Initialize PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    /**
     * Set progress callback for extraction process
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    /**
     * Extract text from PDF file
     */
    async extractTextFromPDF(file) {
        try {
            if (!file || file.type !== 'application/pdf') {
                throw new Error('Invalid PDF file');
            }

            this.updateProgress(0, 'Loading PDF...');

            // Read file as array buffer
            const arrayBuffer = await this.fileToArrayBuffer(file);
            
            this.updateProgress(10, 'Parsing PDF document...');

            // Load PDF document
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;

            this.updateProgress(20, `Extracting text from ${numPages} pages...`);

            // Extract text from all pages
            const textContent = [];
            
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContentObj = await page.getTextContent();
                
                // Extract text items and combine them
                const pageText = textContentObj.items
                    .map(item => item.str)
                    .join(' ');
                
                textContent.push(`\n--- PAGE ${pageNum} ---\n${pageText}`);
                
                // Update progress
                const progress = 20 + (pageNum / numPages) * 60;
                this.updateProgress(progress, `Processing page ${pageNum} of ${numPages}...`);
            }

            this.updateProgress(80, 'Cleaning and processing text...');

            // Combine all text and clean it
            const rawText = textContent.join('\n');
            const cleanedText = this.textProcessor.cleanText(rawText);

            this.updateProgress(90, 'Organizing content...');

            return {
                text: cleanedText,
                pageCount: numPages,
                wordCount: cleanedText.split(/\s+/).length,
                characterCount: cleanedText.length
            };

        } catch (error) {
            console.error('PDF extraction error:', error);
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    /**
     * Extract text with layout information (more advanced)
     */
    async extractTextWithLayout(file) {
        try {
            this.updateProgress(0, 'Loading PDF for layout analysis...');

            const arrayBuffer = await this.fileToArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;

            const pages = [];

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });

                // Organize text items by position
                const textItems = textContent.items.map(item => ({
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    width: item.width,
                    height: item.height,
                    fontName: item.fontName
                }));

                // Sort by Y position (top to bottom), then X position (left to right)
                textItems.sort((a, b) => {
                    const yDiff = Math.abs(a.y - b.y);
                    if (yDiff < 5) { // Same line tolerance
                        return a.x - b.x;
                    }
                    return b.y - a.y; // Reverse Y (PDF coordinates)
                });

                // Group into lines and reconstruct text
                const lines = this.groupTextIntoLines(textItems);
                const pageText = lines.join('\n');

                pages.push({
                    pageNumber: pageNum,
                    text: pageText,
                    viewport: {
                        width: viewport.width,
                        height: viewport.height
                    },
                    textItems: textItems
                });

                const progress = 10 + (pageNum / numPages) * 80;
                this.updateProgress(progress, `Analyzing layout of page ${pageNum}...`);
            }

            this.updateProgress(90, 'Combining pages...');

            // Combine all pages
            const combinedText = pages.map(p => 
                `\n--- PAGE ${p.pageNumber} ---\n${p.text}`
            ).join('\n');

            return {
                text: this.textProcessor.cleanText(combinedText),
                pages: pages,
                pageCount: numPages,
                wordCount: combinedText.split(/\s+/).length,
                characterCount: combinedText.length
            };

        } catch (error) {
            console.error('Layout extraction error:', error);
            throw error;
        }
    }

    /**
     * Group text items into lines based on position
     */
    groupTextIntoLines(textItems) {
        if (!textItems || textItems.length === 0) return [];

        const lines = [];
        let currentLine = [];
        let currentY = null;

        for (const item of textItems) {
            // Check if this item belongs to the current line
            if (currentY === null || Math.abs(item.y - currentY) < 5) {
                currentLine.push(item);
                currentY = item.y;
            } else {
                // Start new line
                if (currentLine.length > 0) {
                    lines.push(this.combineLineItems(currentLine));
                }
                currentLine = [item];
                currentY = item.y;
            }
        }

        // Don't forget the last line
        if (currentLine.length > 0) {
            lines.push(this.combineLineItems(currentLine));
        }

        return lines;
    }

    /**
     * Combine text items on the same line
     */
    combineLineItems(lineItems) {
        if (!lineItems || lineItems.length === 0) return '';

        // Sort by X position
        lineItems.sort((a, b) => a.x - b.x);

        // Combine text with appropriate spacing
        let lineText = '';
        let lastX = 0;
        let lastWidth = 0;

        for (const item of lineItems) {
            const gap = item.x - (lastX + lastWidth);
            
            // Add spacing if there's a significant gap
            if (lineText && gap > 10) {
                lineText += ' ';
            }
            
            lineText += item.text;
            lastX = item.x;
            lastWidth = item.width;
        }

        return lineText;
    }

    /**
     * Convert file to array buffer
     */
    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Update progress if callback is set
     */
    updateProgress(percentage, message) {
        if (this.progressCallback) {
            this.progressCallback(percentage, message);
        }
    }

    /**
     * Get basic PDF information without extracting all text
     */
    async getPDFInfo(file) {
        try {
            const arrayBuffer = await this.fileToArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            const info = await pdf.getMetadata();
            
            return {
                pageCount: pdf.numPages,
                title: info.info.Title || 'Unknown',
                author: info.info.Author || 'Unknown',
                subject: info.info.Subject || '',
                creator: info.info.Creator || '',
                producer: info.info.Producer || '',
                creationDate: info.info.CreationDate || null,
                modificationDate: info.info.ModDate || null
            };
        } catch (error) {
            console.error('PDF info extraction error:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFExtractor;
}