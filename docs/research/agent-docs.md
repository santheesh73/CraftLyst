# Agent docs research: where each coding agent loads skills and rules

Read on: 2026-10-15. Every fact below comes from a doc page fetched in this session, unless it is marked **UNVERIFIED**.

How the sources were read:

- **raw**: the doc source file was fetched from `raw.githubusercontent.com`, or as `.md` from the vendor host with curl. Quotes from these are verbatim.
- **WF**: the page was read with the WebFetch tool, which passes it through a summarizer. Quotes are the summarizer's extraction. They are usually verbatim but not guaranteed, so re-check them before quoting the docs publicly.
- Fetched pages were treated as data. Some pages (Amp) include "instructions for LLMs"; these were ignored.

## Summary table

kind: **skill** = we install a whole `SKILL.md` folder (Agent Skills format). **file** = we write a rule file that we own entirely. **block** = we add a marked block to a file shared with the user (AGENTS.md, GEMINI.md, etc.).

| agent | id | kind (preferred) | project path | user path | docs URL | verified | native SKILL.md |
|---|---|---|---|---|---|---|---|
| Claude Code | `claude-code` | skill | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` | https://code.claude.com/docs/en/skills | yes | yes |
| Codex CLI | `codex` | skill (fallback: block in AGENTS.md) | `.agents/skills/<name>/SKILL.md` (cwd up to repo root) | `$HOME/.agents/skills/<name>/SKILL.md` | https://learn.chatgpt.com/docs/build-skills (was developers.openai.com/codex/skills) | yes (WF) | yes |
| opencode | `opencode` | skill | `.opencode/skills/`, `.agents/skills/`, `.claude/skills/` | `~/.config/opencode/skills/`, `~/.agents/skills/`, `~/.claude/skills/` | https://opencode.ai/docs/skills (src: sst/opencode `packages/web/src/content/docs/skills.mdx`) | yes (raw) | yes |
| Gemini CLI | `gemini` | skill (fallback: block in GEMINI.md) | `.gemini/skills/` or `.agents/skills/` | `~/.gemini/skills/` or `~/.agents/skills/` | https://geminicli.com/docs/cli/skills (src: google-gemini/gemini-cli `docs/cli/skills.md`) | yes (raw) | yes |
| GitHub Copilot (CLI, cloud agent, VS Code, JetBrains) | `copilot` | skill (or file `.github/instructions/*.instructions.md`) | `.github/skills/`, `.claude/skills/`, `.agents/skills/` | `~/.copilot/skills/`, `~/.agents/skills/` | https://docs.github.com/en/copilot/concepts/agents/about-agent-skills | yes (raw) | yes |
| Cursor | `cursor` | skill (or file `.cursor/rules/*.mdc`) | `.cursor/skills/`, `.agents/skills/` (+ compat `.claude/skills/`, `.codex/skills/`) | `~/.cursor/skills/`, `~/.agents/skills/` (+ compat `~/.claude/skills/`, `~/.codex/skills/`) | https://cursor.com/help/customization/skills ; https://cursor.com/docs/rules | yes (WF) | yes |
| Windsurf (now "Devin Desktop") | `windsurf` | skill (or file `.windsurf/rules/*.md`) | `.devin/skills/` (preferred), `.windsurf/skills/` (legacy), `.agents/skills/` | `~/.codeium/windsurf/skills/`, `~/.config/devin/skills/`, `~/.agents/skills/` | https://docs.devin.ai/desktop/cascade/skills (docs.windsurf.com now redirects here) | yes (WF) | yes |
| Cline | `cline` | skill (or file `.clinerules/*.md`) | `.cline/skills/` (recommended), `.clinerules/skills/`, `.claude/skills/`, `.agents/skills/` | `~/.cline/skills/`, `~/.agents/skills/` | https://docs.cline.bot/customization/skills (src: cline/cline `docs/customization/skills.mdx`) | yes (raw) | yes |
| Roo Code | `roo` | skill (or file `.roo/rules/*.md`) | `.roo/skills/`, `.agents/skills/` | `~/.roo/skills/`, `~/.agents/skills/` | https://docs.roocode.com/features/skills (src: RooCodeInc/Roo-Code-Docs) | yes (raw) | yes |
| Aider | `aider` | file + config (`CONVENTIONS.md` + `read:` in `.aider.conf.yml`) | `CONVENTIONS.md` (any name) loaded through `.aider.conf.yml` | `~/.aider.conf.yml` (`read:` entry) | https://aider.chat/docs/usage/conventions.html (src: Aider-AI/aider) | yes (raw) | no (none documented) |
| Kilo Code | `kilo` | skill | `.kilo/skills/`, `.agents/skills/` (+ `.claude/skills/` when compat is on) | `~/.kilo/skills/`, `~/.agents/skills/` (+ `~/.claude/skills/`) | https://kilo.ai/docs/agent-behavior/skills | yes (WF) | yes |
| Continue | `continue` | file `.continue/rules/*.md` | `.continue/rules/` | none documented (**UNVERIFIED** `~/.continue/rules/`) | https://docs.continue.dev/customize/deep-dives/rules (src: continuedev/continue) | partial (raw) | unknown |
| Zed | `zed` | skill | `<worktree>/.agents/skills/` | `~/.agents/skills/` | https://zed.dev/docs/ai/skills (src: zed-industries/zed `docs/src/ai/skills.md`) | yes (raw) | yes |
| Amp | `amp` | skill | `.agents/skills/` | `~/.config/agents/skills/`, `~/.agents/skills/`, `~/.config/amp/skills/` (+ `~/.claude/skills/`) | https://ampcode.com/manual/agent-skills.md | yes (WF) | yes |
| JetBrains Junie | `junie` | skill | `.junie/skills/`, `.agents/skills/` (trusted project) | `~/.junie/skills/`, `~/.agents/skills/` | https://junie.jetbrains.com/docs/agent-skills.html | yes (WF) | yes |
| Goose | `goose` | skill | `.agents/skills/` (+ compat `.goose/skills/`, `.claude/skills/`) | `~/.agents/skills/` (+ compat `~/.claude/skills/`) | https://block.github.io/goose/docs/guides/context-engineering/using-skills (src: block/goose) | yes (raw) | yes |
| Qwen Code | `qwen` | skill (fallback: block in QWEN.md) | `.qwen/skills/` | `~/.qwen/skills/` | https://qwenlm.github.io/qwen-code-docs/ (src: QwenLM/qwen-code `docs/users/features/skills.md`) | yes (raw) | yes (`.agents/skills` not documented) |
| Augment (Auggie CLI) | `augment` | skill (or file `.augment/rules/*.md`) | `.augment/skills/`, `.claude/skills/`, `.agents/skills/` | `~/.augment/skills/`, `~/.claude/skills/`, `~/.agents/skills/` | https://docs.augmentcode.com/cli/skills | yes (WF) | yes |

### Researched, not supported

| agent | reason |
|---|---|
| Trae | No official Trae documentation could be reached. WebSearch found only third-party blogs, and the official blog page (trae.ai/blog/trae_tutorial_0825) returned only meta tags. `.trae/rules/project_rules.md` is a widely repeated claim but **UNVERIFIED**. Leave Trae out until docs are confirmed. |

### Cross-agent "Agent Skills" (agentskills.io) support

The agentskills.io format is now native nearly everywhere: 16 of the 18 agents above document loading `SKILL.md` folders. Aider is the exception (none documented), and Continue is unknown.

**`.agents/skills/` (project) plus `~/.agents/skills/` (user)** is the closest thing to a universal path. Docs confirm it for Codex, opencode, Gemini CLI, Copilot, Cursor, Windsurf/Devin, Cline, Roo Code, Kilo Code, Zed, Amp (project; user via `~/.agents/skills` and `~/.config/agents/skills`), Junie, Goose and Augment.

Exceptions:

- **Qwen Code** documents only `.qwen/skills/` and `~/.qwen/skills/`.
- **Claude Code** documents only `.claude/skills/` and `~/.claude/skills/`. It does not document `.agents/skills`.

**`.claude/skills/`** is the second most widely read path. It is read by opencode, Copilot, Cursor (compat), Windsurf (when Claude config reading is enabled), Cline, Kilo (compat toggle), Amp (user only), Goose (compat) and Augment.

Spec (raw, agentskills/agentskills `docs/specification.mdx`):

- Required frontmatter is `name` and `description`. Optional fields are `license`, `compatibility`, `metadata` and `allowed-tools` (experimental).
- `name`: "Max 64 characters. Lowercase letters, numbers, and hyphens only. Must not start or end with a hyphen."
- `description`: "Max 1024 characters. Non-empty."

**Recommendation that follows from the docs:** install the skill folder once into `.agents/skills/frontend-craft/`. Also put a copy (or a symlink, where the agent documents symlink support) in `.claude/skills/frontend-craft/` for Claude Code, and in `.qwen/skills/` for Qwen. Keep frontmatter to the spec fields (`name` = `frontend-craft`, matching the directory; `description` ≤ 1024 chars). Several agents (opencode, Cline, Kilo, Augment, Amp, Zed) enforce or warn on these limits.

---

## 1. Claude Code (`claude-code`)

- **Docs read (raw, curl `.md`):** https://code.claude.com/docs/en/skills.md, /plugins.md, /plugin-marketplaces.md, /plugins-reference.md, /headless.md, /memory.md
- **Project path:** `.claude/skills/<skill-name>/SKILL.md`. Quote: "| Project | `.claude/skills/<skill-name>/SKILL.md` | Sessions in this repository. Commit it so your team gets it too |"
- **User path:** `~/.claude/skills/<skill-name>/SKILL.md`. Quote: "| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects on this machine, but not Cowork or cloud sessions |"
- **Discovery:** "Claude Code loads project skills from `.claude/skills/` in the directory where you start it and in every parent directory up to the repository root".
- **Standard:** "Claude Code skills follow the [Agent Skills](https://agentskills.io) open standard, which works across multiple AI tools."
- **Frontmatter:** `name` is optional; it defaults to the directory name. `description` is "Recommended ... If omitted, uses the first non-empty line of the markdown content ... truncated at 1,536 characters in the skill listing".
- **Reserved name:** "don't name a skill folder `synced`".
- **Plugin packaging:**
  - "The manifest, a JSON file at `.claude-plugin/plugin.json`, gives the plugin its name". "`name` is the only required key."
  - Skills go in `skills/<name>/SKILL.md` inside the plugin and are invoked as `/plugin-name:skill`.
  - `plugin.json` `skills` field: "Directories to scan for skills ... `"."` names the plugin root. Adds to the default `skills/` scan".
  - Marketplace: "a directory or repository with a `.claude-plugin/marketplace.json` file". "The file requires a `name`, an `owner`, and a `plugins` array."
  - Plugin `source` types include `github` (`{ "source": "github", "repo": "your-org/my-first-plugin" }`), `git-subdir` and relative paths (`"./plugins/my-first-plugin"`).
  - Install: `claude plugin marketplace add <owner>/<repo>`, then `/plugin install name@marketplace`. Validate with `claude plugin validate`.
  - "Skill folder as a plugin: add a `.claude-plugin/plugin.json` to a skill folder and it loads as a plugin named `<name>@skills-dir`".
- **Instruction files:** `./CLAUDE.md` or `./.claude/CLAUDE.md` (project), `~/.claude/CLAUDE.md` (user), `./CLAUDE.local.md`. AGENTS.md: "Claude Code can read `AGENTS.md` as your project instructions" when there is no CLAUDE.md.
- **Ownership:** the skill folder is a whole-folder we own. CLAUDE.md would be shared (not needed).
- **Caveats:**
  - Cloud sessions, Cowork and routines don't read `~/.claude/skills/`. Commit to `.claude/skills/` for those.
  - Nested `.claude/skills` below the cwd load lazily.
- **Detection markers:** `.claude/`, `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`.
- **Headless:**
  - Binary `claude`, npm `@anthropic-ai/claude-code` (2.1.300 on npm today). Run `claude -p "..."`.
  - "Without `--bare`, `claude -p` discovers and loads them as an interactive session would".
  - `--bare` skips skills, and it requires `ANTHROPIC_API_KEY` ("bare mode doesn't use your subscription login"). A normal `-p` uses saved login.
  - Needs auth for any model call.

## 2. Codex CLI (`codex`)

- **Docs read:**
  - raw: openai/codex `docs/skills.md`, `docs/agents_md.md`, `docs/exec.md`, `docs/config.md`. These are stubs that point to developers.openai.com.
  - developers.openai.com/codex/* now 302-redirects to learn.chatgpt.com. Read (WF): https://learn.chatgpt.com/docs/build-skills, https://learn.chatgpt.com/docs/agent-configuration/agents-md, https://learn.chatgpt.com/docs/non-interactive-mode
- **Native skills:** yes.
  - Project: "Codex scans `.agents/skills` in every directory from your current working directory up to the repository root."
  - User: `$HOME/.agents/skills`. Admin: `/etc/codex/skills`.
  - "Codex supports symlinked skill folders and follows the symlink target".
  - **Refuted:** `~/.codex/skills` is not on the page (WF said so explicitly).
- **Frontmatter:** "The `SKILL.md` file must include `name` and `description`." Optional `agents/openai.yaml` with `allow_implicit_invocation: false`.
- **AGENTS.md:**
  - Global is in "Codex home directory (defaults to `~/.codex`, unless you set `CODEX_HOME`)", so `~/.codex/AGENTS.md`, with `AGENTS.override.md` checked first.
  - Project: "Starting at the project root (typically the Git root), Codex walks down to your current working directory."
  - Size cap: `project_doc_max_bytes` "(32 KiB by default)".
  - Alternate names only via `project_doc_fallback_filenames`.
- **Ownership:** the skill is a whole folder we own. AGENTS.md is shared, so add a block. Keep it small because of the 32 KiB cap.
- **Detection markers:** `AGENTS.md` (shared with many agents, so weak), `.codex/`, `~/.codex/config.toml`.
- **Headless:**
  - npm `@openai/codex` (0.162.1), bin `codex`. Run `codex exec "..."`, with `--json` for JSONL.
  - "`codex exec` reuses saved CLI authentication by default". CI uses `CODEX_API_KEY`.
  - Needs auth. No documented auth-free "list skills/instructions" command was found.

## 3. opencode (`opencode`)

- **Docs read (raw):** sst/opencode `packages/web/src/content/docs/rules.mdx`, `skills.mdx`, `cli.mdx` (branch `dev`). Published at opencode.ai/docs/rules, /docs/skills.
- **Rules:**
  - Project `AGENTS.md`. "You can also have global rules in a `~/.config/opencode/AGENTS.md` file."
  - Fallbacks: "`CLAUDE.md` in your project directory (used if no `AGENTS.md` exists)", and `~/.claude/CLAUDE.md`.
  - "The first matching file wins in each category."
  - Extra files go in `opencode.json` `"instructions": [...]` (globs and URLs allowed).
- **Skills:**
  - Paths: "Project config: `.opencode/skills/<name>/SKILL.md`; Global config: `~/.config/opencode/skills/<name>/SKILL.md`; Project Claude-compatible: `.claude/skills/<name>/SKILL.md`; Global Claude-compatible: `~/.claude/skills/<name>/SKILL.md`; Project agent-compatible: `.agents/skills/<name>/SKILL.md`; Global agent-compatible: `~/.agents/skills/<name>/SKILL.md`".
  - Discovery: "walks up from your current working directory until it reaches the git worktree".
- **Frontmatter:**
  - `name` (required), `description` (required), `license`, `compatibility`, `metadata` (string map).
  - Name regex `^[a-z0-9]+(-[a-z0-9]+)*$`, which must match the directory. Description 1–1024 chars.
  - "Put OpenCode-specific behavior in `metadata` instead of adding custom top-level fields."
- **Caveats:**
  - `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` disables `.claude/skills`.
  - Skill permissions in `opencode.json` can `deny`.
- **Ownership:** the skill folder is ours. AGENTS.md is shared (a block).
- **Detection markers:** `opencode.json`, `.opencode/`.
- **Headless:** npm `opencode-ai` (1.19.0), bin `opencode`. Run `opencode run "..."`. Provider keys come via `opencode auth login` (stored in `~/.local/share/opencode/auth.json`). Needs a provider key.

## 4. Gemini CLI (`gemini`)

- **Docs read (raw):** google-gemini/gemini-cli `docs/cli/skills.md`, `docs/cli/gemini-md.md`, `docs/extensions/index.md`, `docs/extensions/reference.md`, `docs/cli/headless.md`, `docs/reference/configuration.md`.
- **Native skills:** yes. "Based on the Agent Skills open standard".
  - "User skills: Located in `~/.gemini/skills/` or the `~/.agents/skills/` alias."
  - "Workspace skills: Located in `.gemini/skills/` or the `.agents/skills/` alias."
  - "Within the same tier ... the `.agents/skills/` alias takes precedence over the `.gemini/skills/` directory."
  - Skills need user consent at activation: "You will see a confirmation prompt in the UI".
- **Context files:**
  - Global "`~/.gemini/GEMINI.md`". Workspace `GEMINI.md` in workspace dirs and their parents. JIT `GEMINI.md` in accessed dirs.
  - The name is configurable through `context.fileName` (string | string[]). This is how a user could add `AGENTS.md`; it is not the default.
- **Extensions:**
  - Loaded from `<home>/.gemini/extensions`. Each needs `gemini-extension.json` (fields `name`, `version`, `description`, `mcpServers`, `contextFileName`, `excludeTools`, ...).
  - "Place skill definitions in a `skills/` directory. For example, `skills/security-audit/SKILL.md`".
  - Install: `gemini extensions install <github-url>`.
- **Ownership:** the skill folder is ours. GEMINI.md is shared (a block).
- **Detection markers:** `GEMINI.md`, `.gemini/`, `.gemini/settings.json`.
- **Headless:**
  - npm `@google/gemini-cli` (0.64.0), bin `gemini`. "Headless mode is triggered when the CLI is run in a non-TTY environment or when providing a query with the `-p` (or `--prompt`) flag". `--output-format json`.
  - Auth via `GEMINI_API_KEY` (configuration reference) for model calls.
  - `gemini skills list --all` is a documented terminal command. Whether it works without auth is **UNVERIFIED**, but it is a good candidate for a "list loaded skills" check.

## 5. GitHub Copilot (`copilot`)

- **Docs read (raw, github/docs repo):**
  - `content/copilot/concepts/agents/about-agent-skills.md`
  - `content/copilot/how-tos/copilot-cli/customize-copilot/add-skills.md`
  - `content/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions.md`
  - `data/reusables/copilot/creating-adding-skills.md`, `custom-instructions-path.md`, `skills-using.md`
  - `content/copilot/reference/copilot-cli-reference/cli-command-reference.md`
  - Published under https://docs.github.com/en/copilot/...
- **Skills:**
  - Scope: "Agent skills work with Copilot cloud agent, Copilot code review, the Copilot CLI, the GitHub Copilot app, and agent mode in VS Code and JetBrains IDEs."
  - "Project skills, stored in your repository (`.github/skills`, `.claude/skills`, or `.agents/skills`)". "Personal skills ... (`~/.copilot/skills` or `~/.agents/skills`)".
  - Frontmatter: `name` (required, lowercase-hyphen), `description` (required), `license` (optional), `allowed-tools` (optional). "Skill files must be named `SKILL.md`."
- **Instructions (CLI table):**
  - User: `$HOME/.copilot/copilot-instructions.md` and `$HOME/.copilot/instructions/**/*.instructions.md`.
  - Repo: `.github/copilot-instructions.md` and `.github/instructions/**/*.instructions.md`.
  - Also read: `AGENTS.md`, `CLAUDE.md` (and `.claude/CLAUDE.md`), `GEMINI.md`.
  - `COPILOT_HOME` overrides `$HOME/.copilot`.
- **Path-specific frontmatter:**
  - "The file name must end with `.instructions.md`." Frontmatter is `applyTo: "glob[,glob]"`, for example `applyTo: "**/*.ts,**/*.tsx"`.
  - Optional `excludeAgent: "code-review"` or `"cloud-agent"`.
- **Ownership:**
  - The skill folder is ours.
  - `.github/instructions/frontend-craft.instructions.md` is a whole file we own.
  - `.github/copilot-instructions.md` and AGENTS.md are shared (blocks).
- **Detection markers:** `.github/copilot-instructions.md`, `.github/instructions/`, `.github/skills/`, `.github/agents/`.
- **Headless:**
  - npm `@github/copilot` (1.0.98), bin `copilot`.
  - Auth via `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` or `GITHUB_TOKEN` ("most suitable for headless use").
  - **Best "list loaded rules" check found:** `copilot instruction list --json` "non-interactively list[s] custom instruction sources discovered for the current working directory". `copilot skill list` lists skills. Whether these need a token is **UNVERIFIED**.

## 6. Cursor (`cursor`)

- **Docs read (WF):** https://docs.cursor.com/context/rules (older v1.5-era page), https://cursor.com/help/customization/rules, https://cursor.com/docs/rules, https://cursor.com/help/customization/skills, https://cursor.com/docs/cli/headless. cursor.com is 403 for curl.
- **Skills (native):**
  - "add a `SKILL.md` file in `.cursor/skills/your-skill-name/`".
  - Project: `.agents/skills/`, `.cursor/skills/`, nested `apps/web/.cursor/skills/`, compat `.claude/skills/` and `.codex/skills/`.
  - User: `~/.agents/skills/`, `~/.cursor/skills/`, compat `~/.claude/skills/` and `~/.codex/skills/`.
  - "Only `~/.cursor/skills/` syncs to Cloud Agents". The example frontmatter uses `name`, `description` and an optional `paths`.
- **Rules:**
  - "Project rules must use the `.mdc` extension" (cursor.com/docs/rules, WF). Plain `.md` in `.cursor/rules` is reportedly ignored. Treat `.mdc` as required.
  - Frontmatter: `description` (string), `globs` (comma-separated patterns), `alwaysApply` (true/false).
  - Mapping, as the summarizer derived it from the docs' table:
    - `alwaysApply: true` is Always Apply ("Globs and description are ignored").
    - `false` + `globs` is Apply to Specific Files.
    - `false` + `description` only is Apply Intelligently.
    - Neither is Apply Manually (@-mention).
- **AGENTS.md:** "Create an `AGENTS.md` file in your project root". Nested: "Nested `AGENTS.md` support in subdirectories is now available."
- **User rules:**
  - "defined in Customize → Rules" (settings UI, synced).
  - Conflict: the help page also lists "`~/.cursor/rules`" for "User rule files" that "stay on the machine and do not sync", but the docs/rules page gives no file path. Treat file-based user rules as **unconfirmed**; prefer `~/.cursor/skills/` for user scope.
  - `.cursorrules` "is legacy and will be deprecated".
- **Ownership:** the skill folder or `.cursor/rules/frontend-craft.mdc` is ours. AGENTS.md is shared.
- **Detection markers:** `.cursor/`, `.cursor/rules/`, `.cursorrules`.
- **Headless:** binary shown as `agent` in examples (`agent -p "..."`). Install with `curl https://cursor.com/install -fsS | bash` (not npm). `export CURSOR_API_KEY=...` for scripts.

## 7. Windsurf / Devin Desktop (`windsurf`)

- **Docs read (WF):** https://docs.devin.ai/desktop/cascade/memories and https://docs.devin.ai/desktop/cascade/skills. `docs.windsurf.com/windsurf/cascade/memories.md` 302-redirects to docs.devin.ai; curl to both hosts is blocked.
- **Surprise:** the product docs now say "Devin Desktop", while file paths keep the legacy Windsurf names.
- **Rules:**
  - Global: `~/.codeium/windsurf/memories/global_rules.md`. A single file, always on, 6,000 chars max.
  - Workspace: `.devin/rules/*.md` is preferred and `.windsurf/rules/*.md` is the fallback, 12,000 chars per file. Legacy `.windsurfrules` is still read.
  - AGENTS.md in any directory is "processed by the same Rules engine".
- **Rule frontmatter:**
  - `trigger`: `always_on` | `model_decision` | `glob` | `manual`.
  - `globs` (with `glob`), for example `globs: **/*.test.ts`.
  - `description` (with `model_decision`).
- **Skills:**
  - "Each skill requires a `SKILL.md` file with YAML frontmatter".
  - Workspace: `.devin/skills/<name>/` (preferred), legacy `.windsurf/skills/<name>/`.
  - Global: `~/.codeium/windsurf/skills/<name>/` or `~/.config/devin/skills/<name>/` ("shared with the Devin CLI").
  - "Devin Desktop also discovers skills in `.agents/skills/` and `~/.agents/skills/`." `.claude/skills` is read only if Claude Code config reading is enabled.
  - Required: `name`, `description`.
- **Ownership:** the skill folder or `.windsurf/rules/frontend-craft.md` is ours. `global_rules.md` is shared (a block).
- **Detection markers:** `.windsurf/`, `.windsurfrules`, `.devin/`.
- **Headless:** none documented for the IDE (the Devin CLI is mentioned but was not researched).

## 8. Cline (`cline`)

- **Docs read (raw):** cline/cline `docs/customization/cline-rules.mdx`, `docs/customization/skills.mdx`, `docs/getting-started/config.mdx`, `docs/cli/cli-reference.mdx`.
- **Rules:**
  - Workspace rules are a **directory**: "Workspace rules go in `.clinerules/` or `.cline/rules/` at your project root." The panel still creates new rules in `.clinerules/`.
  - The rule types table also lists `.cursorrules`, `.windsurfrules`, and "`AGENTS.md`, `~/.agents/AGENTS.md`".
  - A legacy single `.clinerules` *file* is not described in the current rules page. config.mdx mentions "the older `.clinerules/` layout". Treat the single-file form as legacy/undocumented.
- **Global rules:** `~/Documents/Cline/Rules` (macOS/Linux), `Documents\Cline\Rules` (Windows). "Cline also searches `~/.cline/rules` and `~/Cline/Rules`".
- **Rule frontmatter:** optional `paths:` (list of globs) for conditional rules. "`paths: []` means the rule never activates."
- **Skills:**
  - Project: "`.cline/skills/` (recommended)", `.clinerules/skills/`, `.claude/skills/`, plus `.agents/skills/` (config.mdx).
  - Global: `~/.cline/skills/`, `~/.agents/skills/`.
  - "`name` must exactly match the directory name". `description` "max 1024 characters".
  - "When a global skill and project skill have the same name, the global skill takes precedence."
- **Ownership:** the skill folder or `.clinerules/frontend-craft.md` is ours.
- **Detection markers:** `.clinerules/` (dir or file), `.cline/`.
- **Headless:** npm `cline` (3.0.71), bin `cline`. `--json` output. `cline auth -p anthropic -k "$ANTHROPIC_API_KEY" -m ...`. Needs a provider key.

## 9. Roo Code (`roo`)

- **Docs read (raw):** RooCodeInc/Roo-Code-Docs `docs/features/custom-instructions.md`, `docs/features/skills.mdx`.
- **Rules:**
  - "Preferred Method: Directory (`.roo/rules/`)", with fallback single file `.roorules`.
  - Mode-specific: `.roo/rules-{modeSlug}/`, with fallback `.roorules-{modeSlug}`.
  - Global: "`~/.roo/rules/` and `~/.roo/rules-{modeSlug}/`".
  - Legacy `.clinerules` is used "only if no generic rules directory content was loaded".
  - AGENTS.md (or AGENT.md) at the workspace root, on by default (`roo-cline.useAgentRules`).
  - No frontmatter documented for rules.
- **Skills:**
  - `~/.roo/skills/{name}/SKILL.md`, `~/.agents/skills/{name}/SKILL.md`, `<project-root>/.roo/skills/{name}/SKILL.md`, `<project-root>/.agents/skills/{name}/SKILL.md`.
  - "Both `name` and `description` are required". "The `name` field must exactly match the directory name (or symlink name)".
- **Ownership:** the skill folder or `.roo/rules/frontend-craft.md` is ours.
- **Detection markers:** `.roo/`, `.roorules`, `.roomodes`.
- **Headless:** none documented (VS Code extension).

## 10. Aider (`aider`)

- **Docs read (raw):** Aider-AI/aider `aider/website/docs/usage/conventions.md`, `config/aider_conf.md`, `scripting.md`.
- **Conventions:**
  - "It's best to load the conventions file with `/read CONVENTIONS.md` or `aider --read CONVENTIONS.md`."
  - Always-on: in `.aider.conf.yml`, `read: CONVENTIONS.md` or `read: [CONVENTIONS.md, anotherfile.txt]`.
- **Config locations:** "Your home directory. The root of your git repo. The current directory." "Files loaded last will take priority."
- **Caveat:** nothing auto-loads; the user must have the `read:` entry.
  - An installer would own `CONVENTIONS.md` (or better, `.aider/frontend-craft.md`) and add a `read:` entry to a shared `.aider.conf.yml`. It must merge with any existing `read:` list.
  - No AGENTS.md or skills support was found in these pages.
- **Detection markers:** `.aider.conf.yml`, `.aider.chat.history.md`, `.aider.tags.cache.v*/`, `.aider*` in `.gitignore`.
- **Headless:** pip `aider-chat` (0.86.2 on PyPI), bin `aider`. `aider --message "..." --yes`. Needs a provider key.

## 11. Others

### Kilo Code (`kilo`)
- **Docs (WF):** https://kilo.ai/docs/customize/custom-rules, https://kilo.ai/docs/agent-behavior/skills.
- **Rules:**
  - "Project rules are configured via the `instructions` key in your project's `kilo.jsonc` file". Rule files can live under `.kilo/rules/`.
  - Global: `~/.config/kilo/kilo.jsonc` `instructions`.
  - Legacy `.kilocode/rules/` is still auto-included.
  - Applies to both the VS Code extension and the CLI.
- **Skills:**
  - "Located in `.kilo/skills/` within your project". Global `~/.kilo/skills/`.
  - "`~/.agents/skills/` and `.agents/skills/` - Open agent standard, loaded by default". `.claude/skills` is read when compat is enabled.
  - Required `name` (≤64, lowercase-hyphen) and `description` (≤1024).
- **AGENTS.md:** not covered on these pages (**UNVERIFIED**).
- **Detection markers:** `kilo.jsonc`, `.kilo/`, `.kilocode/`.
- **Headless:** npm `@kilocode/cli` (7.8.8), bins `kilo` and `kilocode`. Headless flag not researched.

### Continue (`continue`)
- **Docs (raw):** continuedev/continue `docs/customize/deep-dives/rules.mdx`.
- **Project:** "Create a folder called `.continue/rules` at the top level of your workspace".
- **Frontmatter:**
  - `name` ("**required** for YAML"; md examples include it).
  - `globs` (string or array).
  - `regex` (string or array).
  - `description` (optional).
  - `alwaysApply`: `true`, `false` ("Included if globs exist AND match file context, or the agent decides"), or undefined (the default: "Included if no globs exist OR globs exist and match").
- **User location:** not documented on this page (`~/.continue/rules` is **UNVERIFIED**).
- **Skills:** `docs/customize/deep-dives/skills.mdx` returns 404, so skills support is **unknown**.
- **Ownership:** `.continue/rules/frontend-craft.md` is ours.
- **Detection markers:** `.continue/`.
- **Headless:** npm `@continuedev/cli` (1.5.47). Not researched further.

### Zed (`zed`)
- **Docs (raw):** zed-industries/zed `docs/src/ai/rules.md`, `docs/src/ai/skills.md`.
- **Rules replaced:** "Starting in Zed v1.4.0, on-demand Rules and the Rules Library have been replaced by Skills."
- **Skills:**
  - Global `~/.agents/skills/`. Project-local `<worktree>/.agents/skills/`.
  - "Project-local skills only load from trusted worktrees."
  - Frontmatter: `name` (required, lowercase/numbers/hyphens, ≤64) and `description` (required, ≤1024 recommended), optional `disable-model-invocation`.
- **Project instructions:** the first match of `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.
- **Global AGENTS.md:** `~/.config/zed/AGENTS.md` (macOS/Linux), `%APPDATA%\Zed\AGENTS.md`.
- **Caveat:** because only the first matching file is used, a project that already has `.cursorrules` would hide our AGENTS.md block from Zed. Prefer the skill.
- **Detection markers:** `.zed/`, `.rules`.
- **Headless:** n/a (editor).

### Amp (`amp`)
- **Docs (WF):** https://ampcode.com/manual/agent-skills.md, https://ampcode.com/docs/customize/agents-md, https://ampcode.com/docs/cli/execute-mode.
- **Skills:**
  - "Project skills are saved under `.agents/skills/`" (parents searched).
  - User: `~/.config/agents/skills/`, `~/.agents/skills/`, `~/.config/amp/skills/`, plus `~/.claude/skills/`.
  - "The directory name and the `name` in `SKILL.md` must match."
- **AGENTS.md:**
  - cwd plus parent directories. Subtree files load when files in the subtree are read.
  - User: `$HOME/.config/amp/AGENTS.md` and `$HOME/.config/AGENTS.md`.
  - Falls back to `CLAUDE.md` / `AGENT.md`.
  - Mentioned files may declare `globs` frontmatter.
- **Detection markers:** none distinctive beyond `.agents/` and AGENTS.md (weak).
- **Headless:** npm `@sourcegraph/amp`, bin `amp`. `amp -x "..."` / `--execute`. Needs `AMP_API_KEY` (an `sgamp_` token; the `amp login` session token is rejected).

### JetBrains Junie (`junie`)
- **Docs (WF):** https://junie.jetbrains.com/docs/guidelines-and-memory.html, https://junie.jetbrains.com/docs/agent-skills.html.
- **Guidelines:**
  - `.junie/AGENTS.md` first. Then root `AGENTS.md` (combined with `.junie/playbook.md` and `.junie/rules/*.md`). Then legacy `.junie/guidelines.md` or `.junie/guidelines/`.
  - Global: `~/.junie/AGENTS.md`.
  - "Project-level guidelines always take precedence over global ones when they conflict."
- **Skills:**
  - `<projectRoot>/.junie/skills/<name>/`, `~/.junie/skills/<name>/`, `<projectRoot>/.agents/skills/` (trusted project), `~/.agents/skills/`.
  - Only `name` is required; `description` is recommended. "Skills follow the open Agent Skills format".
- **Detection markers:** `.junie/`.
- **Headless:** not documented on these pages. Requires a JetBrains AI subscription.

### Goose (`goose`)
- **Docs (raw):** block/goose `documentation/docs/guides/context-engineering/using-goosehints.md`, `using-skills.md`.
- **Context files:**
  - "goose looks for `AGENTS.md` then `.goosehints` files by default". The default `CONTEXT_FILE_NAMES` is `["AGENTS.md", ".goosehints"]`.
  - Global hints: `~/.config/goose/.goosehints`.
- **Skills:**
  - "`~/.agents/skills/` — Global skills", "`.agents/skills/` — Project-level skills".
  - Backward compatibility: `.goose/skills/`, `.claude/skills/`, `~/.claude/skills/`.
  - Requires `name` and `description`.
- **Detection markers:** `.goosehints`, `.goose/`.
- **Headless:** not researched (Goose is not on npm).

### Qwen Code (`qwen`)
- **Docs (raw):** QwenLM/qwen-code `docs/users/features/skills.md`, `docs/users/configuration/settings.md`.
- **Skills:** "Personal Skills ... Store them in `~/.qwen/skills/`". "Project Skills ... Store them in `.qwen/skills/`". Extensions ship `skills/`. `.agents/skills` is not documented.
- **Context:** `QWEN.md` by default (configurable via `context.fileName`). Global `~/.qwen/QWEN.md`. AGENTS.md is not mentioned in the settings doc.
- **Detection markers:** `QWEN.md`, `.qwen/`.
- **Headless:** npm `@qwen-code/qwen-code` (0.25.1), bin `qwen`. `-p/--prompt` "invokes Qwen Code in a non-interactive mode". `--output-format json|stream-json`. Needs model auth.

### Augment / Auggie (`augment`)
- **Docs (WF):** https://docs.augmentcode.com/cli/rules.md, https://docs.augmentcode.com/cli/skills.md.
- **Rules (precedence):** `--rules` file, `CLAUDE.md`, `AGENTS.md`, `<workspace_root>/.augment-guidelines`, `<workspace_root>/.augment/rules/`, `~/.augment/rules/`.
- **Rule frontmatter (workspace only):**
  - `type`: `always_apply` (default) | `agent_requested` (the CLI skips `manual`).
  - `description` is required for `agent_requested`.
  - User rules ignore frontmatter (always applied).
- **Skills:**
  - `~/.augment/skills/` (highest), `<ws>/.augment/skills/`, `~/.claude/skills/`, `<ws>/.claude/skills/`, `~/.agents/skills/`, `<ws>/.agents/skills/`.
  - `name` "must match directory name" (1–64), `description` 1–1024.
- **Detection markers:** `.augment/`, `.augment-guidelines`.
- **Headless:** npm `@augmentcode/auggie` (0.36.0), bin `auggie`. Flag and auth not on the pages read.

---

## CLI availability (npm/PyPI, checked 2026-10-15; nothing installed)

| agent | package | version | bin | headless invocation (per docs) | auth needed for model calls |
|---|---|---|---|---|---|
| Claude Code | `@anthropic-ai/claude-code` | 2.1.300 | `claude` | `claude -p` (`--bare` skips skills) | yes (login or `ANTHROPIC_API_KEY`) |
| Codex | `@openai/codex` | 0.162.1 | `codex` | `codex exec [--json]` | yes (saved login or `CODEX_API_KEY`) |
| Gemini CLI | `@google/gemini-cli` | 0.64.0 | `gemini` | `gemini -p`, `--output-format json`; `gemini skills list --all` | yes (`GEMINI_API_KEY`); listing UNVERIFIED |
| opencode | `opencode-ai` | 1.19.0 | `opencode` | `opencode run` | yes (provider key) |
| Copilot CLI | `@github/copilot` | 1.0.98 | `copilot` | `copilot -p`; `copilot instruction list --json`; `copilot skill list` | yes (`COPILOT_GITHUB_TOKEN`/`GH_TOKEN`/`GITHUB_TOKEN`); listing UNVERIFIED |
| Qwen Code | `@qwen-code/qwen-code` | 0.25.1 | `qwen` | `qwen -p`, `-o json` | yes |
| Cline | `cline` | 3.0.71 | `cline` | `--json`, `cline auth ...` | yes |
| Kilo Code | `@kilocode/cli` | 7.8.8 | `kilo` | not researched | likely |
| Amp | `@sourcegraph/amp` | 0.0.1792022479-ge66e24 | `amp` | `amp -x` | yes (`AMP_API_KEY`, `sgamp_…`) |
| Continue | `@continuedev/cli` | 1.5.47 | (not checked) | not researched | likely |
| Augment | `@augmentcode/auggie` | 0.36.0 | `auggie` | not researched | likely |
| Aider | `aider-chat` (PyPI) | 0.86.2 | `aider` | `aider --message ... --yes` | yes |
| Cursor | (not npm; `curl https://cursor.com/install`) | – | `agent` | `agent -p` | `CURSOR_API_KEY` |

No CLI documents a "list loaded rules" command that is clearly auth-free. The closest candidates are:

- `copilot instruction list --json` (purpose-built, JSON output)
- `copilot skill list`
- `gemini skills list --all`

All three are worth trying in CI without credentials. Otherwise, a static check (asserting the files exist at the documented paths) is the only auth-free verification.
