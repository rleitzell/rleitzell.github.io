"""Main pipeline orchestrator for screenplay analysis."""

import logging
import asyncio
from typing import List, Dict, Any, Tuple
from pathlib import Path
import sys
import os

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.scene import Scene, ProcessingConfig, ChunkResult
from core.pdf_extractor import extract_pdf_text
from core.llm_connector import create_llm_connector
from core.aggregator import SceneAggregator
from core.exporter import export_scenes
from utils.text_processing import chunk_text

logger = logging.getLogger(__name__)


class ScreenplayProcessor:
    """Main processor for screenplay analysis pipeline."""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.llm_connector = create_llm_connector(config)
    
    async def process_screenplay(self, pdf_path: Path, output_dir: Path) -> Dict[str, Any]:
        """Process a screenplay PDF through the complete pipeline."""
        pdf_path = Path(pdf_path)
        output_dir = Path(output_dir)
        
        logger.info(f"Starting screenplay processing: {pdf_path}")
        
        try:
            # Step 1: Extract PDF text
            logger.info("Extracting PDF text...")
            pages_text, pdf_metadata = extract_pdf_text(pdf_path, self.config)
            logger.info(f"Extracted {len(pages_text)} pages")
            
            # Step 2: Chunk text for LLM processing
            logger.info("Chunking text...")
            full_text = "\n\n".join([f"PAGE {i+1}:\n{text}" for i, text in enumerate(pages_text)])
            chunks = chunk_text(full_text, self.config.chunk_size, self.config.overlap)
            logger.info(f"Created {len(chunks)} chunks")
            
            # Step 3: Process chunks with LLM
            logger.info("Processing chunks with LLM...")
            chunk_results = await self._process_chunks(chunks, pages_text)
            logger.info(f"Processed {len(chunk_results)} chunks")
            
            # Step 4: Aggregate scenes
            logger.info("Aggregating scenes...")
            aggregator = SceneAggregator(
                self.config, pages_text, pdf_metadata, pdf_path.stem
            )
            scenes = aggregator.aggregate_scenes(chunk_results)
            logger.info(f"Final scene count: {len(scenes)}")
            
            # Step 5: Export results
            logger.info("Exporting results...")
            export_paths = export_scenes(scenes, output_dir, pdf_path.stem)
            
            # Compile results
            results = {
                "success": True,
                "scenes": scenes,
                "export_paths": export_paths,
                "statistics": {
                    "total_scenes": len(scenes),
                    "total_pages": len(pages_text),
                    "chunks_processed": len(chunk_results),
                    "flagged_for_review": sum(1 for s in scenes if s.flagged_for_review),
                    "avg_chars_per_page": pdf_metadata.get('average_chars_per_page', 0),
                    "extraction_method": pdf_metadata.get('extraction_method', 'unknown')
                },
                "pdf_metadata": pdf_metadata
            }
            
            logger.info("Screenplay processing completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Screenplay processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "scenes": [],
                "export_paths": {},
                "statistics": {},
                "pdf_metadata": {}
            }
    
    async def _process_chunks(self, chunks: List[Tuple[str, int, int]], 
                            pages_text: List[str]) -> List[ChunkResult]:
        """Process text chunks with LLM."""
        chunk_results = []
        
        for i, (chunk_text, start_pos, end_pos) in enumerate(chunks):
            chunk_id = f"chunk_{i:03d}"
            
            # Estimate which pages this chunk covers
            pages_covered = self._estimate_chunk_pages(chunk_text, pages_text)
            
            try:
                result = await self.llm_connector.analyze_chunk(
                    chunk_text, pages_covered, chunk_id
                )
                chunk_results.append(result)
                
                logger.info(f"Processed {chunk_id}: {len(result.scenes)} scenes found")
                
            except Exception as e:
                logger.error(f"Failed to process {chunk_id}: {e}")
                # Create empty result for failed chunk
                result = ChunkResult(
                    chunk_id=chunk_id,
                    scenes=[],
                    pages_covered=pages_covered,
                    processing_time=0.0
                )
                chunk_results.append(result)
        
        return chunk_results
    
    def _estimate_chunk_pages(self, chunk_text: str, pages_text: List[str]) -> List[int]:
        """Estimate which pages a chunk covers."""
        pages_covered = []
        
        # Look for "PAGE X:" markers in chunk
        import re
        page_markers = re.findall(r'PAGE (\d+):', chunk_text)
        if page_markers:
            pages_covered = [int(p) for p in page_markers]
        else:
            # Fallback: estimate based on text content
            for i, page_text in enumerate(pages_text, 1):
                if page_text[:100] in chunk_text or chunk_text[:100] in page_text:
                    pages_covered.append(i)
        
        return pages_covered or [1]


async def process_screenplay_file(pdf_path: str, output_dir: str = "./output", 
                                config: ProcessingConfig = None) -> Dict[str, Any]:
    """Convenience function to process a screenplay file."""
    if config is None:
        config = ProcessingConfig()
    
    processor = ScreenplayProcessor(config)
    return await processor.process_screenplay(Path(pdf_path), Path(output_dir))


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Process screenplay PDF")
    parser.add_argument("pdf_path", help="Path to PDF file")
    parser.add_argument("--output", "-o", default="./output", help="Output directory")
    parser.add_argument("--provider", choices=["openai", "anthropic", "local"], 
                       default="openai", help="LLM provider")
    parser.add_argument("--model", default="gpt-3.5-turbo", help="Model name")
    parser.add_argument("--api-key", help="API key for LLM provider")
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Create config
    config = ProcessingConfig(
        llm_provider=args.provider,
        model_name=args.model,
        api_key=args.api_key
    )
    
    # Process screenplay
    async def main():
        results = await process_screenplay_file(args.pdf_path, args.output, config)
        
        if results["success"]:
            print(f"✅ Processing completed successfully!")
            print(f"📊 Statistics:")
            for key, value in results["statistics"].items():
                print(f"  {key}: {value}")
            print(f"📁 Export files:")
            for format_name, path in results["export_paths"].items():
                print(f"  {format_name}: {path}")
        else:
            print(f"❌ Processing failed: {results['error']}")
    
    asyncio.run(main())