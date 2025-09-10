"""Utilities for text processing and scene analysis."""

import re
import hashlib
from typing import List, Tuple, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models.scene import TimeCanonical


def normalize_slugline(raw_slugline: str) -> str:
    """Normalize slugline for consistent processing."""
    # Convert to uppercase
    normalized = raw_slugline.upper().strip()
    
    # Collapse multiple spaces to one
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Convert em/en dash to hyphen
    normalized = normalized.replace('—', '-').replace('–', '-')
    
    # Remove non-printing characters
    normalized = re.sub(r'[^\x20-\x7E]', '', normalized)
    
    # Remove surrounding punctuation
    normalized = normalized.strip('.,;:!?()[]{}')
    
    return normalized


def compute_scene_id(slugline_normalized: str, scene_number_raw: str, 
                    following_text: str, filename: str, 
                    first_chars_count: int = 200) -> str:
    """Compute deterministic scene ID using SHA256."""
    # Normalize following text (first N chars)
    following_normalized = following_text[:first_chars_count].upper().strip()
    following_normalized = re.sub(r'\s+', ' ', following_normalized)
    
    # Create hash input
    hash_input = f"{slugline_normalized}|{scene_number_raw}|{following_normalized}|{filename}"
    
    # Compute SHA256
    return hashlib.sha256(hash_input.encode('utf-8')).hexdigest()


def extract_int_ext(slugline: str) -> str:
    """Extract INT/EXT from slugline."""
    upper_slug = slugline.upper()
    
    if 'INT/EXT' in upper_slug or 'INT./EXT.' in upper_slug:
        return "INT/EXT"
    elif upper_slug.startswith('INT') or 'INT.' in upper_slug:
        return "INT"
    elif upper_slug.startswith('EXT') or 'EXT.' in upper_slug:
        return "EXT"
    else:
        return "UNKNOWN"


def extract_time_raw(slugline: str) -> str:
    """Extract raw time-of-day from slugline."""
    # Common time patterns
    time_patterns = [
        r'\b(MORNING|DAY|AFTERNOON|EVENING|DUSK|DAWN|NIGHT)\b',
        r'\b(CONTINUOUS|CONT\.?|LATER|SAME)\b',
        r'\b(MOMENTS LATER|LATER THAT DAY|SAME DAY)\b'
    ]
    
    upper_slug = slugline.upper()
    
    for pattern in time_patterns:
        match = re.search(pattern, upper_slug)
        if match:
            return match.group(0)
    
    return ""


def canonicalize_time(time_raw: str) -> Tuple[TimeCanonical, bool]:
    """Convert raw time to canonical time and infer if from previous."""
    time_upper = time_raw.upper().strip()
    inferred_from_previous = False
    
    # Direct mappings
    time_mappings = {
        'MORNING': TimeCanonical.MORNING,
        'DAY': TimeCanonical.DAY,
        'AFTERNOON': TimeCanonical.AFTERNOON,
        'EVENING': TimeCanonical.EVENING,
        'DUSK': TimeCanonical.DUSK,
        'DAWN': TimeCanonical.DAWN,
        'NIGHT': TimeCanonical.NIGHT,
    }
    
    if time_upper in time_mappings:
        return time_mappings[time_upper], inferred_from_previous
    
    # Continuous/relative mappings
    if 'CONTINUOUS' in time_upper or 'CONT.' in time_upper:
        return TimeCanonical.CONTINUOUS, True
    
    if 'LATER' in time_upper:
        return TimeCanonical.LATER, True
    
    if 'SAME' in time_upper:
        return TimeCanonical.SAME_AS_PREVIOUS, True
    
    return TimeCanonical.UNKNOWN, inferred_from_previous


def extract_scene_number(slugline: str) -> str:
    """Extract scene number from slugline."""
    # Common scene number patterns
    patterns = [
        r'#(\d+[A-Z]?)',  # #1, #2A, etc.
        r'(\d+[A-Z]?)\.',  # 1., 2A., etc.
        r'SCENE\s+(\d+[A-Z]?)',  # SCENE 1, SCENE 2A
        r'^(\d+[A-Z]?)\s',  # Starting with number
    ]
    
    for pattern in patterns:
        match = re.search(pattern, slugline.upper())
        if match:
            return match.group(1)
    
    return ""


def extract_location_components(slugline: str) -> Tuple[str, str]:
    """Extract master and sub-location from slugline."""
    # Remove INT/EXT and time components
    clean_slug = slugline.upper()
    clean_slug = re.sub(r'^(INT\.?|EXT\.?)\s*', '', clean_slug)
    clean_slug = re.sub(r'\s*-\s*(MORNING|DAY|AFTERNOON|EVENING|DUSK|DAWN|NIGHT|CONTINUOUS|CONT\.?).*$', '', clean_slug)
    clean_slug = re.sub(r'#?\d+[A-Z]?\.?\s*$', '', clean_slug)  # Remove scene numbers
    
    clean_slug = clean_slug.strip()
    
    # Split on common separators for sub-locations
    if ' - ' in clean_slug:
        parts = clean_slug.split(' - ', 1)
        return parts[0].strip(), parts[1].strip() if len(parts) > 1 else ""
    
    return clean_slug, ""


def round_to_eighth(value: float) -> float:
    """Round value to nearest 1/8 using ceiling rule."""
    import math
    return max(0.125, math.ceil(value * 8) / 8)


def generate_placeholder_scene_number(order: int, scene_id: str) -> str:
    """Generate deterministic placeholder scene number."""
    # Use first 8 chars of scene_id hash for determinism
    hash_suffix = scene_id[:8].upper()
    return f"AUTON-{order:03d}-{hash_suffix}"


def fuzzy_match_characters(raw_chars: List[str], threshold: float = 0.85) -> List[List[str]]:
    """Group character names by fuzzy similarity."""
    from difflib import SequenceMatcher
    
    groups = []
    used = set()
    
    for i, char1 in enumerate(raw_chars):
        if i in used:
            continue
            
        group = [char1]
        used.add(i)
        
        for j, char2 in enumerate(raw_chars[i+1:], i+1):
            if j in used:
                continue
                
            similarity = SequenceMatcher(None, char1.upper(), char2.upper()).ratio()
            if similarity >= threshold:
                group.append(char2)
                used.add(j)
        
        groups.append(group)
    
    return groups


def count_characters_in_scene(scene_text: str) -> Tuple[int, int]:
    """Count appearance and speaking characters in scene text.
    
    Returns:
        Tuple of (appearance_count, speaking_count)
    """
    # This is a simplified implementation - in practice would need more
    # sophisticated parsing of screenplay format
    
    # Extract character names from dialogue blocks
    dialogue_pattern = r'^([A-Z\s]{2,})(?:\s*\([^)]*\))?\s*$'
    speaking_chars = set()
    appearing_chars = set()
    
    lines = scene_text.split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Check for character dialogue (uppercase line, possibly with parenthetical)
        if re.match(dialogue_pattern, line) and len(line) < 50:
            # Next line should be dialogue
            if i + 1 < len(lines) and lines[i + 1].strip():
                char_name = re.sub(r'\s*\([^)]*\)', '', line).strip()
                char_name = re.sub(r'\s*(V\.O\.|O\.S\.|CONT\'D)', '', char_name).strip()
                if char_name:
                    speaking_chars.add(char_name)
                    appearing_chars.add(char_name)
        
        # Check for character mentions in action lines (simple heuristic)
        if line and not line.isupper() and not line.startswith('('):
            # Look for capitalized names
            name_matches = re.findall(r'\b[A-Z]{2,}\b', line)
            for name in name_matches:
                if len(name) > 2 and name not in ['THE', 'AND', 'BUT', 'FOR']:
                    appearing_chars.add(name)
    
    return len(appearing_chars), len(speaking_chars)


def chunk_text(text: str, chunk_size: int = 2500, overlap: int = 300) -> List[Tuple[str, int, int]]:
    """Chunk text with overlap, returning (chunk_text, start_pos, end_pos)."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        chunks.append((chunk, start, end))
        
        if end >= len(text):
            break
            
        start = end - overlap
    
    return chunks