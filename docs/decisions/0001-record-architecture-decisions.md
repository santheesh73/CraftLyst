# ADR-0001: Record architecture decisions

- Status: accepted
- Date: 2026-10-14

## Context

Frontend Craft is built in phases with gates. Choices about dependencies, layout,
and security must be reviewable by people who were not present when they were made.

## Decision

Record each significant decision as a numbered Markdown ADR in `docs/decisions/`.
Every runtime or dev dependency needs an ADR before it is added.

## Consequences

Reviewers can check a dependency or policy against its ADR. Superseded ADRs stay in
place with a pointer to their replacement.
