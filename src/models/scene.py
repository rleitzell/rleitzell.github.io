"""Core data models for screenplay analysis."""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from enum import Enum


class IntExtType(str, Enum):
    """Interior/Exterior classification."""
    INT = "INT"
    EXT = "EXT"
    INT_EXT = "INT/EXT"
    UNKNOWN = "UNKNOWN"


class TimeCanonical(str, Enum):
    """Canonical time-of-day values."""
    MORNING = "MORNING"
    DAY = "DAY"
    AFTERNOON = "AFTERNOON"
    EVENING = "EVENING"
    DUSK = "DUSK"
    DAWN = "DAWN"
    NIGHT = "NIGHT"
    CONTINUOUS = "CONTINUOUS"
    LATER = "LATER"
    SAME_AS_PREVIOUS = "SAME_AS_PREVIOUS"
    UNKNOWN = "UNKNOWN"


class CanonicalSuggestion(BaseModel):
    """Suggested canonical mapping with confidence."""
    raw: str
    suggested: str
    confidence: float = Field(ge=0.0, le=1.0)


class LocationSuggestion(BaseModel):
    """Suggested location mapping with master/sub locations."""
    raw: str
    suggested_master: str
    suggested_sub: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)


class CanonicalSuggestions(BaseModel):
    """All canonical suggestions for a scene."""
    characters: List[CanonicalSuggestion] = []
    locations: List[LocationSuggestion] = []


class Confidences(BaseModel):
    """Confidence scores for various scene attributes."""
    confidence_overall: float = Field(ge=0.0, le=1.0)
    start_page_confidence: float = Field(ge=0.0, le=1.0)
    length_confidence: float = Field(ge=0.0, le=1.0)


class Provenance(BaseModel):
    """Provenance information for scene attributes."""
    start_page_source: Literal["substring_match", "layout_match", "llm_estimate", "inferred_order"]
    length_source: Literal["layout", "char_avg", "llm_estimate"]
    llm_evidence: Optional[List[str]] = None
    layout_blocks_used: Optional[List[Dict[str, Any]]] = None


class Scene(BaseModel):
    """Complete scene model with all required fields."""
    
    # Core identification
    scene_id: str = Field(description="Hex SHA256 string (deterministic)")
    scene_label: str = Field(description="Human readable label")
    order: int = Field(description="Sequential order in document, starting at 1")
    
    # Slugline information
    slugline_raw: str = Field(description="Exact slugline text as found")
    slugline_normalized: str = Field(description="Normalized slugline")
    int_ext: IntExtType
    
    # Time information
    time_raw: str = Field(description="Raw time-of-day substring from slugline")
    time_canonical: TimeCanonical
    time_inferred_from_previous: bool = False
    
    # Scene numbers
    scene_number_raw: str = Field(description="Scene number as found in slugline")
    scene_number_canonical: str = Field(description="Final number after processing")
    
    # Page information
    page_start: int = Field(description="Start page number")
    raw_length_pages: float = Field(description="Unrounded fractional pages")
    rounded_length_pages: float = Field(description="Rounded to 1/8 increments")
    page_end_float: float = Field(description="page_start - 1 + rounded_length_pages")
    page_end_int: int = Field(description="ceil(page_end_float)")
    
    # Location information
    master_location_raw: str = Field(description="Raw location string")
    master_location_canonical: str = Field(description="Canonical master location")
    sub_location_raw: Optional[str] = Field(default="", description="Raw sub-location")
    sub_location_canonical: Optional[str] = Field(default="", description="Canonical sub-location")
    
    # Character counts
    appearance_count: int = Field(description="Characters featured in scene")
    speaking_count: int = Field(description="Unique speakers with dialogue")
    
    # Content
    one_liner: str = Field(description="Short single-sentence summary")
    full_scene_text: str = Field(description="Entire scene text as written")
    scene_chars: int = Field(description="len(full_scene_text)")
    
    # Processing metadata
    source_chunk_ids: List[str] = Field(default_factory=list)
    continuation: bool = Field(default=False, description="Scene continued/truncated in chunk")
    
    # AI suggestions and confidence
    canonical_suggestions: CanonicalSuggestions = Field(default_factory=CanonicalSuggestions)
    confidences: Confidences
    provenance: Provenance
    
    # Review flags
    flagged_for_review: bool = False
    notes: str = ""


class LLMSceneOutput(BaseModel):
    """Scene output from LLM (subset of full schema)."""
    slugline_raw: str
    full_scene_text: str
    scene_chars: Optional[int] = None
    llm_estimated_start_page: Optional[int] = None
    llm_start_offset_pct: Optional[float] = None
    continuation: bool = False
    suggested_canonicalizations: Optional[CanonicalSuggestions] = None
    one_liner: str
    time_continuous_inference: bool = False


class ChunkResult(BaseModel):
    """Result from processing a single chunk."""
    chunk_id: str
    scenes: List[LLMSceneOutput]
    pages_covered: List[int]
    processing_time: float
    token_count: Optional[int] = None


class ProcessingConfig(BaseModel):
    """Configuration for processing pipeline."""
    chunk_size: int = 2500
    overlap: int = 300
    first_chars_for_hash: int = 200
    include_scene_number_in_hash: bool = True
    fuzzy_similarity_threshold: float = 0.85
    layout_enhancement: bool = True
    auto_bulk_time_inference: bool = True
    
    # LLM settings
    llm_provider: Literal["openai", "anthropic", "local"] = "openai"
    model_name: str = "gpt-3.5-turbo"
    api_key: Optional[str] = None
    local_endpoint: Optional[str] = None


class CSVRow(BaseModel):
    """CSV export row format."""
    header: str = Field(alias="Header")
    int_or_ext: str = Field(alias="INT or EXT")
    time: str = Field(alias="Time")
    scene_number: str = Field(alias="Scene #")
    page: int = Field(alias="Page")
    length: float = Field(alias="Length")
    order: int = Field(alias="Order")
    master_location: str = Field(alias="Master Location")
    sub_location: str = Field(alias="Sub-Location")
    character_count: int = Field(alias="Character Count")
    one_liner_description: str = Field(alias="One-Liner Description")
    
    model_config = {"populate_by_name": True}