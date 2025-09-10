"""Test text processing utilities."""

import pytest
from src.utils.text_processing import (
    normalize_slugline, compute_scene_id, extract_int_ext, extract_time_raw,
    canonicalize_time, extract_scene_number, extract_location_components,
    round_to_eighth, generate_placeholder_scene_number, chunk_text
)
from src.models.scene import TimeCanonical


class TestSluglineProcessing:
    """Test slugline normalization and extraction."""
    
    def test_normalize_slugline(self):
        """Test slugline normalization."""
        assert normalize_slugline("EXT. GARDEN - DAY") == "EXT. GARDEN - DAY"
        assert normalize_slugline("  int.   house   -   night  ") == "INT. HOUSE - NIGHT"
        assert normalize_slugline("EXT. PARK — MORNING") == "EXT. PARK - MORNING"
        assert normalize_slugline("INT/EXT. CAR - DAY!!!") == "INT/EXT. CAR - DAY"
    
    def test_extract_int_ext(self):
        """Test INT/EXT extraction."""
        assert extract_int_ext("EXT. GARDEN - DAY") == "EXT"
        assert extract_int_ext("INT. HOUSE - NIGHT") == "INT"
        assert extract_int_ext("INT/EXT. CAR - DAY") == "INT/EXT"
        assert extract_int_ext("GARDEN - DAY") == "UNKNOWN"
    
    def test_extract_time_raw(self):
        """Test time extraction from sluglines."""
        assert extract_time_raw("EXT. GARDEN - DAY") == "DAY"
        assert extract_time_raw("INT. HOUSE - NIGHT") == "NIGHT"
        assert extract_time_raw("EXT. PARK - CONTINUOUS") == "CONTINUOUS"
        assert extract_time_raw("INT. OFFICE - LATER") == "LATER"
        assert extract_time_raw("EXT. GARDEN") == ""
    
    def test_canonicalize_time(self):
        """Test time canonicalization."""
        canonical, inferred = canonicalize_time("DAY")
        assert canonical == TimeCanonical.DAY
        assert not inferred
        
        canonical, inferred = canonicalize_time("CONTINUOUS")
        assert canonical == TimeCanonical.CONTINUOUS
        assert inferred
        
        canonical, inferred = canonicalize_time("LATER")
        assert canonical == TimeCanonical.LATER
        assert inferred
    
    def test_extract_scene_number(self):
        """Test scene number extraction."""
        assert extract_scene_number("1. EXT. GARDEN - DAY") == "1"
        assert extract_scene_number("EXT. GARDEN - DAY #2") == "2"
        assert extract_scene_number("SCENE 3A EXT. PARK") == "3A"
        assert extract_scene_number("EXT. GARDEN - DAY") == ""
    
    def test_extract_location_components(self):
        """Test location extraction."""
        master, sub = extract_location_components("EXT. GARDEN - DAY")
        assert master == "GARDEN"
        assert sub == ""
        
        master, sub = extract_location_components("INT. HOUSE - KITCHEN - DAY")
        assert master == "HOUSE"
        assert sub == "KITCHEN"


class TestSceneIdGeneration:
    """Test scene ID generation."""
    
    def test_compute_scene_id(self):
        """Test deterministic scene ID computation."""
        # Same inputs should produce same ID
        id1 = compute_scene_id("EXT. GARDEN - DAY", "1", "Alice walks", "test.pdf")
        id2 = compute_scene_id("EXT. GARDEN - DAY", "1", "Alice walks", "test.pdf")
        assert id1 == id2
        
        # Different inputs should produce different IDs
        id3 = compute_scene_id("INT. HOUSE - DAY", "1", "Alice walks", "test.pdf")
        assert id1 != id3
    
    def test_generate_placeholder_scene_number(self):
        """Test placeholder scene number generation."""
        # Same inputs should produce same placeholder
        placeholder1 = generate_placeholder_scene_number(1, "abc123def456")
        placeholder2 = generate_placeholder_scene_number(1, "abc123def456")
        assert placeholder1 == placeholder2
        
        # Different order should produce different placeholder
        placeholder3 = generate_placeholder_scene_number(2, "abc123def456")
        assert placeholder1 != placeholder3


class TestUtilityFunctions:
    """Test utility functions."""
    
    def test_round_to_eighth(self):
        """Test 1/8 page rounding."""
        assert round_to_eighth(0.1) == 0.125  # Minimum
        assert round_to_eighth(0.2) == 0.25
        assert round_to_eighth(0.3) == 0.375
        assert round_to_eighth(1.1) == 1.125
        assert round_to_eighth(2.0) == 2.0
    
    def test_chunk_text(self):
        """Test text chunking."""
        text = "a" * 1000
        chunks = chunk_text(text, chunk_size=300, overlap=50)
        
        assert len(chunks) > 1
        assert all(len(chunk[0]) <= 300 for chunk in chunks)
        
        # Check overlap
        if len(chunks) > 1:
            # Last part of first chunk should overlap with start of second chunk
            overlap_text = chunks[0][0][-50:]
            assert chunks[1][0].startswith(overlap_text)