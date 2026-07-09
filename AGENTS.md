# Codex Project Instructions

## Scope

This project is for building an AI-assisted editor for Korean Hangul document files.

Do not initialize a framework, install packages, connect GitHub, create branches, create issues, or configure CI/CD without explicit user approval.

## Before Starting Work

Codex must inspect the current state first:

- Current directory
- Git repository status
- Current branch
- Remote configuration
- Existing project files
- Uncommitted changes
- Package manager files

If the project has not been initialized yet, propose a plan and wait for approval before creating code.

## Branch Strategy

- `main`: release-only stable branch
- `dev`: default development branch
- `feature/*`: feature work branched from `dev`
- `fix/*`: bug fixes
- `chore/*`: setup, documentation, CI, and maintenance
- `release/*`: release preparation

All implementation work should happen on a task branch created from `dev`, then be merged back to `dev` after testing.

## Approval Required

Ask for user approval before:

- Creating or deleting project files beyond the requested documentation
- Initializing a Git repository
- Connecting a GitHub remote
- Creating GitHub Issues or Pull Requests
- Creating or changing branches
- Changing the default branch
- Installing dependencies
- Adding CI/CD workflows
- Connecting external APIs or services
- Merging into `main`
- Creating a release

## Product Rule

The app should not be limited to Hangul 2020. It should be designed as a Hangul document family editor, with `.hwpx` as the initial reliable format and `.hwp`, `.hwt`, and Hancom automation support added later.

