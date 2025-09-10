# Screenplay Analyzer - Usage Guide

This guide demonstrates how to use the Screenplay Analyzer to process PDF screenplays into structured data.

## Quick Start

### 1. Web Interface (Recommended)

Start the web application:
```bash
python src/app.py
```

Then open http://localhost:8000 in your browser.

#### Features:
- **Upload Interface**: Drag & drop PDF files or click to browse
- **Configuration**: Set LLM provider, API keys, processing parameters
- **Scene Review**: Interactive review of detected scenes with filtering
- **Export**: Download CSV or JSON files with analysis results

### 2. Command Line Interface

Process a screenplay directly from the command line:

```bash
# Basic usage
python src/main.py process screenplay.pdf

# With custom settings
python src/main.py process screenplay.pdf \
  --provider openai \
  --model gpt-4 \
  --api-key YOUR_API_KEY \
  --output ./results \
  --chunk-size 3000

# Show configuration
python src/main.py config
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# LLM Provider Settings
LLM_PROVIDER=openai
MODEL_NAME=gpt-3.5-turbo
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Processing Settings
CHUNK_SIZE=2500
OVERLAP=300
LAYOUT_ENHANCEMENT=true
```

### LLM Providers

#### OpenAI
- **Models**: gpt-3.5-turbo, gpt-4, gpt-4-turbo
- **API Key**: Get from https://platform.openai.com/api-keys
- **Cost**: ~$0.01-0.10 per screenplay depending on length and model

#### Anthropic
- **Models**: claude-3-haiku-20240307, claude-3-sonnet-20240229, claude-3-opus-20240229
- **API Key**: Get from https://console.anthropic.com/
- **Cost**: ~$0.01-0.15 per screenplay depending on length and model

#### Local LLM
- **Setup**: Run a local LLM server (e.g., Ollama, llamafile, text-generation-webui)
- **Endpoint**: Usually http://localhost:8080/v1/chat/completions
- **Cost**: Free after initial setup
- **Performance**: Varies by hardware and model

## Output Formats

### CSV Export

Standard CSV format for spreadsheet analysis:

| Header | INT or EXT | Time | Scene # | Page | Length | Order | Master Location | Sub-Location | Character Count | One-Liner Description |
|--------|------------|------|---------|------|--------|-------|-----------------|--------------|-----------------|----------------------|
| EXT. GARDEN - DAY | EXT | DAY | 1 | 1 | 1.125 | 1 | GARDEN | | 2 | Alice walks through the garden |

### JSON Export

Comprehensive JSON with full metadata:

```json
{
  "scenes": [
    {
      "scene_id": "a1b2c3d4...",
      "order": 1,
      "slugline_raw": "EXT. GARDEN - DAY",
      "scene_number_canonical": "1",
      "page_start": 1,
      "rounded_length_pages": 1.125,
      "time_canonical": "DAY",
      "master_location_canonical": "GARDEN",
      "appearance_count": 2,
      "speaking_count": 1,
      "one_liner": "Alice walks through the garden",
      "confidences": {
        "confidence_overall": 0.9,
        "start_page_confidence": 0.8,
        "length_confidence": 0.7
      },
      "flagged_for_review": false
    }
  ],
  "metadata": {
    "total_scenes": 1,
    "export_format": "full",
    "schema_version": "1.0"
  }
}
```

## Processing Pipeline

The system follows this pipeline:

1. **PDF Extraction**: Extract text from PDF pages
2. **Text Chunking**: Split text into manageable chunks with overlap
3. **LLM Analysis**: Send chunks to LLM for scene detection
4. **Scene Aggregation**: Merge scene fragments using deterministic IDs
5. **Position Resolution**: Determine accurate page positions and lengths
6. **Canonicalization**: Normalize character names, locations, and times
7. **Export**: Generate CSV and JSON outputs

## Advanced Features

### Scene ID Generation

Each scene gets a deterministic SHA256 ID based on:
- Normalized slugline
- Scene number (if present)
- First 200 characters of following action
- Filename

This ensures scenes maintain consistent IDs across multiple runs.

### Character Counting

**Appearance Count**: Characters featured in action lines or sluglines
- ✅ Characters in action descriptions
- ✅ Characters mentioned in sluglines  
- ❌ Characters only mentioned in dialogue

**Speaking Count**: Unique speakers with full dialogue blocks
- ✅ Characters with dialogue lines
- ❌ Parenthetical-only attributions
- ❌ Voice-only (V.O./O.S.)

### Page Length Precision

All lengths use 1/8-page precision with ceiling rounding:
- 0.1 pages → 0.125 pages (minimum)
- 1.1 pages → 1.125 pages
- 2.3 pages → 2.375 pages

### Time Canonicalization

Raw times are mapped to canonical values:
- **Direct**: MORNING, DAY, AFTERNOON, EVENING, DUSK, DAWN, NIGHT
- **Relative**: CONTINUOUS, LATER, SAME_AS_PREVIOUS
- **Unknown**: When no time information is found

## Troubleshooting

### Common Issues

**PDF Not Processing**
- Ensure PDF contains extractable text (not scanned images)
- Try disabling layout enhancement for problematic PDFs

**Low Confidence Scores**
- Check if screenplay follows standard formatting
- Ensure clear sluglines (INT./EXT. + LOCATION + TIME)
- Review flagged scenes in the GUI

**API Rate Limits**
- Reduce chunk size to make fewer API calls
- Use local LLM for unlimited processing
- Wait between requests if hitting rate limits

**Memory Issues**
- Reduce chunk size for large screenplays
- Process in smaller batches
- Use layout enhancement selectively

### Getting Help

1. Check the configuration page for parameter explanations
2. Review flagged scenes in the GUI for manual corrections
3. Export JSON for detailed analysis and debugging
4. Test with the provided sample screenplay first

## Example Workflow

1. **Upload**: Drop your PDF screenplay on the web interface
2. **Configure**: Set your LLM provider and API key
3. **Process**: Click "Process Screenplay" and wait for completion
4. **Review**: Use the scene review interface to check results
5. **Correct**: Flag and correct any misidentified scenes
6. **Export**: Download CSV for production planning or JSON for further analysis

The system is designed to be accurate out of the box, but manual review ensures the highest quality results for critical production use.