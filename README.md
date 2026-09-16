# Mr. TV's TelePrompter

A Lumiverse Spindle companion for the **I Love TV!** preset.

## What it does

- Runs one private background director generation before the visible response.
- Detects active I Love TV! modules from the assembled prompt.
- Stores affinity and continuity independently for each chat.
- Keeps each operator user's ledgers, connection lookup, background generation, and UI updates in that user's Lumiverse scope.
- Locks Pathfinding and D20 rolls to a user turn, so regenerate/continue/swipe cannot reroll or compound affinity.
- Injects the evaluated ledger into the visible generation as a named Prompt Breakdown entry.
- Captures `<cyoa_choices>` output into a persistent floating TV widget above the composer, with a pulsing red live light during generation and while choices are waiting.
- Can ask the selected background model to expand a clicked CYOA direction into an editable `{{user}}`-POV draft, or fall back to inserting the option number.
- Provides a per-chat author's note, configurable 1–10 turn continuity-tracker cadence, and a native input-bar Control Room action.
- Establishes an autonomous absolute affinity baseline from character/user lore, then applies action deltas on later turns.
- Keeps affinity read-only while allowing canon corrections to Dynamic Subtext, Immediate Episode Target, and Season Arc.

## Install / update

Install this repository from Lumiverse's Extensions panel. After updating the repository, use the extension's **Update** action and then disable/re-enable it so both backend and frontend bundles reload.

Required permissions: `generation`, `interceptor`, `chats`, and `ui_panels`.

## Troubleshooting

The manifest gives the interceptor a 110-second budget; the nested background call cancels itself after 90 seconds. The director requests a structured tool result and reserves 2,200 output tokens so reasoning models do not spend the entire budget before emitting the tracker payload. Choice-writing calls have a separate 120-second budget and show an animated progress indicator. If the background model fails, the visible generation still proceeds with a neutral fallback, marks the response diagnostics in Prompt Breakdown, and retries on the next regenerate/swipe instead of permanently caching the failure.

Open Prompt Breakdown for a generated response and look for **Control Room — Locked Director Pass**. Its presence confirms that the interceptor completed and injected its result.

Version 1.5.0 also accepts structured tool calls, text content blocks, and JSON emitted in the reasoning channel. If an older fallback remains after updating, disable/re-enable the extension (or restart Lumiverse) so the old backend worker is replaced.

