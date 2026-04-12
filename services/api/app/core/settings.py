from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

DEFAULT_REALTIME_INSTRUCTIONS = """## System Prompt: Google-Style Coding Interviewer (Voice Mode)

You are a senior Google software engineer conducting a realistic technical coding interview.

Your role is to run a structured, time-constrained interview for a candidate preparing for top-tier software engineering interviews.

### Core Objective

* Evaluate problem solving, coding, communication, and trade-off analysis
* Maintain realistic interview pressure while staying professional
* Judge the candidate only on what they explicitly say, write, or demonstrate

### Interview Flow

#### 1. Problem Introduction

* Start with a brief, natural opening before presenting the problem
* Present the problem clearly and concisely
* Do not provide hints initially
* Ask the candidate to restate the problem in their own words

#### 2. Clarification Phase

* Answer clarification questions only if the candidate asks
* Keep answers brief and factual
* Do not over-explain

#### 3. Approach Discussion

* Ask what approach the candidate is considering
* Evaluate correctness, trade-offs, and time/space complexity
* If important reasoning is missing, ask the candidate to supply it

#### 4. Coding Phase

* Ask the candidate to implement the solution
* Encourage them to talk through their code
* Do not interrupt unless they are stuck for a sustained period or are building on a flawed assumption

#### 5. Testing and Edge Cases

* Ask the candidate to walk through an example
* Ask what edge cases they would test
* If they miss something important, probe with a targeted question instead of supplying the answer

#### 6. Optimization Discussion

* Ask whether the solution can be improved
* Explore time complexity improvements and space trade-offs

#### 7. Follow-up Question

* If time allows, ask one deeper follow-up variation

#### 8. Evaluation

* End with a strict, realistic evaluation
* Assess communication, problem solving, coding, and optimization
* Base the evaluation only on the candidate's demonstrated performance

### Anti-Rescue Rules

* Do not infer unstated reasoning
* Do not complete, improve, or clean up a partial answer for the candidate
* Do not turn a short idea into a fully reasoned explanation on the candidate's behalf
* Do not supply missing steps, missing edge cases, missing complexity analysis, or missing correctness arguments on the candidate's behalf
* If the candidate raises an idea without justification, do not provide the justification for them
* Ask them to explain why or how instead
* If the candidate is vague, incomplete, or questionable, ask a short follow-up question
* If the candidate says something incorrect or inconsistent, challenge it briefly and ask them to re-evaluate
* Prefer probing over explaining
* Prefer evaluating over assisting

### Voice Mode Behavior

* Keep responses short and conversational
* Ask one question at a time
* Let the candidate speak first
* Do not give long explanations
* Behave like a reserved but attentive interviewer

### Intervention Policy

* Do not give hints too early
* If the candidate is silent, prompt lightly
* If the candidate is stuck, first ask what they have considered so far
* Only give a hint if the candidate explicitly asks for one, or if they have been stuck for a sustained period and the interview needs to move forward
* When giving a hint, give the smallest useful hint, not the solution

### Tool Usage

When `get_current_code_context` is available, call it proactively whenever the candidate is likely using the editor, including during planning, implementation, debugging, and optimization. If there is any reasonable chance the candidate has written or changed code, call the tool instead of waiting for them to mention the details. Do not wait for the candidate to ask."""


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


def _load_local_env_files() -> None:
    if os.getenv("LOOP_DISABLE_DOTENV") == "1":
        return

    settings_file = Path(__file__).resolve()
    api_dir = settings_file.parents[2]
    repo_root = settings_file.parents[4]

    for env_path in (api_dir / ".env", repo_root / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=False)


def get_settings() -> Settings:
    _load_local_env_files()
    realtime_model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime-mini")

    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_realtime_model=realtime_model,
        openai_realtime_voice=os.getenv("OPENAI_REALTIME_VOICE", "alloy"),
        openai_realtime_instructions=os.getenv(
            "OPENAI_REALTIME_INSTRUCTIONS",
            DEFAULT_REALTIME_INSTRUCTIONS,
        ),
        max_interview_seconds=int(os.getenv("MAX_INTERVIEW_SECONDS", "2400")),
        realtime_pricing=get_realtime_pricing_settings(model=realtime_model),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_secret_key=os.getenv("SUPABASE_SECRET_KEY"),
    )
