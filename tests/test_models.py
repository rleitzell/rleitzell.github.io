"""Test scene data models."""

import pytest
from src.models.scene import (
    Scene, LLMSceneOutput, ProcessingConfig, CSVRow,
    IntExtType, TimeCanonical, CanonicalSuggestions, Confidences, Provenance
)


class TestSceneModel:
    """Test Scene data model."""
    
    def test_scene_creation(self):
        """Test basic scene creation."""
        scene = Scene(
            scene_id="test123",
            scene_label="Test Scene",
            order=1,
            slugline_raw="EXT. GARDEN - DAY",
            slugline_normalized="EXT. GARDEN - DAY",
            int_ext=IntExtType.EXT,
            time_raw="DAY",
            time_canonical=TimeCanonical.DAY,
            scene_number_raw="1",
            scene_number_canonical="1",
            page_start=1,
            raw_length_pages=1.2,
            rounded_length_pages=1.25,
            page_end_float=2.25,
            page_end_int=3,
            master_location_raw="GARDEN",
            master_location_canonical="GARDEN",
            appearance_count=2,
            speaking_count=1,
            one_liner="Alice walks in garden",
            full_scene_text="EXT. GARDEN - DAY\nAlice walks...",
            scene_chars=30,
            confidences=Confidences(
                confidence_overall=0.9,
                start_page_confidence=0.8,
                length_confidence=0.7
            ),
            provenance=Provenance(
                start_page_source="substring_match",
                length_source="layout"
            )
        )
        
        assert scene.scene_id == "test123"
        assert scene.int_ext == IntExtType.EXT
        assert scene.time_canonical == TimeCanonical.DAY
        assert scene.appearance_count == 2
    
    def test_llm_scene_output(self):
        """Test LLM scene output model."""
        llm_output = LLMSceneOutput(
            slugline_raw="EXT. GARDEN - DAY",
            full_scene_text="EXT. GARDEN - DAY\nAlice walks through flowers.",
            one_liner="Alice walks in garden"
        )
        
        assert llm_output.slugline_raw == "EXT. GARDEN - DAY"
        assert llm_output.continuation is False  # Default
        assert llm_output.scene_chars is None    # Optional


class TestProcessingConfig:
    """Test processing configuration."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = ProcessingConfig()
        
        assert config.chunk_size == 2500
        assert config.overlap == 300
        assert config.first_chars_for_hash == 200
        assert config.include_scene_number_in_hash is True
        assert config.layout_enhancement is True
        assert config.llm_provider == "openai"
    
    def test_custom_config(self):
        """Test custom configuration."""
        config = ProcessingConfig(
            chunk_size=3000,
            llm_provider="anthropic",
            model_name="claude-3-sonnet",
            layout_enhancement=False
        )
        
        assert config.chunk_size == 3000
        assert config.llm_provider == "anthropic"
        assert config.model_name == "claude-3-sonnet"
        assert config.layout_enhancement is False


class TestCSVRow:
    """Test CSV export model."""
    
    def test_csv_row_creation(self):
        """Test CSV row creation with field aliases."""
        row = CSVRow(
            header="EXT. GARDEN - DAY",
            int_or_ext="EXT",
            time="DAY",
            scene_number="1",
            page=1,
            length=1.25,
            order=1,
            master_location="GARDEN",
            sub_location="",
            character_count=2,
            one_liner_description="Alice walks in garden"
        )
        
        # Test field access
        assert row.header == "EXT. GARDEN - DAY"
        assert row.length == 1.25
        
        # Test alias conversion
        row_dict = row.model_dump(by_alias=True)
        assert "Header" in row_dict
        assert "INT or EXT" in row_dict
        assert "Character Count" in row_dict