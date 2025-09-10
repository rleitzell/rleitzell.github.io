"""LLM connector layer for screenplay analysis."""

import logging
import json
import time
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
import sys
import os

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

try:
    import openai
except ImportError:
    openai = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import tiktoken
except ImportError:
    tiktoken = None

from models.scene import LLMSceneOutput, ProcessingConfig, ChunkResult

logger = logging.getLogger(__name__)


class LLMConnector(ABC):
    """Abstract base class for LLM connectors."""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
    
    @abstractmethod
    async def analyze_chunk(self, chunk_text: str, pages_covered: List[int], 
                          chunk_id: str) -> ChunkResult:
        """Analyze a text chunk and return scene information."""
        pass
    
    def _create_prompt(self, chunk_text: str, pages_covered: List[int]) -> str:
        """Create the analysis prompt for the LLM."""
        return f"""Analyze this screenplay text chunk and extract scene information. Return ONLY valid JSON.

Text chunk (pages {pages_covered[0]}-{pages_covered[-1] if len(pages_covered) > 1 else pages_covered[0]}):
{chunk_text}

Instructions:
1. Identify all complete and partial scenes in this chunk
2. Extract the exact slugline text as found in the script
3. Extract the full scene text including all action and dialogue
4. Estimate the start page if possible (given pages {pages_covered})
5. Provide a one-line summary of each scene
6. Indicate if a scene continues beyond this chunk (continuation: true)
7. Suggest canonical character and location names with confidence scores

Return a JSON array of scenes with this exact structure:
[
  {{
    "slugline_raw": "exact slugline text",
    "full_scene_text": "complete scene text including slugline",
    "scene_chars": 1234,
    "llm_estimated_start_page": 1,
    "llm_start_offset_pct": 0.15,
    "continuation": false,
    "one_liner": "Brief description of what happens",
    "time_continuous_inference": false,
    "suggested_canonicalizations": {{
      "characters": [
        {{"raw": "JOHN", "suggested": "JOHN SMITH", "confidence": 0.9}}
      ],
      "locations": [
        {{"raw": "OFFICE", "suggested_master": "CORPORATE OFFICE", "suggested_sub": "LOBBY", "confidence": 0.8}}
      ]
    }}
  }}
]

Return ONLY the JSON array. No other text."""

    def _validate_scene_output(self, scene_data: Dict[str, Any]) -> Optional[LLMSceneOutput]:
        """Validate and parse LLM scene output."""
        try:
            # Ensure required fields exist
            required_fields = ['slugline_raw', 'full_scene_text', 'one_liner']
            for field in required_fields:
                if field not in scene_data:
                    logger.warning(f"Missing required field: {field}")
                    return None
            
            # Set defaults for optional fields
            scene_data.setdefault('scene_chars', len(scene_data.get('full_scene_text', '')))
            scene_data.setdefault('continuation', False)
            scene_data.setdefault('time_continuous_inference', False)
            
            return LLMSceneOutput(**scene_data)
        except Exception as e:
            logger.error(f"Failed to validate scene output: {e}")
            return None


class OpenAIConnector(LLMConnector):
    """OpenAI API connector."""
    
    def __init__(self, config: ProcessingConfig):
        super().__init__(config)
        if not openai:
            raise ImportError("openai package is required for OpenAI connector")
        
        if config.api_key:
            openai.api_key = config.api_key
    
    async def analyze_chunk(self, chunk_text: str, pages_covered: List[int], 
                          chunk_id: str) -> ChunkResult:
        """Analyze chunk using OpenAI API."""
        start_time = time.time()
        prompt = self._create_prompt(chunk_text, pages_covered)
        
        try:
            # Calculate token count if tiktoken is available
            token_count = None
            if tiktoken:
                try:
                    encoding = tiktoken.encoding_for_model(self.config.model_name)
                    token_count = len(encoding.encode(prompt))
                except Exception:
                    pass
            
            response = await openai.ChatCompletion.acreate(
                model=self.config.model_name,
                messages=[
                    {"role": "system", "content": "You are a screenplay analysis expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                scenes_data = json.loads(content)
                if not isinstance(scenes_data, list):
                    scenes_data = [scenes_data]
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw response: {content}")
                scenes_data = []
            
            # Validate and convert scenes
            scenes = []
            for scene_data in scenes_data:
                scene = self._validate_scene_output(scene_data)
                if scene:
                    scenes.append(scene)
            
            processing_time = time.time() - start_time
            
            return ChunkResult(
                chunk_id=chunk_id,
                scenes=scenes,
                pages_covered=pages_covered,
                processing_time=processing_time,
                token_count=token_count
            )
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return ChunkResult(
                chunk_id=chunk_id,
                scenes=[],
                pages_covered=pages_covered,
                processing_time=time.time() - start_time
            )


class AnthropicConnector(LLMConnector):
    """Anthropic Claude API connector."""
    
    def __init__(self, config: ProcessingConfig):
        super().__init__(config)
        if not anthropic:
            raise ImportError("anthropic package is required for Anthropic connector")
        
        self.client = anthropic.Anthropic(api_key=config.api_key)
    
    async def analyze_chunk(self, chunk_text: str, pages_covered: List[int], 
                          chunk_id: str) -> ChunkResult:
        """Analyze chunk using Anthropic API."""
        start_time = time.time()
        prompt = self._create_prompt(chunk_text, pages_covered)
        
        try:
            response = self.client.messages.create(
                model=self.config.model_name or "claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0.1,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            content = response.content[0].text.strip()
            
            # Parse JSON response
            try:
                scenes_data = json.loads(content)
                if not isinstance(scenes_data, list):
                    scenes_data = [scenes_data]
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw response: {content}")
                scenes_data = []
            
            # Validate and convert scenes
            scenes = []
            for scene_data in scenes_data:
                scene = self._validate_scene_output(scene_data)
                if scene:
                    scenes.append(scene)
            
            processing_time = time.time() - start_time
            
            return ChunkResult(
                chunk_id=chunk_id,
                scenes=scenes,
                pages_covered=pages_covered,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")
            return ChunkResult(
                chunk_id=chunk_id,
                scenes=[],
                pages_covered=pages_covered,
                processing_time=time.time() - start_time
            )


class LocalLLMConnector(LLMConnector):
    """Local LLM connector via HTTP endpoint."""
    
    def __init__(self, config: ProcessingConfig):
        super().__init__(config)
        import aiohttp
        self.session = aiohttp.ClientSession()
        self.endpoint = config.local_endpoint or "http://localhost:8080/v1/chat/completions"
    
    async def analyze_chunk(self, chunk_text: str, pages_covered: List[int], 
                          chunk_id: str) -> ChunkResult:
        """Analyze chunk using local LLM endpoint."""
        start_time = time.time()
        prompt = self._create_prompt(chunk_text, pages_covered)
        
        try:
            payload = {
                "messages": [
                    {"role": "system", "content": "You are a screenplay analysis expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 4000
            }
            
            async with self.session.post(self.endpoint, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    content = result["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"Local LLM API returned {response.status}")
                    content = "[]"
            
            # Parse JSON response
            try:
                scenes_data = json.loads(content)
                if not isinstance(scenes_data, list):
                    scenes_data = [scenes_data]
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                scenes_data = []
            
            # Validate and convert scenes
            scenes = []
            for scene_data in scenes_data:
                scene = self._validate_scene_output(scene_data)
                if scene:
                    scenes.append(scene)
            
            processing_time = time.time() - start_time
            
            return ChunkResult(
                chunk_id=chunk_id,
                scenes=scenes,
                pages_covered=pages_covered,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Local LLM API call failed: {e}")
            return ChunkResult(
                chunk_id=chunk_id,
                scenes=[],
                pages_covered=pages_covered,
                processing_time=time.time() - start_time
            )


def create_llm_connector(config: ProcessingConfig) -> LLMConnector:
    """Factory function to create appropriate LLM connector."""
    if config.llm_provider == "openai":
        return OpenAIConnector(config)
    elif config.llm_provider == "anthropic":
        return AnthropicConnector(config)
    elif config.llm_provider == "local":
        return LocalLLMConnector(config)
    else:
        raise ValueError(f"Unsupported LLM provider: {config.llm_provider}")