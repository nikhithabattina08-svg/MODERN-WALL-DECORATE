const OLLAMA_URL = "http://localhost:11434";
const MODEL_NAME = "llama3.2:latest";
const SYSTEM_PROMPT = `You are the friendly, thoughtful studio assistant for Hearth & Halo, a small artisan wall-hanging shop. Help visitors choose decor, explain materials and sizing, and discuss custom orders. Keep replies warm, concise, and useful. The collection currently includes The Sunday Weave ($168; cotton rope and natural oak), The Tidepool Hanging ($214; reclaimed linen and sea glass), and The Little Daydream ($96; organic cotton and walnut). Pieces are handmade in small batches. Never claim to know inventory, exact dimensions, shipping timelines, or policies unless provided; invite the visitor to share their wall size, colors, and style preferences. For details the site does not provide, say the studio can confirm them. Do not invent product facts.`;

const chatPanel = document.querySelector("#chat-panel");
const chatLauncher = document.querySelector("#chat-launcher");
const chatClose = document.querySelector("#chat-close");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSend = document.querySelector("#chat-send");
const chatMessages = document.querySelector("#chat-messages");
const connectionLabel = document.querySelector("#connection-label");
const connectionDot = document.querySelector("#connection-dot");
const quickPrompts = document.querySelector("#quick-prompts");
const conversation = [];
let isSending = false;

function setConnectionState(state, label) {
  connectionDot.className = `connection-dot ${state}`;
  connectionLabel.textContent = label;
}

async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data = await response.json();
    const hasModel = data.models?.some((model) => model.name === MODEL_NAME);
    setConnectionState(hasModel ? "online" : "offline", hasModel ? "Llama 3.2 is ready" : "Model not found — run ollama pull llama3.2:latest");
  } catch {
    setConnectionState("offline", "Ollama is offline — start it to chat");
  }
}

function openChat(prefill = "") {
  chatPanel.classList.add("is-open");
  chatPanel.setAttribute("aria-hidden", "false");
  chatLauncher.setAttribute("aria-expanded", "true");
  chatInput.focus();
  if (prefill) {
    chatInput.value = prefill;
    chatInput.dispatchEvent(new Event("input", { bubbles: true }));
    chatForm.requestSubmit();
  }
}

function closeChat() {
  chatPanel.classList.remove("is-open");
  chatPanel.setAttribute("aria-hidden", "true");
  chatLauncher.setAttribute("aria-expanded", "false");
  chatLauncher.focus();
}

function addMessage(text, role) {
  const row = document.createElement("div");
  row.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;
  if (role !== "user") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "h";
    row.append(avatar);
  }
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;
  row.append(bubble);
  chatMessages.append(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return row;
}

function setSending(sending) {
  isSending = sending;
  chatSend.disabled = sending;
  chatInput.disabled = sending;
  if (!sending) chatInput.focus();
}

async function sendMessage(text) {
  if (isSending || !text.trim()) return;
  const message = text.trim();
  addMessage(message, "user");
  conversation.push({ role: "user", content: message });
  quickPrompts.hidden = true;
  chatInput.value = "";
  setSending(true);

  const typing = addMessage("", "assistant");
  const typingBubble = typing.querySelector(".message-bubble");
  typingBubble.innerHTML = '<span class="typing-dots" aria-label="Assistant is thinking"><span></span><span></span><span></span></span>';

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...conversation],
        stream: false,
        options: { temperature: 0.7 }
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Ollama returned ${response.status}`);
    }
    const data = await response.json();
    const reply = data.message?.content?.trim();
    if (!reply) throw new Error("The local model returned an empty reply.");
    typingBubble.textContent = reply;
    conversation.push({ role: "assistant", content: reply });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    setConnectionState("online", "Llama 3.2 is ready");
  } catch (error) {
    typing.remove();
    conversation.pop();
    const reason = error.name === "TimeoutError"
      ? "Ollama took too long to respond. Please try again."
      : error instanceof TypeError
        ? "I can’t reach Ollama at localhost:11434. Make sure Ollama is running, the llama3.2:latest model is installed, and OLLAMA_ORIGINS allows this page."
        : `Ollama couldn’t answer: ${error.message}`;
    addMessage(reason, "assistant");
    setConnectionState("offline", "Could not reach the local model");
  } finally {
    setSending(false);
  }
}

chatLauncher.addEventListener("click", () => {
  if (chatPanel.classList.contains("is-open")) closeChat();
  else openChat();
});
document.querySelector("#header-chat").addEventListener("click", (event) => {
  event.preventDefault();
  openChat();
});
chatClose.addEventListener("click", closeChat);
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(chatInput.value);
});
quickPrompts.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-prompt]");
  if (button) sendMessage(button.dataset.chatPrompt);
});
document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
  if (button.closest("#quick-prompts")) return;
  button.addEventListener("click", () => openChat(button.dataset.chatPrompt));
});
document.querySelectorAll("[data-product]").forEach((link) => {
  link.addEventListener("click", () => openChat(`Tell me about ${link.dataset.product}.`));
});

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");
menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
  primaryNav.classList.toggle("is-open", !expanded);
});
primaryNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    primaryNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  }
});

checkOllama();
