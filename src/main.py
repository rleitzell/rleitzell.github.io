"""Main entry point for screenplay analyzer."""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add src to path for imports
sys.path.append(os.path.dirname(__file__))

from models.scene import ProcessingConfig
from core.pipeline import process_screenplay_file


def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('screenplay_analyzer.log')
        ]
    )


def load_config_from_env() -> ProcessingConfig:
    """Load configuration from environment variables."""
    load_dotenv()
    
    return ProcessingConfig(
        llm_provider=os.getenv('LLM_PROVIDER', 'openai'),
        model_name=os.getenv('MODEL_NAME', 'gpt-3.5-turbo'),
        api_key=os.getenv('OPENAI_API_KEY') or os.getenv('ANTHROPIC_API_KEY'),
        local_endpoint=os.getenv('LOCAL_LLM_ENDPOINT'),
        chunk_size=int(os.getenv('CHUNK_SIZE', '2500')),
        overlap=int(os.getenv('OVERLAP', '300')),
        layout_enhancement=os.getenv('LAYOUT_ENHANCEMENT', 'true').lower() == 'true'
    )


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Screenplay Analyzer - Convert PDF screenplays to structured data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py process script.pdf --output ./results
  python main.py process script.pdf --provider anthropic --model claude-3-sonnet-20240229
  python main.py process script.pdf --no-layout --chunk-size 3000
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Process command
    process_parser = subparsers.add_parser('process', help='Process a screenplay PDF')
    process_parser.add_argument('pdf_path', help='Path to PDF screenplay file')
    process_parser.add_argument('--output', '-o', default='./output', 
                               help='Output directory (default: ./output)')
    process_parser.add_argument('--provider', choices=['openai', 'anthropic', 'local'],
                               help='LLM provider (overrides env)')
    process_parser.add_argument('--model', help='Model name (overrides env)')
    process_parser.add_argument('--api-key', help='API key (overrides env)')
    process_parser.add_argument('--chunk-size', type=int, default=2500,
                               help='Chunk size in tokens (default: 2500)')
    process_parser.add_argument('--overlap', type=int, default=300,
                               help='Chunk overlap in tokens (default: 300)')
    process_parser.add_argument('--no-layout', action='store_true',
                               help='Disable layout enhancement')
    process_parser.add_argument('--first-chars', type=int, default=200,
                               help='First N chars for scene ID hashing (default: 200)')
    process_parser.add_argument('--fuzzy-threshold', type=float, default=0.85,
                               help='Fuzzy matching threshold (default: 0.85)')
    
    # Config command
    config_parser = subparsers.add_parser('config', help='Show current configuration')
    
    # Global options
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'config':
        config = load_config_from_env()
        print("Current Configuration:")
        print(f"  LLM Provider: {config.llm_provider}")
        print(f"  Model: {config.model_name}")
        print(f"  API Key: {'***' if config.api_key else 'Not set'}")
        print(f"  Chunk Size: {config.chunk_size}")
        print(f"  Overlap: {config.overlap}")
        print(f"  Layout Enhancement: {config.layout_enhancement}")
        print(f"  Fuzzy Threshold: {config.fuzzy_similarity_threshold}")
        return
    
    if args.command == 'process':
        # Validate input file
        pdf_path = Path(args.pdf_path)
        if not pdf_path.exists():
            logger.error(f"PDF file not found: {pdf_path}")
            sys.exit(1)
        
        if not pdf_path.suffix.lower() == '.pdf':
            logger.error(f"Input file must be a PDF: {pdf_path}")
            sys.exit(1)
        
        # Load base config and apply CLI overrides
        config = load_config_from_env()
        
        if args.provider:
            config.llm_provider = args.provider
        if args.model:
            config.model_name = args.model
        if args.api_key:
            config.api_key = args.api_key
        
        config.chunk_size = args.chunk_size
        config.overlap = args.overlap
        config.layout_enhancement = not args.no_layout
        config.first_chars_for_hash = args.first_chars
        config.fuzzy_similarity_threshold = args.fuzzy_threshold
        
        # Validate API key
        if not config.api_key and config.llm_provider in ['openai', 'anthropic']:
            logger.error(f"API key required for {config.llm_provider}. Set via --api-key or environment variable.")
            sys.exit(1)
        
        logger.info(f"Processing {pdf_path} with {config.llm_provider} ({config.model_name})")
        
        # Process screenplay
        try:
            results = await process_screenplay_file(str(pdf_path), args.output, config)
            
            if results["success"]:
                print("\n✅ Processing completed successfully!")
                print("\n📊 Statistics:")
                stats = results["statistics"]
                print(f"  Total scenes: {stats['total_scenes']}")
                print(f"  Total pages: {stats['total_pages']}")
                print(f"  Chunks processed: {stats['chunks_processed']}")
                print(f"  Flagged for review: {stats['flagged_for_review']}")
                print(f"  Avg chars per page: {stats['avg_chars_per_page']:.1f}")
                print(f"  Extraction method: {stats['extraction_method']}")
                
                print("\n📁 Export files:")
                for format_name, path in results["export_paths"].items():
                    print(f"  {format_name}: {path}")
                
                if stats['flagged_for_review'] > 0:
                    print(f"\n⚠️  {stats['flagged_for_review']} scenes flagged for review")
                    print("   Consider using the GUI for manual review and corrections")
            else:
                print(f"\n❌ Processing failed: {results['error']}")
                sys.exit(1)
                
        except KeyboardInterrupt:
            logger.info("Processing interrupted by user")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())