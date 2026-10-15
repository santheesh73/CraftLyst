# Chat interface for Wren, a research assistant

Wren is a fictional AI research assistant for policy analysts. Conversation text is sample
content.

## Who it is for

Policy analysts who ask long questions, paste documents, and need to see sources for every
answer.

## What to build

A React + Vite app (TypeScript optional). Include `package.json` with `dev`, `build`, and
`typecheck` or `lint` scripts. Assistant replies are mocked locally; no network calls.

## Content

- Left rail: a list of conversations ("Housing permits 2025", "Transit fare elasticity",
  "School meal uptake"), a New conversation button, and a settings link.
- Main thread: user and assistant messages; assistant messages show a citations row with
  numbered source chips that expand to show a title and an excerpt.
- Composer: multi-line input, an attach-file button (accepts .pdf and .txt, shows the file
  name as a chip only), a send button, and a stop button while a mocked reply streams.
- States: empty conversation with three suggested prompts; streaming; error with retry; a
  long code block and a wide table inside a message.

## Constraints

- Keyboard: Enter sends, Shift+Enter adds a newline; focus returns to the composer.
- Streaming text is announced politely to screen readers without flooding them.
- Works at 375px with the rail collapsed behind a toggle.
- `npm run build` must succeed.
