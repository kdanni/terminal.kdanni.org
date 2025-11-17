# Watch List Assistant

This folder contains an AI client that queries a Hugging Face Inference API model for watch list recommendations centered on the "Magnificent Seven" equities, related forex pairs, and liquid crypto assets.

## Setup
1. Ensure Node.js 18+ is installed so that the built-in `fetch` API is available.
2. Copy the sample environment file and populate it with your Hugging Face credentials:
   ```bash
   cd ai/watch-list-assistant
   cp .env.example .env
   # edit .env and set HF_API_KEY plus any optional overrides
   ```
3. Install dependencies (only required the first time):
   ```bash
   npm install
   ```
4. Run the assistant:
   ```bash
   npm run start
   ```

### Iterating, logging, and resuming conversations
Every run writes a timestamped JSON transcript to `./logs/` containing the system prompt plus
the user/assistant turns for each plan phase. Use these files to review how the assistant
progressed or to continue a partially completed iteration.

- Start a **new** run (creates a fresh transcript automatically):
  ```bash
  npm run start
  ```
- **Resume** from a prior transcript and continue with the next planned phase/iteration:
  ```bash
  npm run start -- --resume ./logs/transcript-2025-02-19T19-42-11-123Z.json
  ```

### Minimal API testrun
Use the lightweight `testrun` script to send a minimal `model + messages` payload to the Hugging Face router and print the exact JSON body before it leaves the client:

```bash
npm run testrun
```

The transcript also stores the shared context so the assistant can keep refining the watch
list across iterations without losing prior reasoning.

## Persisting fine-tuned watch lists
The assistant now resolves each asset returned by the fine-tuning phase against a small
catalog (seeded from `sql/seeds/timescale/watch_list_entries.sql` and additional static
aliases). Use the new CLI flags to store a normalized payload once convergence is
reached:

```bash
npm run start -- \
  --write-resolved \
  --output-dir ./ai-output \
  --output-format csv \
  --emit-sql
```

Flags:

| Flag | Description |
| --- | --- |
| `--write-resolved` | Enables the resolver + persistence adapter. |
| `--output-dir <path>` | Directory for JSON/CSV output (defaults to `./ai-output`). |
| `--output-format <json|csv>` | Storage format for the normalized payload (defaults to JSON). |
| `--filename-base <name>` | Prefix for generated files (defaults to `resolved-watch-list`). |
| `--emit-sql` | Writes a Timescale-friendly upsert statement alongside the structured file. |

The emitted JSON/CSV payload contains `{symbol, exchange, active}` rows plus the AI
commentary so that downstream jobs can import the watch list into the canonical
`asset_watch_list` table without additional mapping.

## Notes
- The request prompt explicitly states that the response must be framed as a watch list recommendation and not financial advice.
- Networking is routed through the Hugging Face **Inference Router** (`https://router.huggingface.co/v1/chat/completions`). Update `HF_MODEL_ID` in `.env` if you prefer another supported checkpoint.
- This project will be expanded in future tasks to include richer prompt templates, structured outputs, and persistence.
