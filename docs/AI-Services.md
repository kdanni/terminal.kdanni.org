# AI Service Options for Watch List Research

This document summarizes no- or low-cost AI services and local models that can power the watch list assistant while respecting the requirement to return *watch list recommendations* (not financial advice).

## Hosted APIs with Free Tiers

| Provider | Key Models | Free Tier Highlights | Notes for Watch Lists |
| --- | --- | --- | --- |
| Hugging Face Inference API | Community models such as `HuggingFaceH4/zephyr-7b-beta`, `meta-llama/Meta-Llama-3-8B-Instruct`, `mistralai/Mistral-7B-Instruct` | Generous rate limits for personal tokens (~30 requests/minute depending on load) | Easy to swap models, supports temperature control, and keeps prompts server-side so no GPU is required locally. |
| Groq | `llama3-8b-8192`, `mixtral-8x7b-32768` | 30 requests/minute + 14K tokens/minute on the public beta | Ultra-low latency, so it is ideal for iterative watch list prompts that need rapid refresh cycles. |
| OpenRouter | Aggregation of Anthropic, Meta, Google, and open models | Free community credits for low-volume usage and transparent per-model pricing beyond that | One endpoint supports multiple models, so experimentation with tone/structure is simple. |

## Lightweight Local / Edge Options

| Tool | Model Support | Why it Helps |
| --- | --- | --- |
| Ollama | Pull-and-run images for `llama3`, `mistral`, `phi3`, etc. on macOS/Linux | Enables offline prototyping of the prompt template, ensuring "watch list recommendation" framing before calling cloud APIs. |
| GPT4All | Quantized `Mistral`, `LLaMA`, and `Phi` variants | GUI + local inference for analysts who cannot send prompts over the network. |
| LM Studio | Desktop runner for GGUF/GGML checkpoints | Useful for validating macro narratives locally prior to sharing outputs. |

## Recommendation

Start with the Hugging Face Inference API for the proof of concept because it offers:
- Straightforward REST calls from Node.js.
- Multiple open models that can reason about economic relevance (market cap, volumes, index weights) and sentiment-driven narratives (viral mentions, analyst tone).
- The flexibility to add custom instructions emphasizing forex pairs and crypto majors alongside the Magnificent Seven equities.

Once higher throughput is needed, Groq or OpenRouter can provide faster responses, while Ollama/GPT4All/LM Studio enable private experimentation.
