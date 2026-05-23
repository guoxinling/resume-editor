# CODEX_HANDOFF.md - Jianliya Cleanup Baseline

> Date: 2026-05-23
> Status: cleanup in progress, landing retained, editor restored to online baseline

## Current Goal

This repo is being cleaned before the next round of product work.

The current rule is:

- Keep the new Material You landing page.
- Restore the editor, toolbar, AI panel, stores, prompts, export behavior, and other `src` code to the online stable baseline.
- Do not introduce Dashboard, new-resume modal, credits panel, settings entry, or AI copilot layout changes in this cleanup pass.
- Archive editor HTML prototypes instead of deleting them.
- Do not push or deploy from this cleanup pass unless explicitly requested.

## Verified Baseline

- Remote online baseline: `origin/main` at `7e99d41 Resume Editor - AI-powered resume builder`.
- Local branch currently contains later experimental commits, but the working tree has been cleaned so that `src` differs from `origin/main` only by the retained landing page.
- Build command: `npm run build`.

## Retained

- `src/components/LandingPage.tsx`: retained as the current new landing page.
- `design/homepage-material-you.html`: retained as landing reference.
- `design/ia-pages-material-you.html`: retained as IA reference.
- `design/diagnosis-report-demo.html`: retained as diagnosis reference.

## Archived

The editor redesign prototypes are reference-only and should not be treated as implementation source:

- `design/archive/editor-redesign-v2.html`
- `design/archive/editor-redesign-v3.html`
- `design/archive/editor-redesign-v4.html`

## Removed From Active Code Path

The following experimental components are not part of the current baseline:

- `CreditsPanel`
- `HistoryPanel`
- `NewResumeModal`
- `SettingsEntry`

They were part of previous exploration around credits, dashboard/history, and new-resume flows. These ideas may be revisited later, but they are not considered implemented.

## Current Product State

- Landing page: new Material You direction is retained.
- Editor: online stable editor layout and behavior are retained.
- AI panel: online stable AI tool panel is retained.
- Dashboard/workbench: not implemented in current baseline.
- New resume modal: not implemented in current baseline.
- AI contextual copilot redesign: not implemented in current baseline.
- Credits purchase/overlay UI: not implemented in current baseline.

## Known Next Steps

1. Finish cleanup verification with `npm run build`.
2. Confirm git status contains only expected cleanup changes.
3. Commit a clean baseline if requested.
4. After baseline is clean, plan the next product optimization from scratch, without inheriting the confusing v2/v3/v4 editor prototype structure.

## Important Caution

Do not treat older notes in `DEV_STATUS.md` or previous prototype files as current implementation truth. They contain historical exploration and may describe features that were intentionally rolled back.
