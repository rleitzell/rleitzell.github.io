# Screenplay Analysis Tool

A comprehensive web-based tool for extracting and analyzing scenes from screenplay PDFs. This tool processes screenplay documents to identify scenes, characters, locations, and provides detailed analysis with export capabilities.

![Screenplay Analysis Tool](https://github.com/user-attachments/assets/4ba207fe-858d-4705-adf1-0c685cfc4ec2)

## Features

### Core Pipeline (Phase 1) ✅
- **PDF Text Extraction**: Uses PDF.js to extract text from screenplay PDFs
- **Scene Detection**: Automatically identifies scene breaks using slugline patterns
- **Character Recognition**: Extracts character names from dialogue
- **Location Analysis**: Identifies and categorizes shooting locations
- **Time Canonicalization**: Normalizes time-of-day indicators
- **Length Estimation**: Calculates scene lengths in 1/8-page units
- **Deterministic Scene IDs**: Generates consistent scene identifiers
- **CSV/JSON Export**: Multiple export formats for further analysis
- **Comprehensive Testing**: Full test suite with 95%+ pass rate

### User Interface
- **Drag & Drop Upload**: Simple file upload interface
- **Real-time Progress**: Visual progress indicators during processing
- **Tabbed Results**: Organized display of scenes, characters, and locations
- **Interactive Demo**: Built-in sample analysis demonstration
- **Responsive Design**: Works on desktop and mobile devices

![Demo Analysis Results](https://github.com/user-attachments/assets/e8e2d81f-f5ac-4d2a-9058-3bb64c303293)

## Quick Start

### Online Usage
Visit the live demo at: [https://rleitzell.github.io](https://rleitzell.github.io)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/rleitzell/rleitzell.github.io.git
   cd rleitzell.github.io
   ```

2. Start a local web server:
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server
   ```

3. Open your browser to `http://localhost:8000`

## Usage

### Main Application
1. **Upload Screenplay**: Drag and drop a PDF screenplay file or click to select
2. **Processing**: Watch real-time progress as the tool extracts and analyzes content
3. **Review Results**: Browse scenes, characters, and locations in tabbed interface
4. **Export Data**: Download analysis as CSV or JSON for further processing

### Interactive Demo
Visit `/demo.html` to see the tool in action with a sample screenplay text.

### Testing
Run the comprehensive test suite at `/tests/` to verify functionality.

![Test Results](https://github.com/user-attachments/assets/87c8463d-f0d0-4aa7-bfb6-776e0aee48a7)

## Technical Architecture

### Core Modules
- **`models.js`**: Data models for Scene, Character, and Location entities
- **`textProcessor.js`**: Text parsing and scene extraction logic
- **`pdfExtractor.js`**: PDF processing using PDF.js library
- **`sceneAnalyzer.js`**: Scene analysis and aggregation engine
- **`exportUtils.js`**: Data export utilities for CSV/JSON/XML
- **`main.js`**: Main application controller and UI logic

### Data Models

#### Scene
```javascript
{
  id: "deterministic-hash",
  number: 1,
  slugline: "INT. COFFEE SHOP - DAY",
  location: "COFFEE SHOP",
  timeOfDay: "DAY",
  characters: ["SARAH", "MIKE"],
  content: "Scene dialogue and action...",
  estimatedLength: 2, // in 1/8 page units
  pageNumber: 1
}
```

#### Character
```javascript
{
  name: "SARAH",
  scenes: ["scene-id-1", "scene-id-2"],
  totalAppearances: 2
}
```

#### Location
```javascript
{
  name: "COFFEE SHOP",
  scenes: ["scene-id-1", "scene-id-2"],
  totalUses: 2
}
```

## Analysis Features

### Scene Detection
- Recognizes standard slugline formats (INT./EXT. LOCATION - TIME)
- Handles scene numbers and variations
- Processes multiple screenplay formatting styles
- Resolves duplicate scene numbers automatically

### Character Extraction
- Identifies character names from dialogue formatting
- Filters out non-character elements (camera directions, etc.)
- Tracks character appearances across scenes
- Provides character-based scene analysis

### Location Analysis
- Extracts locations from sluglines
- Normalizes location names
- Tracks location usage frequency
- Supports location-based filtering

### Export Capabilities
- **CSV Export**: Scenes, characters, and locations as separate CSV files
- **JSON Export**: Complete analysis data in structured format
- **XML Export**: Alternative structured format
- **Batch Export**: Download multiple formats simultaneously

## Testing

The project includes a comprehensive test suite covering:
- Data model functionality
- Text processing algorithms
- Scene analysis logic
- Export utilities
- Integration scenarios

Run tests by visiting `/tests/` in your browser.

## Future Enhancements (Roadmap)

### Phase 2: GUI and Mapping Workflow
- [ ] Enhanced scene review interface
- [ ] Drag/drop grouping for characters/locations
- [ ] Duplicate scene number resolution UI
- [ ] Mapping import/export functionality

### Phase 3: Layout Enhancement
- [ ] Advanced PDF layout analysis
- [ ] Bounding box-based page calculations
- [ ] Layout-derived length computations

### Phase 4: Advanced Features
- [ ] Multi-language support
- [ ] Collaborative editing
- [ ] Version comparison
- [ ] Integration with screenplay software

## Browser Compatibility

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires JavaScript enabled and modern browser support for:
- PDF.js library
- File API
- ES6+ features

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- PDF.js library for PDF processing
- Screenplay formatting standards
- Community feedback and testing
