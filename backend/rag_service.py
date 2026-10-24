import re
import math
from pathlib import Path
from typing import Any, Optional
import httpx

from .config import (
    GOOGLE_API_KEY,
    GEMMA_MODEL,
    EMBED_MODEL_NAME,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    TOP_K,
    RELEVANCE_THRESHOLD,
    REFUSAL_MESSAGE
)

# In-memory document chunk store & Chroma store
knowledge_base: dict[str, Any] = {
    "repo": None,
    "chunks": [],      # list of dicts: {"source": ..., "location": ..., "text": ..., "vector": ...}
    "vector_index": None
}

# Try importing SentenceTransformer and ChromaDB if available
_embedder = None
_chroma_client = None
_chroma_collection = None

def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer(EMBED_MODEL_NAME)
        except Exception:
            _embedder = None
    return _embedder

def get_chroma_collection(repo_name: str):
    global _chroma_client, _chroma_collection
    try:
        import chromadb
        if _chroma_client is None:
            _chroma_client = chromadb.Client()
        collection_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", repo_name)
        _chroma_collection = _chroma_client.get_or_create_collection(name=collection_name)
        return _chroma_collection
    except Exception:
        return None

# Lightweight fallback embedding using TF-IDF / Subword character n-gram hashing
def compute_light_embedding(text: str, dim: int = 128) -> list[float]:
    """Fallback deterministic embedding vector when SentenceTransformer is loading."""
    words = re.findall(r"\w+", text.lower())
    vec = [0.0] * dim
    if not words:
        return vec
    
    for w in words:
        # Simple polynomial rolling hash
        h = 0
        for char in w:
            h = (h * 31 + ord(char)) % dim
        vec[h] += 1.0
        
        # Bigram hashing
        for i in range(len(w) - 1):
            bg_h = (ord(w[i]) * 37 + ord(w[i+1])) % dim
            vec[bg_h] += 0.5
            
    # Normalize vector to unit length
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    return max(0.0, min(1.0, dot))

def chunk_document(content: str, filename: str) -> list[dict[str, Any]]:
    """Split markdown, code or plain text into sectioned chunks with overlap."""
    chunks = []
    # If Markdown, divide into sections by heading (#, ##, ###)
    if filename.endswith(".md"):
        sections = re.split(r"(?m)(?=^#{1,4}\s+)", content)
        sections = [s.strip() for s in sections if s.strip()]
    else:
        # Paragraph based
        sections = [s.strip() for s in re.split(r"\n\s*\n", content) if s.strip()]
    
    if not sections:
        sections = [content.strip()]
        
    step = max(1, CHUNK_SIZE - CHUNK_OVERLAP)
    for sec_idx, section in enumerate(sections, start=1):
        words = section.split()
        if not words:
            continue
        location = f"Section {sec_idx}"
        
        # If heading exists, use heading text in location
        first_line = section.split("\n")[0]
        if first_line.startswith("#"):
            location = first_line.lstrip("#").strip()[:40]
            
        for start in range(0, len(words), step):
            part = words[start : start + CHUNK_SIZE]
            if len(part) > 6:
                chunks.append({
                    "source": filename,
                    "location": location,
                    "text": " ".join(part)
                })
            if start + CHUNK_SIZE >= len(words):
                break
    return chunks

def index_repository_docs(repo_name: str, docs: dict[str, str]) -> dict[str, Any]:
    """Index all repository documents into the vector store."""
    all_chunks = []
    summary = []
    
    for filename, content in docs.items():
        doc_chunks = chunk_document(content, filename)
        all_chunks.extend(doc_chunks)
        summary.append(f"{filename}: {len(doc_chunks)} chunks")
        
    if not all_chunks:
        raise ValueError("No extractable documentation found in repository.")
        
    embedder = get_embedder()
    chroma = get_chroma_collection(repo_name)
    
    # Compute embeddings
    if embedder is not None:
        texts = [c["text"] for c in all_chunks]
        vectors = embedder.encode(texts, normalize_embeddings=True).tolist()
    else:
        vectors = [compute_light_embedding(c["text"]) for c in all_chunks]
        
    for chunk, vec in zip(all_chunks, vectors):
        chunk["vector"] = vec

    # If ChromaDB is available, add to collection
    if chroma is not None:
        try:
            ids = [f"{repo_name}_{i}" for i in range(len(all_chunks))]
            metadatas = [{"source": c["source"], "location": c["location"]} for c in all_chunks]
            chroma.upsert(
                ids=ids,
                embeddings=vectors,
                documents=[c["text"] for c in all_chunks],
                metadatas=metadatas
            )
        except Exception:
            pass

    knowledge_base["repo"] = repo_name
    knowledge_base["chunks"] = all_chunks
    
    return {
        "repo": repo_name,
        "total_chunks": len(all_chunks),
        "documents": list(docs.keys()),
        "summary": summary
    }

def retrieve_passages(query: str, top_k: int = TOP_K) -> list[dict[str, Any]]:
    """Retrieve top-K most relevant chunks with cosine similarity score."""
    if not knowledge_base["chunks"]:
        return []
        
    embedder = get_embedder()
    if embedder is not None:
        query_vec = embedder.encode([query], normalize_embeddings=True)[0].tolist()
    else:
        query_vec = compute_light_embedding(query)
        
    scored = []
    for chunk in knowledge_base["chunks"]:
        score = cosine_similarity(query_vec, chunk["vector"])
        scored.append({
            "source": chunk["source"],
            "location": chunk["location"],
            "text": chunk["text"],
            "score": float(score)
        })
        
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]

async def call_gemma_api(prompt: str, system_instruction: str = "") -> str:
    """Call Google AI Studio Gemma / Gemini API."""
    if not GOOGLE_API_KEY:
        return ""
        
    # Standard Google AI Studio REST endpoint
    model_name = GEMMA_MODEL if "gemini" in GEMMA_MODEL or "gemma" in GEMMA_MODEL else "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GOOGLE_API_KEY}"
    
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800,
            "topP": 0.95
        }
    }
    
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
        
    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
        return ""

async def answer_question(question: str, learning_level: str = "beginner") -> tuple[str, list[dict[str, Any]], bool]:
    """
    RAG Question-Answering with:
    1. Grounded retrieval
    2. Relevance threshold check (refuses out-of-scope questions)
    3. Mandatory citations: (filename, location)
    """
    passages = retrieve_passages(question)
    
    # Relevance Guardrail: Refuse if no passages or top score below threshold
    if not passages or passages[0]["score"] < RELEVANCE_THRESHOLD:
        return REFUSAL_MESSAGE, passages, True
        
    top_score = passages[0]["score"]
    
    # Build strict grounded context
    context_str = "\n\n".join(
        f"[{c['source']} | {c['location']}] (relevance: {c['score']:.2f})\n{c['text']}"
        for c in passages[:4]
    )
    
    system_prompt = (
        "You are RepoMind's grounded codebase expert assistant. "
        "Answer the user's question using ONLY the provided reference context. "
        "Every single factual assertion MUST cite its source file and location exactly in the form: "
        "`(filename, location)` such as `(README.md, Section 1)` or `(CONTRIBUTING.md, Setup)`. "
        "Adapt your language to the user's learning level:\n"
        f"- Learning level: {learning_level.upper()}.\n"
        "If beginner: explain technical terms simply and avoid jargon.\n"
        "If intermediate: focus on architectural patterns and workflows.\n"
        "If experienced: be concise with direct file references and commands.\n"
        f"If the answer cannot be found in the provided context, answer exactly: '{REFUSAL_MESSAGE}'."
    )
    
    user_prompt = (
        f"Context (Reference data from {knowledge_base.get('repo', 'repository')}):\n"
        f"{context_str}\n\n"
        f"Question: {question}\n\n"
        f"Answer with mandatory citations:"
    )
    
    llm_response = await call_gemma_api(user_prompt, system_prompt)
    
    # If no API key configured or API call failed, generate structured extractive answer
    if not llm_response or REFUSAL_MESSAGE in llm_response:
        if not llm_response:
            # Fallback extractive generation
            best = passages[0]
            llm_response = (
                f"Based on the repository documentation in **{best['source']} ({best['location']})**:\n\n"
                f"{best['text']}\n\n"
                f"*Source: ({best['source']}, {best['location']})*"
            )
        else:
            return REFUSAL_MESSAGE, passages, True
            
    return llm_response, passages, False

# 15-question Hacktoberfest / Theme 2 evaluation benchmark
EVAL_TEST_SET = [
    # 5 Direct Facts (In-scope)
    {"q": "What is the purpose of this project and what does it do?", "type": "Direct Fact", "should_answer": True},
    {"q": "How do I install dependencies and set up the local environment?", "type": "Direct Fact", "should_answer": True},
    {"q": "What commands are used to run tests in this repository?", "type": "Direct Fact", "should_answer": True},
    {"q": "What license is this project distributed under?", "type": "Direct Fact", "should_answer": True},
    {"q": "Where are the contribution guidelines located?", "type": "Direct Fact", "should_answer": True},

    # 5 Synthesis (Cross-document synthesis)
    {"q": "What is the full git workflow from forking to opening a pull request?", "type": "Synthesis", "should_answer": True},
    {"q": "What coding standards, linter rules, or commit conventions must I follow?", "type": "Synthesis", "should_answer": True},
    {"q": "How is the codebase structured across different directories?", "type": "Synthesis", "should_answer": True},
    {"q": "What prerequisites or runtime versions are required before running this project?", "type": "Synthesis", "should_answer": True},
    {"q": "How do maintainers review pull requests and what CI checks must pass?", "type": "Synthesis", "should_answer": True},

    # 5 Out-of-Scope / Refusal questions (Should be REFUSED)
    {"q": "Who won the 2022 FIFA World Cup in Qatar?", "type": "Refusal", "should_answer": False},
    {"q": "What is the weather forecast in San Francisco tomorrow?", "type": "Refusal", "should_answer": False},
    {"q": "Can I order a pepperoni pizza from Domino's through this repo?", "type": "Refusal", "should_answer": False},
    {"q": "What is the tuition fee at Harvard University for the computer science program?", "type": "Refusal", "should_answer": False},
    {"q": "How do I bake a chocolate chip cookie from scratch?", "type": "Refusal", "should_answer": False},
]

async def run_evaluation_suite() -> dict[str, Any]:
    """Execute the 15-question benchmark and calculate accuracy & refusal precision."""
    if not knowledge_base["chunks"]:
        raise ValueError("Index repository documentation before running the evaluation.")
        
    results = []
    correct_count = 0
    
    for i, test in enumerate(EVAL_TEST_SET, start=1):
        reply, passages, refused = await answer_question(test["q"])
        passed = (not refused) if test["should_answer"] else refused
        if passed:
            correct_count += 1
            
        top_score = passages[0]["score"] if passages else 0.0
        results.append({
            "id": i,
            "type": test["type"],
            "question": test["q"],
            "passed": passed,
            "refused": refused,
            "top_score": round(top_score, 3),
            "expected_behavior": "Answer with citation" if test["should_answer"] else "Refuse out-of-scope"
        })
        
    accuracy = (correct_count / len(EVAL_TEST_SET)) * 100
    
    return {
        "repo": knowledge_base["repo"],
        "total_tests": len(EVAL_TEST_SET),
        "passed_tests": correct_count,
        "accuracy": round(accuracy, 1),
        "results": results
    }
