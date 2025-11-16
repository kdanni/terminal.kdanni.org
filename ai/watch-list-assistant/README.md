# Watch List Assistant

This folder contains a minimal proof-of-concept AI client that queries a Hugging Face Inference API model for watch list recommendations centered on the "Magnificent Seven" equities, related forex pairs, and liquid crypto assets.

## Setup
1. Ensure Node.js 18+ is installed so that the built-in `fetch` API is available.
2. Export a Hugging Face API token with access to hosted text-generation models:
   ```bash
   export HF_API_TOKEN=hf_xxx
   ```
3. Run the proof of concept call:
   ```bash
   npm run start
   ```

## Notes
- The request prompt explicitly states that the response must be framed as a watch list recommendation and not financial advice.
- Networking is deferred to the Hugging Face hosted model (`HuggingFaceH4/zephyr-7b-beta`). You can swap the `MODEL_ID` constant in `src/index.js` if you prefer another supported checkpoint.
- This project will be expanded in future tasks to include richer prompt templates, structured outputs, and persistence.
