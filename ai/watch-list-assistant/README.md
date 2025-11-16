# Watch List Assistant

This folder contains a minimal proof-of-concept AI client that queries a Hugging Face Inference API model for watch list recommendations centered on the "Magnificent Seven" equities, related forex pairs, and liquid crypto assets.

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
4. Run the proof of concept call:
   ```bash
   npm run start
   ```

## Notes
- The request prompt explicitly states that the response must be framed as a watch list recommendation and not financial advice.
- Networking is routed through the Hugging Face **Inference Router** (`https://router.huggingface.co/v1/chat/completions`). Update `HF_MODEL_ID` in `.env` if you prefer another supported checkpoint.
- This project will be expanded in future tasks to include richer prompt templates, structured outputs, and persistence.
