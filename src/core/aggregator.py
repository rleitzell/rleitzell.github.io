"""Scene aggregator for merging chunks and creating final scenes."""

import logging
import math
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
import sys
import os

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.scene import (
    Scene, LLMSceneOutput, ChunkResult, ProcessingConfig,
    IntExtType, TimeCanonical, CanonicalSuggestions, Confidences, Provenance
)
from utils.text_processing import (
    normalize_slugline, compute_scene_id, extract_int_ext, extract_time_raw,
    canonicalize_time, extract_scene_number, extract_location_components,
    round_to_eighth, generate_placeholder_scene_number, count_characters_in_scene
)

logger = logging.getLogger(__name__)


class SceneAggregator:
    """Aggregates and merges scenes from multiple chunks."""
    
    def __init__(self, config: ProcessingConfig, pages_text: List[str], 
                 pdf_metadata: Dict[str, Any], filename: str):
        self.config = config
        self.pages_text = pages_text
        self.pdf_metadata = pdf_metadata
        self.filename = filename
        self.avg_chars_per_page = pdf_metadata.get('average_chars_per_page', 250)
        
    def aggregate_scenes(self, chunk_results: List[ChunkResult]) -> List[Scene]:
        """Aggregate scenes from all chunks into final scene list."""
        logger.info(f"Aggregating scenes from {len(chunk_results)} chunks")
        
        # Step 1: Collect and normalize all scene fragments
        scene_fragments = self._collect_scene_fragments(chunk_results)
        
        # Step 2: Group fragments by scene_id
        grouped_scenes = self._group_scene_fragments(scene_fragments)
        
        # Step 3: Merge fragments within each group
        merged_scenes = self._merge_scene_groups(grouped_scenes)
        
        # Step 4: Resolve page positions and lengths
        positioned_scenes = self._resolve_positions(merged_scenes)
        
        # Step 5: Apply time canonicalization and bulk inference
        timed_scenes = self._apply_time_canonicalization(positioned_scenes)
        
        # Step 6: Handle scene number processing
        final_scenes = self._process_scene_numbers(timed_scenes)
        
        # Step 7: Sort by reading order
        final_scenes.sort(key=lambda s: s.order)
        
        logger.info(f"Final aggregation: {len(final_scenes)} scenes")
        return final_scenes
    
    def _collect_scene_fragments(self, chunk_results: List[ChunkResult]) -> List[Tuple[Scene, str]]:
        """Convert LLM outputs to Scene fragments with computed scene_ids."""
        fragments = []
        
        for chunk_result in chunk_results:
            for llm_scene in chunk_result.scenes:
                try:
                    # Normalize slugline
                    slugline_norm = normalize_slugline(llm_scene.slugline_raw)
                    
                    # Extract scene number
                    scene_number_raw = extract_scene_number(llm_scene.slugline_raw)
                    
                    # Get following text for scene_id computation
                    following_text = llm_scene.full_scene_text[len(llm_scene.slugline_raw):].strip()
                    
                    # Compute deterministic scene_id
                    scene_id = compute_scene_id(
                        slugline_norm, scene_number_raw, following_text, 
                        self.filename, self.config.first_chars_for_hash
                    )
                    
                    # Extract location components
                    master_loc, sub_loc = extract_location_components(llm_scene.slugline_raw)
                    
                    # Count characters
                    appearance_count, speaking_count = count_characters_in_scene(llm_scene.full_scene_text)
                    
                    # Create scene fragment
                    scene = Scene(
                        scene_id=scene_id,
                        scene_label=f"{slugline_norm} | #{scene_number_raw} | chunks:{chunk_result.chunk_id}",
                        order=0,  # Will be set later
                        slugline_raw=llm_scene.slugline_raw,
                        slugline_normalized=slugline_norm,
                        int_ext=IntExtType(extract_int_ext(llm_scene.slugline_raw)),
                        time_raw=extract_time_raw(llm_scene.slugline_raw),
                        time_canonical=TimeCanonical.UNKNOWN,  # Will be processed later
                        time_inferred_from_previous=False,
                        scene_number_raw=scene_number_raw,
                        scene_number_canonical=scene_number_raw or "PLACEHOLDER",
                        page_start=llm_scene.llm_estimated_start_page or 1,
                        raw_length_pages=0.0,  # Will be computed
                        rounded_length_pages=0.125,  # Will be computed
                        page_end_float=0.0,  # Will be computed
                        page_end_int=1,  # Will be computed
                        master_location_raw=master_loc,
                        master_location_canonical=master_loc,
                        sub_location_raw=sub_loc or "",
                        sub_location_canonical=sub_loc or "",
                        appearance_count=appearance_count,
                        speaking_count=speaking_count,
                        one_liner=llm_scene.one_liner,
                        full_scene_text=llm_scene.full_scene_text,
                        scene_chars=len(llm_scene.full_scene_text),
                        source_chunk_ids=[chunk_result.chunk_id],
                        continuation=llm_scene.continuation,
                        canonical_suggestions=llm_scene.suggested_canonicalizations or CanonicalSuggestions(),
                        confidences=Confidences(
                            confidence_overall=0.8,  # Default
                            start_page_confidence=0.6 if llm_scene.llm_estimated_start_page else 0.3,
                            length_confidence=0.5
                        ),
                        provenance=Provenance(
                            start_page_source="llm_estimate",
                            length_source="char_avg"
                        )
                    )
                    
                    fragments.append((scene, chunk_result.chunk_id))
                    
                except Exception as e:
                    logger.error(f"Failed to process scene fragment: {e}")
                    continue
        
        return fragments
    
    def _group_scene_fragments(self, fragments: List[Tuple[Scene, str]]) -> Dict[str, List[Scene]]:
        """Group scene fragments by scene_id."""
        groups = defaultdict(list)
        
        for scene, chunk_id in fragments:
            groups[scene.scene_id].append(scene)
        
        return dict(groups)
    
    def _merge_scene_groups(self, grouped_scenes: Dict[str, List[Scene]]) -> List[Scene]:
        """Merge scene fragments within each group."""
        merged_scenes = []
        
        for scene_id, fragments in grouped_scenes.items():
            if len(fragments) == 1:
                merged_scenes.append(fragments[0])
            else:
                # Merge multiple fragments
                merged = self._merge_fragments(fragments)
                merged_scenes.append(merged)
        
        return merged_scenes
    
    def _merge_fragments(self, fragments: List[Scene]) -> Scene:
        """Merge multiple scene fragments into one."""
        # Use the fragment with the longest full_scene_text as base
        base_scene = max(fragments, key=lambda s: len(s.full_scene_text))
        
        # Merge source_chunk_ids
        all_chunk_ids = []
        for fragment in fragments:
            all_chunk_ids.extend(fragment.source_chunk_ids)
        
        # Update base scene with merged info
        base_scene.source_chunk_ids = list(set(all_chunk_ids))
        base_scene.scene_label = f"{base_scene.slugline_normalized} | #{base_scene.scene_number_raw} | chunks:{','.join(all_chunk_ids)}"
        
        # Flag for review if there were conflicts
        if len(fragments) > 1:
            base_scene.flagged_for_review = True
            base_scene.notes = f"Merged from {len(fragments)} chunks"
        
        return base_scene
    
    def _resolve_positions(self, scenes: List[Scene]) -> List[Scene]:
        """Resolve page positions and lengths for scenes."""
        positioned_scenes = []
        
        for scene in scenes:
            # Try substring match first
            start_page, confidence, source = self._find_scene_start_page(scene)
            
            # Compute length
            raw_length, length_source = self._compute_scene_length(scene)
            rounded_length = round_to_eighth(raw_length)
            
            # Update scene with position info
            scene.page_start = start_page
            scene.raw_length_pages = raw_length
            scene.rounded_length_pages = rounded_length
            scene.page_end_float = start_page - 1 + rounded_length
            scene.page_end_int = math.ceil(scene.page_end_float)
            
            # Update confidence and provenance
            scene.confidences.start_page_confidence = confidence
            scene.confidences.length_confidence = 0.8 if length_source == "layout" else 0.6
            scene.provenance.start_page_source = source
            scene.provenance.length_source = length_source
            
            positioned_scenes.append(scene)
        
        # Set order based on page_start and position within page
        positioned_scenes.sort(key=lambda s: (s.page_start, s.slugline_raw))
        for i, scene in enumerate(positioned_scenes, 1):
            scene.order = i
        
        return positioned_scenes
    
    def _find_scene_start_page(self, scene: Scene) -> Tuple[int, float, str]:
        """Find the start page for a scene."""
        # Try substring match in pages_text
        search_text = scene.slugline_normalized[:50]  # First 50 chars for search
        
        for page_num, page_text in enumerate(self.pages_text, 1):
            if search_text in page_text.upper():
                return page_num, 1.0, "substring_match"
        
        # Try layout match if available
        if self.pdf_metadata.get('layout_blocks'):
            layout_match = self._find_in_layout_blocks(scene.slugline_normalized)
            if layout_match:
                return layout_match[0], 1.0, "layout_match"
        
        # Use LLM estimate if confidence is high enough
        llm_page = scene.page_start
        llm_confidence = scene.confidences.start_page_confidence
        if llm_confidence > 0.65:
            return llm_page, llm_confidence, "llm_estimate"
        
        # Fallback to order-based inference
        return 1, 0.3, "inferred_order"
    
    def _find_in_layout_blocks(self, slugline_norm: str) -> Optional[Tuple[int, float]]:
        """Find slugline in layout blocks."""
        layout_blocks = self.pdf_metadata.get('layout_blocks', [])
        page_dimensions = self.pdf_metadata.get('page_dimensions', [])
        
        for page_num, page_blocks in enumerate(layout_blocks):
            for block in page_blocks:
                if slugline_norm[:30] in block.get('text', '').upper():
                    page_height = page_dimensions[page_num][1] if page_num < len(page_dimensions) else 792
                    offset_pct = block.get('y0', 0) / page_height
                    return page_num + 1, offset_pct
        
        return None
    
    def _compute_scene_length(self, scene: Scene) -> Tuple[float, str]:
        """Compute scene length in pages."""
        # Try layout-based calculation if available
        if self.pdf_metadata.get('layout_blocks'):
            layout_length = self._compute_layout_length(scene)
            if layout_length:
                return layout_length, "layout"
        
        # Fallback to character-based calculation
        char_length = scene.scene_chars / self.avg_chars_per_page
        return char_length, "char_avg"
    
    def _compute_layout_length(self, scene: Scene) -> Optional[float]:
        """Compute scene length using layout information."""
        # Simplified implementation - would need more sophisticated
        # scene boundary detection in practice
        return None
    
    def _apply_time_canonicalization(self, scenes: List[Scene]) -> List[Scene]:
        """Apply time canonicalization and bulk inference."""
        for i, scene in enumerate(scenes):
            time_canonical, inferred = canonicalize_time(scene.time_raw)
            scene.time_canonical = time_canonical
            scene.time_inferred_from_previous = inferred
            
            # Apply bulk inference for continuous/same scenes
            if inferred and i > 0 and self.config.auto_bulk_time_inference:
                prev_scene = scenes[i - 1]
                if time_canonical in [TimeCanonical.CONTINUOUS, TimeCanonical.SAME_AS_PREVIOUS]:
                    scene.time_canonical = prev_scene.time_canonical
        
        return scenes
    
    def _process_scene_numbers(self, scenes: List[Scene]) -> List[Scene]:
        """Process scene numbers and handle duplicates/placeholders."""
        # Track scene numbers for duplicate detection
        number_counts = defaultdict(list)
        
        for scene in scenes:
            if scene.scene_number_raw:
                number_counts[scene.scene_number_raw].append(scene)
        
        # Handle duplicates
        for number, scene_list in number_counts.items():
            if len(scene_list) > 1:
                # Flag duplicates for manual resolution
                for i, scene in enumerate(scene_list):
                    scene.flagged_for_review = True
                    if i == 0:
                        scene.scene_number_canonical = number
                        scene.notes += f" | Original scene number {number}"
                    else:
                        scene.scene_number_canonical = f"{number}_{chr(65 + i - 1)}"  # A, B, C...
                        scene.notes += f" | Duplicate of scene {number}, suggested suffix _{chr(65 + i - 1)}"
        
        # Generate placeholders for missing numbers
        for scene in scenes:
            if not scene.scene_number_raw:
                placeholder = generate_placeholder_scene_number(scene.order, scene.scene_id)
                scene.scene_number_canonical = placeholder
                scene.notes += f" | Auto-generated placeholder: {placeholder}"
        
        return scenes