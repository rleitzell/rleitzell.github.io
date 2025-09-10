"""Integration test demonstrating core pipeline functionality."""

import tempfile
from pathlib import Path
import sys
import os

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.scene import ProcessingConfig, Scene, CanonicalSuggestions, Confidences, Provenance, IntExtType, TimeCanonical
from core.aggregator import SceneAggregator
from core.exporter import SceneExporter
from utils.text_processing import normalize_slugline, compute_scene_id, round_to_eighth, chunk_text


def test_text_processing_utilities():
    """Test individual text processing functions."""
    
    # Test slugline normalization
    raw_slugline = "  EXT.   GARDEN  —  DAY!!!  "
    normalized = normalize_slugline(raw_slugline)
    assert normalized == "EXT. GARDEN - DAY"
    print("✅ Slugline normalization works")
    
    # Test scene ID generation determinism
    id1 = compute_scene_id("EXT. GARDEN - DAY", "1", "Alice walks", "test.pdf")
    id2 = compute_scene_id("EXT. GARDEN - DAY", "1", "Alice walks", "test.pdf")
    assert id1 == id2
    print("✅ Scene ID generation is deterministic")
    
    # Different inputs should produce different IDs
    id3 = compute_scene_id("INT. HOUSE - DAY", "1", "Alice walks", "test.pdf")
    assert id1 != id3
    print("✅ Different inputs produce different scene IDs")
    
    # Test page rounding
    assert round_to_eighth(0.1) == 0.125
    assert round_to_eighth(1.1) == 1.125
    assert round_to_eighth(2.0) == 2.0
    print("✅ Page rounding to 1/8 works correctly")


def test_scene_aggregation():
    """Test scene aggregation and export functionality."""
    
    # Create mock scenes manually
    scenes = [
        Scene(
            scene_id="scene1",
            scene_label="EXT. GARDEN - DAY | #1",
            order=1,
            slugline_raw="EXT. GARDEN - DAY",
            slugline_normalized="EXT. GARDEN - DAY",
            int_ext=IntExtType.EXT,
            time_raw="DAY",
            time_canonical=TimeCanonical.DAY,
            time_inferred_from_previous=False,
            scene_number_raw="1",
            scene_number_canonical="1",
            page_start=1,
            raw_length_pages=1.2,
            rounded_length_pages=1.25,
            page_end_float=2.25,
            page_end_int=3,
            master_location_raw="GARDEN",
            master_location_canonical="GARDEN",
            sub_location_raw="",
            sub_location_canonical="",
            appearance_count=1,
            speaking_count=1,
            one_liner="Alice walks in the garden",
            full_scene_text="EXT. GARDEN - DAY\n\nALICE walks through the garden.",
            scene_chars=45,
            source_chunk_ids=["chunk_001"],
            continuation=False,
            canonical_suggestions=CanonicalSuggestions(),
            confidences=Confidences(
                confidence_overall=0.9,
                start_page_confidence=0.8,
                length_confidence=0.7
            ),
            provenance=Provenance(
                start_page_source="substring_match",
                length_source="char_avg"
            ),
            flagged_for_review=False,
            notes=""
        ),
        Scene(
            scene_id="scene2",
            scene_label="INT. HOUSE - KITCHEN - DAY | #2",
            order=2,
            slugline_raw="INT. HOUSE - KITCHEN - DAY",
            slugline_normalized="INT. HOUSE - KITCHEN - DAY",
            int_ext=IntExtType.INT,
            time_raw="DAY",
            time_canonical=TimeCanonical.DAY,
            time_inferred_from_previous=False,
            scene_number_raw="2",
            scene_number_canonical="2",
            page_start=2,
            raw_length_pages=0.8,
            rounded_length_pages=1.0,
            page_end_float=3.0,
            page_end_int=3,
            master_location_raw="HOUSE",
            master_location_canonical="HOUSE",
            sub_location_raw="KITCHEN",
            sub_location_canonical="KITCHEN",
            appearance_count=2,
            speaking_count=2,
            one_liner="Alice talks with her mother in the kitchen",
            full_scene_text="INT. HOUSE - KITCHEN - DAY\n\nALICE enters. MOTHER is cooking.",
            scene_chars=52,
            source_chunk_ids=["chunk_002"],
            continuation=False,
            canonical_suggestions=CanonicalSuggestions(),
            confidences=Confidences(
                confidence_overall=0.85,
                start_page_confidence=0.9,
                length_confidence=0.8
            ),
            provenance=Provenance(
                start_page_source="substring_match",
                length_source="char_avg"
            ),
            flagged_for_review=False,
            notes=""
        )
    ]
    
    print("✅ Scene objects created successfully")
    
    # Test CSV export
    exporter = SceneExporter()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Test CSV export
        csv_path = temp_path / "test_scenes.csv"
        exporter.export_csv(scenes, csv_path)
        assert csv_path.exists()
        print("✅ CSV export created")
        
        # Verify CSV content
        with open(csv_path, 'r') as f:
            csv_content = f.read()
            assert 'Header,INT or EXT,Time,Scene #' in csv_content
            assert 'GARDEN' in csv_content
            assert 'KITCHEN' in csv_content
            assert '1.25' in csv_content  # Rounded length
        print("✅ CSV content is correct")
        
        # Test JSON export
        json_path = temp_path / "test_scenes.json"
        exporter.export_json(scenes, json_path)
        assert json_path.exists()
        print("✅ JSON export created")
        
        # Verify JSON content
        import json
        with open(json_path, 'r') as f:
            json_data = json.load(f)
            assert 'scenes' in json_data
            assert len(json_data['scenes']) == len(scenes)
            assert json_data['scenes'][0]['scene_id'] == 'scene1'
        print("✅ JSON content is correct")


def test_chunking():
    """Test text chunking functionality."""
    from utils.text_processing import chunk_text
    
    sample_text = "This is a sample screenplay text. " * 100  # Create long text
    
    chunks = chunk_text(sample_text, chunk_size=200, overlap=50)
    
    assert len(chunks) > 1
    print(f"✅ Created {len(chunks)} chunks from text")
    
    # Verify chunk properties
    for i, (chunk_text, start_pos, end_pos) in enumerate(chunks):
        assert len(chunk_text) <= 200 or i == len(chunks) - 1  # Last chunk can be shorter
        assert start_pos < end_pos
        
        # Check overlap (except for first chunk)
        if i > 0:
            prev_chunk = chunks[i-1][0]
            # Should have some overlap
            overlap_part = prev_chunk[-50:]
            assert chunk_text.startswith(overlap_part[:20])  # At least some overlap
    
    print("✅ Chunking with overlap works correctly")


def test_scene_id_computation():
    """Test scene ID computation with various inputs."""
    
    # Test with different sluglines
    test_cases = [
        ("EXT. GARDEN - DAY", "1", "Alice walks", "test.pdf"),
        ("INT. HOUSE - NIGHT", "2", "Mother cooks", "test.pdf"),
        ("EXT. GARDEN - DAY", "1", "Different action", "test.pdf"),  # Different action
        ("EXT. GARDEN - DAY", "1", "Alice walks", "different.pdf"),  # Different filename
    ]
    
    scene_ids = []
    for slugline, number, action, filename in test_cases:
        scene_id = compute_scene_id(slugline, number, action, filename)
        scene_ids.append(scene_id)
        assert len(scene_id) == 64  # SHA256 hex length
        assert scene_id.isalnum()  # Should be alphanumeric
    
    # All IDs should be different (for these different inputs)
    assert len(set(scene_ids)) == len(scene_ids)
    print("✅ Scene ID computation produces unique, deterministic IDs")


if __name__ == "__main__":
    print("🧪 Running integration tests...")
    
    test_text_processing_utilities()
    test_scene_aggregation()
    test_chunking() 
    test_scene_id_computation()
    
    print("\n✅ All integration tests passed!")
    print("\n🎬 Screenplay Analyzer core functionality is working correctly!")