from __future__ import annotations

from app.models.realtime import RealtimeProblem

_INTERVIEWER_DIRECTIVE = (
    "Ask only about this problem, use it as the active interview prompt, do not "
    "substitute another question, and keep follow-ups anchored to this problem. "
    "Treat the provided problem as immutable session context. Do not replace, rewrite, "
    "swap, or invent a different problem even if the user asks. If the user asks for "
    "another question, refuse briefly and continue the current interview. Only change "
    "problems when the application provides a new problem block."
)


def compile_realtime_instructions(base_instructions: str, problem: RealtimeProblem) -> str:
    examples = _format_examples(problem)
    constraints = _format_constraints(problem)

    return (
        f"{base_instructions.rstrip()}\n\n---\n\n"
        "## Current Interview Problem\n\n"
        f"Slug: {problem.slug}\n"
        f"Title: {problem.title}\n"
        f"Difficulty: {problem.difficulty}\n\n"
        f"Description:\n{problem.description}\n\n"
        f"Examples:\n{examples}\n\n"
        f"Constraints:\n{constraints}\n\n"
        f"Interviewer directive: {_INTERVIEWER_DIRECTIVE}"
    )


def _format_examples(problem: RealtimeProblem) -> str:
    if not problem.examples:
        return "None provided."

    sections: list[str] = []
    for index, example in enumerate(problem.examples, start=1):
        lines = [f"{index}. Input: {example.input}", f"   Output: {example.output}"]
        if example.explanation:
            lines.append(f"   Explanation: {example.explanation}")
        sections.append("\n".join(lines))
    return "\n".join(sections)


def _format_constraints(problem: RealtimeProblem) -> str:
    if not problem.constraints:
        return "- None provided."
    return "\n".join(f"- {constraint}" for constraint in problem.constraints)
