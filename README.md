# Mr. TV's TelePrompter

A Lumiverse Spindle companion for the **I Love TV!** preset.

## What it does

- Runs one private background director generation before the visible response.
- Detects active I Love TV! modules from the assembled prompt.
- Stores affinity and continuity independently for each chat.
- Locks Pathfinding and D20 rolls to a user turn, so regenerate/continue/swipe cannot reroll or compound affinity.
- Injects the evaluated ledger into the visible generation as a named Prompt Breakdown entry.
- Captures `<cyoa_choices>` output into a persistent floating TV widget above the composer, with a pulsing red live light during generation and while choices are waiting.
- Can ask the selected background model to expand a clicked CYOA direction into an editable `{{user}}`-POV draft, or fall back to inserting the option number.
- Provides a per-chat author's note, configurable 1–10 turn continuity-tracker cadence, and a native input-bar Control Room action.
- Displays affinity and continuity as autonomous read-only trackers rather than manual text fields.

## Install / update

Install this repository from Lumiverse's Extensions panel. After updating the repository, use the extension's **Update** action and then disable/re-enable it so both backend and frontend bundles reload.

Required permissions: `generation`, `interceptor`, `chats`, and `ui_panels`.

## Troubleshooting

The manifest gives the interceptor a 45-second budget; the nested background call cancels itself after 25 seconds. If the background model fails, the visible generation still proceeds with a neutral fallback, marks that status in Prompt Breakdown, and retries on the next regenerate/swipe instead of permanently caching the failure.

Open Prompt Breakdown for a generated response and look for **Control Room — Locked Director Pass**. Its presence confirms that the interceptor completed and injected its result.

