# Documentation site for Kiln, a config-file linter

Kiln is a fictional open-source CLI. The command names and options in this brief are the
spec; there is no real package behind them.

## Who it is for

Developers who land from a search engine on one page, copy a command, and leave.

## What to build

A static docs site of three pages (`index.html`, `install.html`, `rules.html`) sharing one
stylesheet, no build step.

## Content

- Sidebar navigation: Getting started (Introduction, Installation) and Reference (Rules,
  Configuration), with the current page marked.
- Introduction: what Kiln does in two paragraphs and a quick-start code block
  (`npm install --save-dev kiln-lint`, then `npx kiln check`).
- Installation: npm, pnpm, and yarn tabs, and the note "Requirements: Node 20 or later".
- Rules: a table of six rules (`no-duplicate-keys`, `no-tabs`, `max-depth`, `sorted-keys`,
  `no-empty-values`, `final-newline`) with severity and a one-line description; each rule
  has an anchored heading and a bad and good example.
- An on-page table of contents for the Rules page, and copy buttons on code blocks.

## Constraints

- Code blocks scroll horizontally inside themselves, never the page.
- Headings have linkable anchors; there is a skip link to the content.
- The sidebar collapses behind a menu button under 768px.
- Light and dark themes.
