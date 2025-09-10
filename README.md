# Screenplay Analyzer

A comprehensive LLM-powered tool for analyzing PDF screenplays and converting them to structured data with rich metadata.

## Features

- PDF text extraction with optional layout enhancement
- LLM-powered scene detection and analysis
- Deterministic scene ID generation with scene number support
- Character and location canonicalization
- Time-of-day inference and bulk operations
- Comprehensive CSV export with 1/8-page precision
- GUI for review, grouping, and manual corrections
- Mapping import/export for reusable canonicalization

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### CLI
```bash
python src/main.py process_screenplay input.pdf --output results.csv
```

### Web GUI
```bash
python -m uvicorn src.app:app --reload --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000

## Project Structure

- `src/` - Main application code
  - `core/` - Core pipeline components
  - `gui/` - Web interface
  - `models/` - Data models and schemas
  - `utils/` - Utility functions
- `tests/` - Test suite
- `examples/` - Sample screenplays and outputs
- `docs/` - Documentation

## Testing

```bash
pytest tests/
```

## Configuration

Create a `.env` file with your LLM API keys:

```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```
