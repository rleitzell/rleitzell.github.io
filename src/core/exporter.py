"""Export functionality for CSV and JSON outputs."""

import json
import csv
from typing import List, Dict, Any
from pathlib import Path
import sys
import os

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.scene import Scene, CSVRow


class SceneExporter:
    """Export scenes to various formats."""
    
    def export_csv(self, scenes: List[Scene], output_path: Path) -> None:
        """Export scenes to CSV format."""
        csv_rows = [self._scene_to_csv_row(scene) for scene in scenes]
        
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            if csv_rows:
                fieldnames = list(csv_rows[0].model_dump(by_alias=True).keys())
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for row in csv_rows:
                    writer.writerow(row.model_dump(by_alias=True))
    
    def export_json(self, scenes: List[Scene], output_path: Path, include_metadata: bool = True) -> None:
        """Export scenes to JSON format."""
        if include_metadata:
            # Full developer JSON with all metadata
            scenes_data = [scene.model_dump() for scene in scenes]
        else:
            # Simplified JSON for external use
            scenes_data = [self._scene_to_simple_dict(scene) for scene in scenes]
        
        export_data = {
            "scenes": scenes_data,
            "metadata": {
                "total_scenes": len(scenes),
                "export_format": "full" if include_metadata else "simple",
                "schema_version": "1.0"
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(export_data, jsonfile, indent=2, ensure_ascii=False)
    
    def _scene_to_csv_row(self, scene: Scene) -> CSVRow:
        """Convert Scene to CSV row format."""
        return CSVRow(
            header=scene.slugline_raw,
            int_or_ext=scene.int_ext.value,
            time=scene.time_canonical.value,
            scene_number=scene.scene_number_canonical,
            page=scene.page_start,
            length=scene.rounded_length_pages,
            order=scene.order,
            master_location=scene.master_location_canonical or scene.master_location_raw,
            sub_location=scene.sub_location_canonical or scene.sub_location_raw or "",
            character_count=scene.appearance_count,
            one_liner_description=scene.one_liner
        )
    
    def _scene_to_simple_dict(self, scene: Scene) -> Dict[str, Any]:
        """Convert Scene to simplified dictionary."""
        return {
            "scene_id": scene.scene_id,
            "order": scene.order,
            "slugline": scene.slugline_raw,
            "scene_number": scene.scene_number_canonical,
            "page_start": scene.page_start,
            "length_pages": scene.rounded_length_pages,
            "location": {
                "master": scene.master_location_canonical,
                "sub": scene.sub_location_canonical
            },
            "time": scene.time_canonical.value,
            "characters": {
                "appearance_count": scene.appearance_count,
                "speaking_count": scene.speaking_count
            },
            "summary": scene.one_liner,
            "flagged_for_review": scene.flagged_for_review
        }


def export_scenes(scenes: List[Scene], output_dir: Path, base_name: str = "screenplay_analysis") -> Dict[str, Path]:
    """Export scenes to both CSV and JSON formats."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    exporter = SceneExporter()
    
    # Export paths
    csv_path = output_dir / f"{base_name}.csv"
    json_full_path = output_dir / f"{base_name}_full.json"
    json_simple_path = output_dir / f"{base_name}_simple.json"
    
    # Export files
    exporter.export_csv(scenes, csv_path)
    exporter.export_json(scenes, json_full_path, include_metadata=True)
    exporter.export_json(scenes, json_simple_path, include_metadata=False)
    
    return {
        "csv": csv_path,
        "json_full": json_full_path,
        "json_simple": json_simple_path
    }