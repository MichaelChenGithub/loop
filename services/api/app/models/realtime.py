from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator

_INVALID_PLACEHOLDER_VALUES = {
    "cannot parse title",
    "cannot parse description",
    "cannot-parse-slug",
}


class RealtimeProblemExample(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class RealtimeProblem(BaseModel):
    slug: str
    title: str
    difficulty: Literal["Easy", "Medium", "Hard", "Unknown"]
    description: str
    examples: list[RealtimeProblemExample]
    constraints: list[str]

    @model_validator(mode="after")
    def validate_problem_content(self) -> "RealtimeProblem":
        normalized_slug = self.slug.strip().lower()
        normalized_title = self.title.strip().lower()
        normalized_description = self.description.strip().lower()

        if not normalized_slug or normalized_slug in _INVALID_PLACEHOLDER_VALUES:
            raise ValueError("problem.slug must contain a real problem identifier")
        if not normalized_title or normalized_title in _INVALID_PLACEHOLDER_VALUES:
            raise ValueError("problem.title must contain a real problem title")
        if not normalized_description or normalized_description in _INVALID_PLACEHOLDER_VALUES:
            raise ValueError("problem.description must contain a real problem description")

        return self


class RealtimeSessionRequest(BaseModel):
    problem: RealtimeProblem


class RealtimeSessionSummary(BaseModel):
    id: str
    model: str
    object: str
    type: str


class RealtimeClientSecretResponse(BaseModel):
    value: str
    expires_at: int
    session: RealtimeSessionSummary
