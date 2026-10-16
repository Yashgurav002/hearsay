import os
from pathlib import Path

# Load the repo-root .env (gitignored) without overriding real environment variables.
_env = Path(__file__).resolve().parents[2] / ".env"
if _env.exists():
    for line in _env.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.strip().partition("=")
        if sep and key and not key.startswith("#") and value:
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))
