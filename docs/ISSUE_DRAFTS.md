# Issue Drafts

## Issue 1: Project Bootstrap

Title:

```text
Project bootstrap: local Tauri React app and GitHub workflow
```

Labels:

```text
chore, bootstrap
```

Body:

```md
## Purpose

Track the completed initial project bootstrap and remaining repository setup tasks.

## Completed

- Initialized Tauri + React + TypeScript + Vite project
- Added initial product and workflow documentation
- Added Mock AI sidebar flow
- Added Hangul-editor-style shell UI
- Added GitHub Actions CI workflow
- Created local `main` and `dev` branches
- Pushed `main` and `dev` to GitHub
- Changed repository default branch from `main` to `dev`

## Verification

- `npm.cmd run lint` passed
- `npm.cmd run typecheck` passed
- `npm.cmd run build` passed
- Local browser render check passed
- Mock AI proposal flow checked

## Remaining

- Add branch protection rules
- Confirm GitHub Actions status on pushed branches
- Install Rust and verify Tauri desktop runtime

## Branches

- Stable release branch: `main`
- Development branch: `dev`
```

## Issue 2: Implement HWPX Loader MVP

Title:

```text
Implement HWPX loader MVP
```

Labels:

```text
feat, hwpx, mvp
```

Body:

```md
## Purpose

Add the first real document import path for `.hwpx` files.

## Scope

- Select local `.hwpx` file
- Unzip package
- Parse core XML document content
- Extract headings and paragraphs
- Convert parsed content into the internal document block model
- Show parsed content in the editor page

## Out of Scope

- Perfect layout reproduction
- Complex tables
- Images and shapes
- `.hwp` binary support

## Acceptance Criteria

- User can open a simple `.hwpx` file
- Paragraph text appears in the editor
- Basic heading/paragraph structure is preserved
- Invalid or unsupported files show a friendly error
- Existing mock document still works when no file is loaded
```

## Issue 3: Wire AI Sidebar to Real Editing Actions

Title:

```text
Wire AI sidebar to document editing actions
```

Labels:

```text
feat, ai, editor
```

Body:

```md
## Purpose

Turn the current Mock AI sidebar into a structured editing workflow that can later call a real AI API.

## Scope

- Keep selected block context
- Generate structured change proposal
- Show before/after preview
- Apply accepted changes
- Cancel rejected changes
- Store a simple change history entry

## Acceptance Criteria

- AI proposal never overwrites text automatically
- Apply updates only the target block
- Cancel leaves the document unchanged
- User can keep editing after applying a proposal
```

## Issue 4: Verify Tauri Desktop Runtime

Title:

```text
Verify Tauri desktop runtime on Windows
```

Labels:

```text
chore, tauri, windows
```

Body:

```md
## Purpose

Install the missing Rust toolchain and verify the app runs as a Tauri desktop application.

## Current Blocker

`rustc` and `cargo` are not installed on the current Windows environment.

## Scope

- Install Rust toolchain
- Verify `cargo --version`
- Run `npm.cmd run tauri dev`
- Fix any Tauri configuration issues

## Acceptance Criteria

- Tauri desktop window opens
- Existing React UI renders in the desktop shell
- No TypeScript, Vite, or Tauri startup errors remain
```
