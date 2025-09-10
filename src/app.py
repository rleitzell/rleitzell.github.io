"""Web application for screenplay analysis GUI."""

from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import json
import asyncio
from pathlib import Path
import tempfile
import sys
import os

# Add src to path for imports
sys.path.append(os.path.dirname(__file__))

from models.scene import ProcessingConfig, Scene
from core.pipeline import process_screenplay_file

app = FastAPI(title="Screenplay Analyzer", version="1.0.0")

# Setup templates and static files
templates = Jinja2Templates(directory="src/gui/templates")

# Create static directory if it doesn't exist
static_dir = Path("src/gui/static")
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Global state for demo purposes (in production, use proper session management)
current_results = {}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main dashboard page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/config", response_class=HTMLResponse)
async def config_page(request: Request):
    """Configuration page."""
    return templates.TemplateResponse("config.html", {"request": request})


@app.post("/upload")
async def upload_screenplay(
    request: Request,
    file: UploadFile = File(...),
    llm_provider: str = Form("openai"),
    model_name: str = Form("gpt-3.5-turbo"),
    api_key: str = Form(""),
    chunk_size: int = Form(2500),
    layout_enhancement: bool = Form(True)
):
    """Upload and process screenplay."""
    global current_results
    
    if not file.filename.lower().endswith('.pdf'):
        return JSONResponse(
            status_code=400,
            content={"error": "Only PDF files are supported"}
        )
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            temp_path = tmp_file.name
        
        # Create configuration
        config = ProcessingConfig(
            llm_provider=llm_provider,
            model_name=model_name,
            api_key=api_key,
            chunk_size=chunk_size,
            layout_enhancement=layout_enhancement
        )
        
        # Process screenplay
        results = await process_screenplay_file(temp_path, "./temp_output", config)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        if results["success"]:
            # Store results globally for demo
            current_results = results
            
            return JSONResponse(content={
                "success": True,
                "statistics": results["statistics"],
                "scene_count": len(results["scenes"]),
                "export_paths": {k: str(v) for k, v in results["export_paths"].items()}
            })
        else:
            return JSONResponse(
                status_code=500,
                content={"error": results["error"]}
            )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Processing failed: {str(e)}"}
        )


@app.get("/scenes", response_class=HTMLResponse)
async def scenes_page(request: Request):
    """Scene review page."""
    return templates.TemplateResponse("scenes.html", {"request": request})


@app.get("/api/scenes")
async def get_scenes():
    """Get current scenes data."""
    global current_results
    
    if not current_results or not current_results.get("success"):
        return JSONResponse(content={"scenes": []})
    
    # Convert scenes to JSON-serializable format
    scenes_data = []
    for scene in current_results["scenes"]:
        scene_dict = {
            "scene_id": scene.scene_id,
            "order": scene.order,
            "slugline_raw": scene.slugline_raw,
            "scene_number_canonical": scene.scene_number_canonical,
            "page_start": scene.page_start,
            "rounded_length_pages": scene.rounded_length_pages,
            "int_ext": scene.int_ext.value,
            "time_canonical": scene.time_canonical.value,
            "master_location_canonical": scene.master_location_canonical,
            "sub_location_canonical": scene.sub_location_canonical,
            "appearance_count": scene.appearance_count,
            "speaking_count": scene.speaking_count,
            "one_liner": scene.one_liner,
            "flagged_for_review": scene.flagged_for_review,
            "notes": scene.notes,
            "confidences": {
                "confidence_overall": scene.confidences.confidence_overall,
                "start_page_confidence": scene.confidences.start_page_confidence,
                "length_confidence": scene.confidences.length_confidence
            }
        }
        scenes_data.append(scene_dict)
    
    return JSONResponse(content={"scenes": scenes_data})


@app.get("/api/scene/{scene_id}")
async def get_scene_detail(scene_id: str):
    """Get detailed scene information."""
    global current_results
    
    if not current_results or not current_results.get("success"):
        return JSONResponse(status_code=404, content={"error": "No scenes loaded"})
    
    # Find the scene
    for scene in current_results["scenes"]:
        if scene.scene_id == scene_id:
            scene_detail = {
                "scene_id": scene.scene_id,
                "scene_label": scene.scene_label,
                "order": scene.order,
                "slugline_raw": scene.slugline_raw,
                "slugline_normalized": scene.slugline_normalized,
                "full_scene_text": scene.full_scene_text,
                "scene_number_raw": scene.scene_number_raw,
                "scene_number_canonical": scene.scene_number_canonical,
                "page_start": scene.page_start,
                "raw_length_pages": scene.raw_length_pages,
                "rounded_length_pages": scene.rounded_length_pages,
                "page_end_int": scene.page_end_int,
                "int_ext": scene.int_ext.value,
                "time_raw": scene.time_raw,
                "time_canonical": scene.time_canonical.value,
                "time_inferred_from_previous": scene.time_inferred_from_previous,
                "master_location_raw": scene.master_location_raw,
                "master_location_canonical": scene.master_location_canonical,
                "sub_location_raw": scene.sub_location_raw,
                "sub_location_canonical": scene.sub_location_canonical,
                "appearance_count": scene.appearance_count,
                "speaking_count": scene.speaking_count,
                "one_liner": scene.one_liner,
                "scene_chars": scene.scene_chars,
                "source_chunk_ids": scene.source_chunk_ids,
                "continuation": scene.continuation,
                "canonical_suggestions": {
                    "characters": [
                        {
                            "raw": char.raw,
                            "suggested": char.suggested,
                            "confidence": char.confidence
                        }
                        for char in scene.canonical_suggestions.characters
                    ],
                    "locations": [
                        {
                            "raw": loc.raw,
                            "suggested_master": loc.suggested_master,
                            "suggested_sub": loc.suggested_sub,
                            "confidence": loc.confidence
                        }
                        for loc in scene.canonical_suggestions.locations
                    ]
                },
                "confidences": {
                    "confidence_overall": scene.confidences.confidence_overall,
                    "start_page_confidence": scene.confidences.start_page_confidence,
                    "length_confidence": scene.confidences.length_confidence
                },
                "provenance": {
                    "start_page_source": scene.provenance.start_page_source,
                    "length_source": scene.provenance.length_source,
                    "llm_evidence": scene.provenance.llm_evidence,
                },
                "flagged_for_review": scene.flagged_for_review,
                "notes": scene.notes
            }
            return JSONResponse(content=scene_detail)
    
    return JSONResponse(status_code=404, content={"error": "Scene not found"})


@app.post("/api/scene/{scene_id}/update")
async def update_scene(scene_id: str, request: Request):
    """Update scene information."""
    global current_results
    
    if not current_results or not current_results.get("success"):
        return JSONResponse(status_code=404, content={"error": "No scenes loaded"})
    
    update_data = await request.json()
    
    # Find and update the scene
    for scene in current_results["scenes"]:
        if scene.scene_id == scene_id:
            # Update allowed fields
            if "scene_number_canonical" in update_data:
                scene.scene_number_canonical = update_data["scene_number_canonical"]
            if "master_location_canonical" in update_data:
                scene.master_location_canonical = update_data["master_location_canonical"]
            if "sub_location_canonical" in update_data:
                scene.sub_location_canonical = update_data["sub_location_canonical"]
            if "time_canonical" in update_data:
                from models.scene import TimeCanonical
                scene.time_canonical = TimeCanonical(update_data["time_canonical"])
            if "notes" in update_data:
                scene.notes = update_data["notes"]
            if "flagged_for_review" in update_data:
                scene.flagged_for_review = update_data["flagged_for_review"]
            
            return JSONResponse(content={"success": True})
    
    return JSONResponse(status_code=404, content={"error": "Scene not found"})


@app.get("/export/{format}")
async def export_data(format: str):
    """Export current data in specified format."""
    global current_results
    
    if not current_results or not current_results.get("success"):
        return JSONResponse(status_code=404, content={"error": "No data to export"})
    
    export_paths = current_results.get("export_paths", {})
    
    if format == "csv" and "csv" in export_paths:
        file_path = Path(export_paths["csv"])
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return JSONResponse(content={"content": content, "filename": file_path.name})
    
    elif format == "json" and "json_full" in export_paths:
        file_path = Path(export_paths["json_full"])
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return JSONResponse(content={"content": content, "filename": file_path.name})
    
    return JSONResponse(status_code=404, content={"error": f"Export format {format} not available"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)