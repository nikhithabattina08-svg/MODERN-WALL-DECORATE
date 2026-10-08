# Hearth & Halo

A responsive artisan wall-hanging storefront with a chat assistant powered by a local Ollama model.

## Open the website

Open `index.html` in a browser. The storefront is static and requires no build step or package installation.

## Connect the local chat assistant

1. Install and start [Ollama](https://ollama.com/).
2. Download the model if needed: `ollama pull llama3.2:latest`
3. Make sure Ollama is listening at `http://localhost:11434`.
4. If the browser blocks requests, configure Ollama's `OLLAMA_ORIGINS` to allow the page's origin, then restart Ollama. For local development, `OLLAMA_ORIGINS=*` allows all origins; restrict this to trusted origins when possible.
5. Open the site's chat bubble. It checks Ollama for the model and sends chat requests to `/api/chat` on the local Ollama service.

The chat runs entirely against the visitor's local Ollama instance; no conversation is sent to a hosted AI service. The chat model can be changed in `script.js` by updating `MODEL_NAME`.
