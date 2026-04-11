from __future__ import annotations

from app.core.settings import DEFAULT_REALTIME_INSTRUCTIONS, get_settings


def test_default_realtime_instructions_uses_google_style_prompt() -> None:
    assert DEFAULT_REALTIME_INSTRUCTIONS.startswith(
        "## System Prompt: Google-Style Coding Interviewer (Voice Mode)"
    )
    assert "You are a **senior Google software engineer" in DEFAULT_REALTIME_INSTRUCTIONS
    assert "### Tone Calibration (Important)" in DEFAULT_REALTIME_INSTRUCTIONS


def test_get_settings_defaults_to_gpt_realtime_mini(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_REALTIME_MODEL", raising=False)

    settings = get_settings()

    assert settings.openai_realtime_model == "gpt-realtime-mini"
    assert settings.realtime_pricing.model == "gpt-realtime-mini"
    assert settings.realtime_pricing.text_input_per_million_tokens == 0.60
    assert settings.realtime_pricing.text_cached_input_per_million_tokens == 0.06
    assert settings.realtime_pricing.text_output_per_million_tokens == 2.40
    assert settings.realtime_pricing.audio_input_per_million_tokens == 10.00
    assert settings.realtime_pricing.audio_cached_input_per_million_tokens == 0.30
    assert settings.realtime_pricing.audio_output_per_million_tokens == 20.00
    assert settings.realtime_pricing.image_input_per_million_tokens == 0.80
    assert settings.realtime_pricing.image_cached_input_per_million_tokens == 0.08


def test_get_settings_allows_env_overrides_for_model_and_pricing(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_REALTIME_MODEL", "gpt-realtime")
    monkeypatch.setenv("OPENAI_REALTIME_PRICING_MODEL", "custom-realtime-pricing")
    monkeypatch.setenv("OPENAI_REALTIME_TEXT_INPUT_PER_MILLION_TOKENS", "1.23")
    monkeypatch.setenv("OPENAI_REALTIME_TEXT_CACHED_INPUT_PER_MILLION_TOKENS", "0.12")
    monkeypatch.setenv("OPENAI_REALTIME_TEXT_OUTPUT_PER_MILLION_TOKENS", "4.56")
    monkeypatch.setenv("OPENAI_REALTIME_AUDIO_INPUT_PER_MILLION_TOKENS", "7.89")
    monkeypatch.setenv(
        "OPENAI_REALTIME_AUDIO_CACHED_INPUT_PER_MILLION_TOKENS",
        "0.45",
    )
    monkeypatch.setenv("OPENAI_REALTIME_AUDIO_OUTPUT_PER_MILLION_TOKENS", "9.87")
    monkeypatch.setenv("OPENAI_REALTIME_IMAGE_INPUT_PER_MILLION_TOKENS", "6.54")
    monkeypatch.setenv(
        "OPENAI_REALTIME_IMAGE_CACHED_INPUT_PER_MILLION_TOKENS",
        "0.65",
    )

    settings = get_settings()

    assert settings.openai_realtime_model == "gpt-realtime"
    assert settings.realtime_pricing.model == "custom-realtime-pricing"
    assert settings.realtime_pricing.text_input_per_million_tokens == 1.23
    assert settings.realtime_pricing.text_cached_input_per_million_tokens == 0.12
    assert settings.realtime_pricing.text_output_per_million_tokens == 4.56
    assert settings.realtime_pricing.audio_input_per_million_tokens == 7.89
    assert settings.realtime_pricing.audio_cached_input_per_million_tokens == 0.45
    assert settings.realtime_pricing.audio_output_per_million_tokens == 9.87
    assert settings.realtime_pricing.image_input_per_million_tokens == 6.54
    assert settings.realtime_pricing.image_cached_input_per_million_tokens == 0.65
def test_default_realtime_instructions_includes_proactive_tool_usage() -> None:
    assert "### Tool Usage" in DEFAULT_REALTIME_INSTRUCTIONS
    assert "get_current_code_context" in DEFAULT_REALTIME_INSTRUCTIONS
    assert "proactively" in DEFAULT_REALTIME_INSTRUCTIONS
    assert "approach planning" in DEFAULT_REALTIME_INSTRUCTIONS
