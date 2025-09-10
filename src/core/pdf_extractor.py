"""PDF text extraction with optional layout enhancement."""

import logging
from typing import List, Dict, Tuple, Optional, Any
from pathlib import Path
import sys
import os

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

from models.scene import ProcessingConfig

logger = logging.getLogger(__name__)


class PDFExtractor:
    """PDF text extraction with layout enhancement support."""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.layout_enhancement = config.layout_enhancement
        
    def extract_pages_text(self, pdf_path: Path) -> Tuple[List[str], Dict[str, Any]]:
        """Extract text from PDF pages.
        
        Returns:
            Tuple of (pages_text, metadata) where metadata includes
            per_page_char_count, average_chars_per_page, etc.
        """
        try:
            if self.layout_enhancement and fitz:
                return self._extract_with_layout(pdf_path)
            else:
                return self._extract_basic(pdf_path)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise
    
    def _extract_basic(self, pdf_path: Path) -> Tuple[List[str], Dict[str, Any]]:
        """Basic text extraction using pypdf."""
        if not pypdf:
            raise ImportError("pypdf is required for basic extraction")
        
        pages_text = []
        per_page_char_count = []
        
        with open(pdf_path, 'rb') as file:
            reader = pypdf.PdfReader(file)
            
            for page_num, page in enumerate(reader.pages):
                try:
                    text = page.extract_text()
                    pages_text.append(text)
                    per_page_char_count.append(len(text))
                except Exception as e:
                    logger.warning(f"Failed to extract page {page_num}: {e}")
                    pages_text.append("")
                    per_page_char_count.append(0)
        
        avg_chars_per_page = sum(per_page_char_count) / len(per_page_char_count) if per_page_char_count else 0
        
        metadata = {
            'per_page_char_count': per_page_char_count,
            'average_chars_per_page': avg_chars_per_page,
            'total_pages': len(pages_text),
            'extraction_method': 'basic',
            'layout_blocks': None
        }
        
        return pages_text, metadata
    
    def _extract_with_layout(self, pdf_path: Path) -> Tuple[List[str], Dict[str, Any]]:
        """Enhanced extraction with layout information using PyMuPDF."""
        if not fitz:
            raise ImportError("PyMuPDF (fitz) is required for layout extraction")
        
        pages_text = []
        per_page_char_count = []
        layout_blocks = []
        
        doc = fitz.open(pdf_path)
        
        try:
            for page_num in range(doc.page_count):
                page = doc[page_num]
                
                # Get text blocks with bounding boxes
                blocks = page.get_text("dict")
                page_text = ""
                page_blocks = []
                
                # Extract text from blocks
                for block in blocks.get("blocks", []):
                    if "lines" in block:  # Text block
                        block_text = ""
                        for line in block["lines"]:
                            for span in line["spans"]:
                                block_text += span["text"]
                            block_text += "\n"
                        
                        if block_text.strip():
                            bbox = block["bbox"]  # (x0, y0, x1, y1)
                            page_blocks.append({
                                "text": block_text.strip(),
                                "bbox": bbox,
                                "x0": bbox[0],
                                "y0": bbox[1],
                                "x1": bbox[2],
                                "y1": bbox[3]
                            })
                            page_text += block_text
                
                pages_text.append(page_text)
                per_page_char_count.append(len(page_text))
                layout_blocks.append(page_blocks)
        
        finally:
            doc.close()
        
        avg_chars_per_page = sum(per_page_char_count) / len(per_page_char_count) if per_page_char_count else 0
        
        metadata = {
            'per_page_char_count': per_page_char_count,
            'average_chars_per_page': avg_chars_per_page,
            'total_pages': len(pages_text),
            'extraction_method': 'layout',
            'layout_blocks': layout_blocks,
            'page_dimensions': self._get_page_dimensions(pdf_path) if fitz else None
        }
        
        return pages_text, metadata
    
    def _get_page_dimensions(self, pdf_path: Path) -> List[Tuple[float, float]]:
        """Get page dimensions for layout calculations."""
        dimensions = []
        doc = fitz.open(pdf_path)
        
        try:
            for page_num in range(doc.page_count):
                page = doc[page_num]
                rect = page.rect
                dimensions.append((rect.width, rect.height))
        finally:
            doc.close()
        
        return dimensions
    
    def find_text_in_pages(self, pages_text: List[str], search_text: str) -> List[Tuple[int, float]]:
        """Find text in pages and return (page_num, offset_pct) matches."""
        matches = []
        search_normalized = search_text.upper().strip()
        
        for page_num, page_text in enumerate(pages_text):
            page_normalized = page_text.upper()
            pos = page_normalized.find(search_normalized)
            
            if pos != -1:
                offset_pct = pos / len(page_text) if page_text else 0.0
                matches.append((page_num, offset_pct))
        
        return matches
    
    def find_text_in_layout(self, layout_blocks: List[List[Dict]], search_text: str, 
                           page_dimensions: List[Tuple[float, float]]) -> List[Tuple[int, float, Dict]]:
        """Find text in layout blocks and return detailed position info."""
        matches = []
        search_normalized = search_text.upper().strip()
        
        for page_num, page_blocks in enumerate(layout_blocks):
            for block in page_blocks:
                block_text = block["text"].upper()
                if search_normalized in block_text:
                    # Calculate offset percentage based on block position
                    page_height = page_dimensions[page_num][1] if page_num < len(page_dimensions) else 792
                    offset_pct = block["y0"] / page_height
                    
                    matches.append((page_num, offset_pct, block))
        
        return matches


def extract_pdf_text(pdf_path: Path, config: ProcessingConfig) -> Tuple[List[str], Dict[str, Any]]:
    """Convenience function for PDF text extraction."""
    extractor = PDFExtractor(config)
    return extractor.extract_pages_text(pdf_path)