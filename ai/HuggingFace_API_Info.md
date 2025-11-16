Hugging Face shut down the old api-inference.huggingface.co endpoint. It now returns 410 Gone, which is an explicit “this API is permanently removed” signal. They replaced it with the new unified Hugging Face Inference Router at:

`https://router.huggingface.co/hf-inference`

---

404 is expected, and yes, the way you pass the model has changed.

The error message from HF is a bit misleading on its own. The new recommended way is:

- Base URL (OpenAI-style):
 `https://router.huggingface.co/v1`
- Endpoint: /chat/completions, /embeddings, etc.
- Model name: goes in the JSON body ("model": "…") – not in the path. 

So if you were doing something like:
```
POST https://router.huggingface.co/hf-inference/models/gpt2
Body: { "inputs": "..." }
```
that will reliably give you 404 Not Found with the router, as you’ve seen. There is an open GitHub issue where someone does exactly this and gets 404s. 

**How to call it now (Node / TS)**
Using OpenAI-compatible style:
```ts
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const completion = await client.chat.completions.create({
  model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", // or any router-supported model
  messages: [
    { role: "user", content: "Generate a watchlist recommendation..." },
  ],
});

console.log(completion.choices[0].message.content);
```

Under the hood this hits:
```
POST https://router.huggingface.co/v1/chat/completions
```

and the model is only in the JSON payload, not the path.

---

**About /hf-inference/models/...**

There is a lower-level route of the form:

```
https://router.huggingface.co/hf-inference/models/:model_provider/:model_id/v1/chat/completions
```

where `:model_provider` and `:model_id` are path params (e.g. `hf-inference/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B/...`). 


Key details:
- You can’t just stick gpt2 after /models/ and expect it to work.
- The model must actually be available via the hf-inference provider; you can filter those in the Hub UI by “Inference provider: HF 
- The payload shape is no longer the old { "inputs": ... } text-generation format; it’s OpenAI-style "messages" or similar, depending on endpoint.

Given you “just” want the watchlist recommender working again, the simplest, least-magic fix is:

- Stop using https://router.huggingface.co/hf-inference/... directly.
- Use baseURL = "https://router.huggingface.co/v1" and:
 - /chat/completions for LLM stuff,
 - /embeddings for vector encoders, etc., with the model passed in the JSON body.


That shifts you onto the officially documented, OpenAI-compatible surface instead of reverse-engineering the router path, and makes future breakage less likely.