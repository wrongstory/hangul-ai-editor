# Project Workflow

## 1. Basic Principle

This project should be managed through GitHub repositories, GitHub Issues, branches, Pull Requests, and CI/CD.

Actual setup work must happen only after explicit user approval.

Codex must not perform project initialization, remote repository creation, default branch changes, release work, or `main` merges without approval.

## 2. Branch Strategy

```text
main
- Stable release branch only.
- No direct feature development.
- Receives only verified release-ready versions from dev.

dev
- Main development branch.
- GitHub default branch.
- All feature branches start from dev.

feature/*
- Used for larger feature work.
- Examples:
  - feature/project-bootstrap
  - feature/hwpx-loader
  - feature/ai-chat-sidebar

fix/*
- Used for bug fixes.

chore/*
- Used for setup, documentation, build, and CI/CD maintenance.

release/*
- Used for release preparation.
```

## 3. Standard Work Flow

```text
1. Create or select a GitHub Issue.
2. Update dev.
3. Create a task branch from dev.
4. Implement the work.
5. Run tests.
6. Verify behavior.
7. Commit meaningful changes.
8. Open a Pull Request.
9. Merge into dev after verification.
10. Merge dev into main only for release-ready versions.
```

## 4. GitHub Issue Policy

Each meaningful task should be tracked with a GitHub Issue.

Issue content should include:

- Purpose
- Scope
- Acceptance criteria
- Test method
- Related branch
- Related Pull Request

Large work should be split into checklist items or separate issues.

## 5. Commit Convention

Use this format:

```text
type: summary
```

Recommended types:

```text
feat      Add a feature
fix       Fix a bug
docs      Documentation change
chore     Setup, tooling, maintenance
test      Add or update tests
refactor  Refactor without behavior change
ci        CI/CD configuration
```

Examples:

```text
chore: initialize project structure
ci: configure pull request checks
feat: add hwpx document loader
feat: add ai chat sidebar
fix: handle empty document blocks
docs: add project workflow guide
```

## 6. CI/CD Principle

Initial CI/CD should include:

- Install check
- Lint
- Type check
- Tests
- Build

Pull Requests into `dev` should pass CI before merge.

Release merges into `main` should happen only after `dev` is verified.

## 7. Approval Policy

The following require explicit user approval:

- New project initialization
- Git repository initialization
- GitHub remote creation or connection
- GitHub Issue creation
- GitHub default branch change
- `dev` branch creation
- Merge into `main`
- Release branch creation
- CI/CD setup
- Package installation
- External service or API connection
- Deployment setup

## 8. Current Stage

The project has been initialized as a Tauri + React + TypeScript + Vite application.

Current development should continue from `dev` through task branches, with `main` reserved for release-ready versions.
