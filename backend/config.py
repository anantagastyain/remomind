import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
CHROMA_DIR = DATA_DIR / "chroma"
CHROMA_DIR.mkdir(exist_ok=True)

# Google AI Studio / Gemma configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemini-1.5-flash") # or google/gemma-3-4b-it / gemma-2-9b-it

# GitHub REST API configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Server configuration
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Embedding configuration
EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
CHUNK_SIZE = 150
CHUNK_OVERLAP = 40
TOP_K = 5
RELEVANCE_THRESHOLD = 0.28
REFUSAL_MESSAGE = "The answer could not be found in the provided repository documentation or codebase."
