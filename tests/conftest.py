"""Test configuration and fixtures."""

import pytest
import sys
import os
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.scene import ProcessingConfig


@pytest.fixture
def sample_config():
    """Sample processing configuration."""
    return ProcessingConfig(
        llm_provider="openai",
        model_name="gpt-3.5-turbo",
        api_key="test-key",
        chunk_size=1000,
        overlap=100
    )


@pytest.fixture
def sample_screenplay_text():
    """Sample screenplay text for testing."""
    return """EXT. GARDEN - DAY

A beautiful garden in full bloom. ALICE (20s) walks through the flowers.

ALICE
What a lovely day.

She stops to smell a rose.

INT. HOUSE - KITCHEN - DAY

Alice enters through the back door.

ALICE
I'm home!

MOTHER (50s) looks up from cooking.

MOTHER
How was your walk?

ALICE
Wonderful. The garden is perfect today.
"""


@pytest.fixture
def sample_pages_text():
    """Sample pages text for testing."""
    return [
        "EXT. GARDEN - DAY\n\nA beautiful garden in full bloom. ALICE (20s) walks through the flowers.\n\nALICE\nWhat a lovely day.\n\nShe stops to smell a rose.",
        "INT. HOUSE - KITCHEN - DAY\n\nAlice enters through the back door.\n\nALICE\nI'm home!\n\nMOTHER (50s) looks up from cooking.\n\nMOTHER\nHow was your walk?\n\nALICE\nWonderful. The garden is perfect today."
    ]