import os
from pathlib import Path
from typing import Any, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import GOOGLE_API_KEY, GITHUB_TOKEN, GEMMA_MODEL, PORT, HOST
from .github_service import (
    parse_repo_url,
    get_repo_details,
    get_repo_key_docs,
    get_repo_tree,
    get_repo_issues,
    get_issue_detail,
    get_file_content
)
from .rag_service import (
    index_repository_docs,
    answer_question,
    run_evaluation_suite,
    knowledge_base
)
from .chat_engine import generate_chat_response, LEARNING_STAGES
from .arena_service import compare_models_on_issue
from .preflight_service import run_preflight_checks

app = FastAPI(
    title="RepoMind API",
    description="Backend engine for RepoMind open-source contribution assistant with Gemma RAG and ChromaDB.",
    version="2.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Request Models ---
class AnalyzeRepoRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    message: str
    repo_info: dict[str, Any]
    selected_issue: Optional[dict[str, Any]] = None
    learning_level: str = "beginner"
    learning_stage: str = "explore"
    chat_history: list[dict[str, str]] = Field(default_factory=list)

class ModelArenaRequest(BaseModel):
    repo_name: str
    issue_title: str
    issue_body: str = ""
    file_context: Optional[str] = None

class PreflightRequest(BaseModel):
    repo_name: str
    issue_title: str
    commit_message: str
    diff_text: str = ""

class SettingsUpdateRequest(BaseModel):
    google_api_key: Optional[str] = None
    github_token: Optional[str] = None
    gemma_model: Optional[str] = None

# --- API Endpoints ---

@app.get("/api/health")
async def health_check():
    """Health status and configuration diagnostics."""
    return {
        "status": "online",
        "service": "RepoMind AI Backend",
        "google_ai_studio_connected": bool(os.getenv("GOOGLE_API_KEY") or GOOGLE_API_KEY),
        "gemma_model": os.getenv("GEMMA_MODEL") or GEMMA_MODEL,
        "github_token_configured": bool(os.getenv("GITHUB_TOKEN") or GITHUB_TOKEN),
        "indexed_repo": knowledge_base.get("repo"),
        "total_indexed_chunks": len(knowledge_base.get("chunks", [])),
        "learning_stages": LEARNING_STAGES
    }

@app.post("/api/settings")
async def update_settings(req: SettingsUpdateRequest):
    """Save or update API credentials."""
    import backend.config as cfg
    if req.google_api_key is not None:
        cfg.GOOGLE_API_KEY = req.google_api_key.strip()
        os.environ["GOOGLE_API_KEY"] = req.google_api_key.strip()
    if req.github_token is not None:
        cfg.GITHUB_TOKEN = req.github_token.strip()
        os.environ["GITHUB_TOKEN"] = req.github_token.strip()
    if req.gemma_model is not None:
        cfg.GEMMA_MODEL = req.gemma_model.strip()
        os.environ["GEMMA_MODEL"] = req.gemma_model.strip()

    # Write updated values to .env for persistence
    env_path = Path(__file__).resolve().parent.parent / ".env"
    lines = []
    if env_path.exists():
        lines = env_path.read_text().splitlines()

    def set_env_line(lines, key, value):
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={value}"
                return lines
        lines.append(f"{key}={value}")
        return lines

    if req.google_api_key is not None:
        lines = set_env_line(lines, "GOOGLE_API_KEY", req.google_api_key.strip())
    if req.github_token is not None:
        lines = set_env_line(lines, "GITHUB_TOKEN", req.github_token.strip())
    if req.gemma_model is not None:
        lines = set_env_line(lines, "GEMMA_MODEL", req.gemma_model.strip())

    env_path.write_text("\n".join(lines) + "\n")

    return {
        "message": "Settings updated successfully.",
        "google_ai_studio_connected": bool(cfg.GOOGLE_API_KEY),
        "gemma_model": cfg.GEMMA_MODEL,
        "github_token_configured": bool(cfg.GITHUB_TOKEN)
    }
@app.post("/api/repo/analyze")
async def analyze_repository(req: AnalyzeRepoRequest):
    """
    1. Parse GitHub URL
    2. Fetch repository metadata via GitHub REST API
    3. Fetch key documentation (README, CONTRIBUTING, etc.)
    4. Fetch file tree
    5. Chunk & Index docs into Vector Store (ChromaDB / Embeddings)
    """
    try:
        owner, repo = parse_repo_url(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    try:
        details = await get_repo_details(owner, repo)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    # Fetch key docs and file tree in parallel
    docs = await get_repo_key_docs(owner, repo, details["default_branch"])
    tree = await get_repo_tree(owner, repo, details["default_branch"])
    
    # Index documents into RAG vector store
    index_summary = {}
    try:
        if docs:
            index_summary = index_repository_docs(details["full_name"], docs)
        else:
            index_summary = {"message": "No docs indexed — add a GITHUB_TOKEN for full access"}
    except Exception as e:
        index_summary = {"error": str(e)}
        
    # Fetch initial issues
    try:
        issues = await get_repo_issues(owner, repo, limit=12)
    except Exception:
        issues = []
    
    return {
        "repo": details,
        "docs_found": list(docs.keys()),
        "files_count": len(tree),
        "tree_preview": tree[:30],
        "index_summary": index_summary,
        "issues": issues
    }

@app.get("/api/repo/issues")
async def fetch_issues(owner: str, repo: str, limit: int = 20):
    """Fetch open repository issues, prioritizing good first issues."""
    try:
        issues = await get_repo_issues(owner, repo, limit=limit)
        return {"owner": owner, "repo": repo, "issues": issues}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/repo/issue-detail")
async def fetch_issue_detail(owner: str, repo: str, number: int):
    """Fetch complete issue description and discussion comments."""
    try:
        detail = await get_issue_detail(owner, repo, number)
        return detail
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/repo/file")
async def fetch_file(owner: str, repo: str, path: str, branch: str = "main"):
    """Fetch raw file content from the repository."""
    try:
        content = await get_file_content(owner, repo, path, branch)
        if not content:
            raise HTTPException(status_code=404, detail="File content not found or empty.")
        return {"path": path, "content": content}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/chat")
async def handle_chat(req: ChatRequest):
    """
    Central AI Chatbot:
    Answers with repository awareness, issue grounding, learning level adaptation, and stage guidance.
    """
    try:
        result = await generate_chat_response(
            message=req.message,
            repo_info=req.repo_info,
            selected_issue=req.selected_issue,
            learning_level=req.learning_level,
            learning_stage=req.learning_stage,
            chat_history=req.chat_history
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/arena/compare")
async def arena_compare(req: ModelArenaRequest):
    """
    AI Model Arena:
    Compare Gemma 4, Claude 3.7 Sonnet, DeepSeek-R1, and GPT-4o on issue resolution.
    """
    try:
        result = await compare_models_on_issue(
            repo_name=req.repo_name,
            issue_title=req.issue_title,
            issue_body=req.issue_body,
            file_context=req.file_context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preflight/check")
async def preflight_audit(req: PreflightRequest):
    """
    PR Preflight Checker:
    Validate commit message format, test coverage changes, and draft maintainer PR description.
    """
    try:
        result = run_preflight_checks(
            repo_name=req.repo_name,
            issue_title=req.issue_title,
            commit_message=req.commit_message,
            diff_text=req.diff_text
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/eval/benchmark")
async def run_benchmark():
    """
    Run 15-question Gemma RAG evaluation suite (Theme 2 Hacktoberfest requirement).
    """
    try:
        result = await run_evaluation_suite()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
