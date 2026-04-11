from __future__ import annotations

from app.core.prompt_compiler import compile_realtime_instructions
from app.models.realtime import RealtimeProblem


def test_compile_realtime_instructions_preserves_base_prompt_and_appends_problem_block() -> None:
    problem = RealtimeProblem.model_validate(
        {
            "slug": "two-sum",
            "title": "Two Sum",
            "difficulty": "Easy",
            "description": "Given an array of integers nums and an integer target.",
            "examples": [
                {
                    "input": "nums = [2,7], target = 9",
                    "output": "[0,1]",
                    "explanation": "nums[0] + nums[1] == 9",
                },
                {
                    "input": "nums = [3,2,4], target = 6",
                    "output": "[1,2]",
                },
            ],
            "constraints": [
                "2 <= nums.length <= 10^4",
                "-10^9 <= nums[i] <= 10^9",
                "Only one valid answer exists.",
            ],
        }
    )

    instructions = compile_realtime_instructions(
        "## System Prompt\nYou are a strict interviewer.",
        problem,
    )

    assert instructions.startswith("## System Prompt\nYou are a strict interviewer.")
    assert "\n---\n\n## Current Interview Problem\n" in instructions
    assert "Slug: two-sum" in instructions
    assert "Title: Two Sum" in instructions
    assert "Difficulty: Easy" in instructions
    assert "Description:\nGiven an array of integers nums and an integer target." in instructions
    assert "Examples:\n1. Input: nums = [2,7], target = 9\n   Output: [0,1]" in instructions
    assert "   Explanation: nums[0] + nums[1] == 9" in instructions
    assert "2. Input: nums = [3,2,4], target = 6\n   Output: [1,2]" in instructions
    assert (
        "Constraints:\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- Only one"
        " valid answer exists."
    ) in instructions
    assert (
        "Interviewer directive: Ask only about this problem, use it as the active interview"
        " prompt, do not substitute another question, and keep follow-ups anchored to this"
        " problem."
    ) in instructions


def test_compile_realtime_instructions_hardens_against_problem_switch_requests() -> None:
    problem = RealtimeProblem.model_validate(
        {
            "slug": "two-sum",
            "title": "Two Sum",
            "difficulty": "Easy",
            "description": "Given an array of integers nums and an integer target.",
            "examples": [],
            "constraints": [],
        }
    )

    instructions = compile_realtime_instructions(
        "## System Prompt\nYou are a strict interviewer.",
        problem,
    )

    assert "Treat the provided problem as immutable session context." in instructions
    assert "Do not replace, rewrite, swap, or invent a different problem" in instructions
    assert "If the user asks for another question, refuse briefly" in instructions
    assert "Only change problems when the application provides a new problem block." in instructions
