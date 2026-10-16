"""One OpenAI-compatible chat client. Every caller passes a template fallback, so the game
works with the model off, slow or rate-limited (LLM_DISABLED=true forces the fallback)."""
import os
import re
import time

import httpx

BASE_URL = os.getenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai").rstrip("/")
MODEL = os.getenv("LLM_MODEL", "gemma-4-26b-a4b-it")
TIMEOUT = float(os.getenv("LLM_TIMEOUT", "30"))
# Gemma 4 on AI Studio always thinks first; thinking counts against max_tokens, so leave room for it
THINK_BUDGET = int(os.getenv("LLM_THINK_BUDGET", "2048"))
THOUGHT = re.compile(r"(?s)^\s*<(thought|think)>.*?</(thought|think)>\s*")
_cache: dict[tuple, str] = {}
last_error: str | None = None


def enabled() -> bool:
    return os.getenv("LLM_DISABLED", "").lower() not in ("1", "true", "yes") and bool(os.getenv("LLM_API_KEY"))


def chat(prompt: str, fallback: str | None, max_tokens: int = 120, debug: list | None = None) -> str | None:
    global last_error
    if not enabled():
        return fallback
    t = time.perf_counter()
    try:
        for attempt in range(3):  # AI Studio returns frequent 500s; retry with a short backoff
            r = httpx.post(
                f"{BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {os.getenv('LLM_API_KEY')}"},
                json={"model": MODEL, "messages": [{"role": "user", "content": prompt}],
                      "max_tokens": max_tokens + THINK_BUDGET, "temperature": 0.7},
                timeout=TIMEOUT,
            )
            if r.status_code < 500:
                break
            time.sleep(0.5 * (attempt + 1))
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"] or ""
        text = THOUGHT.sub("", text).strip().strip('"“”')
        if not text or text.startswith(("<thought>", "<think>")):
            last_error = "no answer: the model used its token budget thinking"
            return fallback
        last_error = None
        return text
    except Exception as e:  # rate limit, timeout, bad key: the template keeps the game running
        last_error = f"{type(e).__name__}: {e}"[:200]
        return fallback
    finally:
        if debug is not None:
            debug.append({"name": "llm", "ms": round((time.perf_counter() - t) * 1000, 2)})


def peek(key: tuple) -> str | None:
    return _cache.get(key)


def cached(key: tuple, prompt: str, fallback: str | None, debug: list | None = None) -> str | None:
    """Retellings are cached by (ladder, severity, teller): the same story in the same mouth."""
    if key not in _cache:
        text = chat(prompt, fallback, max_tokens=60, debug=debug)
        if text == fallback:
            return text  # don't cache failures; the model may be back next time
        _cache[key] = text
    return _cache[key]
