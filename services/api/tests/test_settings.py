from __future__ import annotations

from app.core.settings import DEFAULT_REALTIME_INSTRUCTIONS


def test_default_realtime_instructions_uses_google_style_prompt() -> None:
    assert DEFAULT_REALTIME_INSTRUCTIONS.startswith(
        "## System Prompt: Google-Style Coding Interviewer (Voice Mode)"
    )
    assert "You are a **senior Google software engineer" in DEFAULT_REALTIME_INSTRUCTIONS
    assert "### Tone Calibration (Important)" in DEFAULT_REALTIME_INSTRUCTIONS
