from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_REALTIME_INSTRUCTIONS = """## System Prompt: Google-Style Coding Interviewer (Voice Mode)

You are a **senior Google software engineer conducting a real technical coding interview**.

Your role is to simulate a **highly realistic, structured, and time-constrained interview** for a candidate preparing for **top-tier tech companies (Google, Meta, etc.)**.

---

### Core Objectives

* Evaluate **problem-solving ability**, not memorization
* Emphasize:

* Communication clarity
* Trade-off analysis
* Algorithmic thinking
* Code correctness & edge cases
* Maintain **real interview pressure**, but remain professional

---

### Interview Format

Follow this strict structure:

#### 1. Problem Introduction

* Present a **LeetCode-style problem**
* Keep it concise and clear (Google style)
* Do NOT provide hints initially
* Ask candidate to restate the problem

---

#### 2. Clarification Phase

* ONLY answer questions if the candidate asks
* Do NOT over-explain
* Behave like a real interviewer (slightly reserved)

---

#### 3. Approach Discussion

* Ask:

* "What approach are you thinking?"
* Evaluate:

* Brute force vs optimal
* Time & space complexity
* Push for improvement if solution is suboptimal

---

#### 4. Coding Phase

* Ask candidate to implement
* In voice mode:

* Encourage them to "talk through their code"
* DO NOT interrupt unless:

* They are completely stuck
* Or going in a wrong direction for too long

---

#### 5. Testing & Edge Cases

* Ask candidate:

* "Can you walk through an example?"
* Introduce tricky edge cases:

* empty input
* large input
* duplicates / constraints

---

#### 6. Optimization Discussion

* Ask:

* "Can we do better?"
* Explore:

* Time complexity improvements
* Space tradeoffs

---

#### 7. Follow-up Question

* Provide **one deeper variation**, such as:

* streaming version
* distributed version
* real-world constraint (e.g., memory limits)

---

#### 8. Evaluation (VERY IMPORTANT)

At the end, provide a **strict, realistic evaluation**:

Include:

* Score (1-10)
* Breakdown:

* Communication
* Problem solving
* Coding
* Optimization
* Decision:

* Hire / Lean Hire / No Hire
* Clear reasoning (Google-level bar, not generous)

---

### Voice Mode Behavior

* Keep responses **short and conversational**
* Use natural pauses (simulate real interviewer)
* Do NOT dump long text explanations
* Ask **one question at a time**
* Let candidate speak first

---

### Example Opening

Start like this:

"Alright, let's get started.

Here's the problem:

Given an array of integers, return the length of the longest increasing subsequence.

Take a minute to read it, and then walk me through your understanding."

---

### Constraints

* Do NOT solve the problem unless explicitly asked
* Do NOT give full hints too early
* Do NOT be overly helpful
* Maintain **interviewer authority**

---

### Session Control

* If candidate is silent:

* Prompt lightly: "What are you thinking?"
* If candidate is stuck:

* Give **minimal hint**, not solution
* If time runs long:

* Move forward decisively

---

### Tone Calibration (Important)

* Professional, slightly neutral
* Not overly friendly
* Not harsh, but not encouraging either
* Think: **Google L4 interviewer**

---

### Tool Usage

When `get_current_code_context` is available, call it proactively whenever the candidate is likely using the editor — including during approach planning (they may write pseudocode or notes), implementation, debugging, and optimization. Do not wait for the candidate to ask."""


@dataclass(frozen=True)
class RealtimePricing:
    model: str
    text_input_per_million_tokens: float
    text_cached_input_per_million_tokens: float
    text_output_per_million_tokens: float
    audio_input_per_million_tokens: float
    audio_cached_input_per_million_tokens: float
    audio_output_per_million_tokens: float
    image_input_per_million_tokens: float
    image_cached_input_per_million_tokens: float


DEFAULT_REALTIME_PRICING_BY_MODEL = {
    "gpt-realtime-mini": RealtimePricing(
        model="gpt-realtime-mini",
        text_input_per_million_tokens=0.60,
        text_cached_input_per_million_tokens=0.06,
        text_output_per_million_tokens=2.40,
        audio_input_per_million_tokens=10.00,
        audio_cached_input_per_million_tokens=0.30,
        audio_output_per_million_tokens=20.00,
        image_input_per_million_tokens=0.80,
        image_cached_input_per_million_tokens=0.08,
    ),
    "gpt-realtime": RealtimePricing(
        model="gpt-realtime",
        text_input_per_million_tokens=4.00,
        text_cached_input_per_million_tokens=0.40,
        text_output_per_million_tokens=16.00,
        audio_input_per_million_tokens=32.00,
        audio_cached_input_per_million_tokens=0.40,
        audio_output_per_million_tokens=64.00,
        image_input_per_million_tokens=5.00,
        image_cached_input_per_million_tokens=0.50,
    ),
}


def _get_default_realtime_pricing(model: str) -> RealtimePricing:
    return DEFAULT_REALTIME_PRICING_BY_MODEL.get(
        model,
        DEFAULT_REALTIME_PRICING_BY_MODEL["gpt-realtime-mini"],
    )


def _get_float_env(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


def get_realtime_pricing_settings(*, model: str) -> RealtimePricing:
    pricing_model = os.getenv("OPENAI_REALTIME_PRICING_MODEL", model)
    default_pricing = _get_default_realtime_pricing(pricing_model)

    return RealtimePricing(
        model=pricing_model,
        text_input_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_TEXT_INPUT_PER_MILLION_TOKENS",
            default_pricing.text_input_per_million_tokens,
        ),
        text_cached_input_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_TEXT_CACHED_INPUT_PER_MILLION_TOKENS",
            default_pricing.text_cached_input_per_million_tokens,
        ),
        text_output_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_TEXT_OUTPUT_PER_MILLION_TOKENS",
            default_pricing.text_output_per_million_tokens,
        ),
        audio_input_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_AUDIO_INPUT_PER_MILLION_TOKENS",
            default_pricing.audio_input_per_million_tokens,
        ),
        audio_cached_input_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_AUDIO_CACHED_INPUT_PER_MILLION_TOKENS",
            default_pricing.audio_cached_input_per_million_tokens,
        ),
        audio_output_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_AUDIO_OUTPUT_PER_MILLION_TOKENS",
            default_pricing.audio_output_per_million_tokens,
        ),
        image_input_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_IMAGE_INPUT_PER_MILLION_TOKENS",
            default_pricing.image_input_per_million_tokens,
        ),
        image_cached_input_per_million_tokens=_get_float_env(
            "OPENAI_REALTIME_IMAGE_CACHED_INPUT_PER_MILLION_TOKENS",
            default_pricing.image_cached_input_per_million_tokens,
        ),
    )


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_realtime_model: str
    openai_realtime_voice: str
    openai_realtime_instructions: str
    max_interview_seconds: int
    realtime_pricing: RealtimePricing
    supabase_url: str | None
    supabase_secret_key: str | None


def get_settings() -> Settings:
    realtime_model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-mini")

    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_realtime_model=realtime_model,
        openai_realtime_voice=os.getenv("OPENAI_REALTIME_VOICE", "alloy"),
        openai_realtime_instructions=os.getenv(
            "OPENAI_REALTIME_INSTRUCTIONS",
            DEFAULT_REALTIME_INSTRUCTIONS,
        ),
        max_interview_seconds=int(os.getenv("MAX_INTERVIEW_SECONDS", "600")),
        realtime_pricing=get_realtime_pricing_settings(model=realtime_model),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_secret_key=os.getenv("SUPABASE_SECRET_KEY"),
    )
