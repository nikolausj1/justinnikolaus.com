const API_BASE = "https://vamppbjgfpwasjcvpaho.supabase.co/functions/v1/public-api";
const STATUS_REFRESH_MS = 12_000;
const MESSAGE_POLL_MS = 1_500;
const MAX_MESSAGE_POLLS = 80;

const form = document.querySelector("#message-form");
const nameInput = document.querySelector("#sender-name");
const messageInput = document.querySelector("#message-text");
const honeypotInput = document.querySelector("#website");
const submitButton = document.querySelector("#submit-button");
const buttonLabel = document.querySelector("#button-label");
const characterCount = document.querySelector("#character-count");
const nameError = document.querySelector("#name-error");
const messageError = document.querySelector("#message-error");
const statusCard = document.querySelector("#printer-status");
const statusLabel = document.querySelector("#status-label");
const statusMessage = document.querySelector("#status-message");
const feedback = document.querySelector("#submission-feedback");
const feedbackMark = document.querySelector("#feedback-mark");
const feedbackLabel = document.querySelector("#feedback-label");
const feedbackMessage = document.querySelector("#feedback-message");
const receiptDate = document.querySelector("#receipt-date");

let printerAcceptingMessages = false;
let submissionInProgress = false;
let activeIdempotencyKey = null;
let statusRefreshTimer = null;

receiptDate.textContent = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date()).toUpperCase();

function visibleLength(value) {
  return [...value].length;
}

function messageLineBreaks(value) {
  return (value.match(/\n/g) || []).length;
}

function validationState(showErrors = false) {
  const nameLength = visibleLength(nameInput.value.trim());
  const message = messageInput.value.trim();
  const messageLength = visibleLength(message);
  const tooManyLineBreaks = messageLineBreaks(message) > 8;
  const nameValid = nameLength <= 30;
  const messageValid = messageLength > 0 && messageLength <= 300 && !tooManyLineBreaks;

  characterCount.textContent = `${visibleLength(messageInput.value)} / 300`;
  characterCount.dataset.warning = visibleLength(messageInput.value) >= 270 ? "true" : "false";

  if (showErrors) {
    nameError.textContent = nameValid ? "" : "Use 30 characters or fewer.";
    messageError.textContent = !message
      ? "Write a message first."
      : tooManyLineBreaks
        ? "Use 8 line breaks or fewer."
        : messageLength > 300
          ? "Use 300 characters or fewer."
          : "";
  }

  submitButton.disabled = !(
    printerAcceptingMessages &&
    nameValid &&
    messageValid &&
    !submissionInProgress
  );

  return nameValid && messageValid;
}

function setPrinterStatus(payload) {
  const state = payload.status || "offline";
  printerAcceptingMessages = payload.acceptingMessages === true;
  statusCard.dataset.state = state;
  statusLabel.textContent = payload.label || "Printer unavailable";
  statusMessage.textContent = payload.message || "New messages are temporarily unavailable.";
  validationState();
}

function setStatusUnavailable() {
  setPrinterStatus({
    status: "error",
    label: "Status unavailable",
    message: "The printer could not be checked right now.",
    acceptingMessages: false,
  });
}

async function refreshPrinterStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || payload.ok !== true) throw new Error("Status unavailable");
    setPrinterStatus(payload);
    return payload;
  } catch {
    setStatusUnavailable();
    return null;
  }
}

function showFeedback(state, mark, label, message) {
  feedback.hidden = false;
  feedback.dataset.state = state;
  feedbackMark.textContent = mark;
  feedbackLabel.textContent = label;
  feedbackMessage.textContent = message;
}

function resetSubmissionButton() {
  submissionInProgress = false;
  buttonLabel.textContent = "Print this message";
  validationState();
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return { ok: false, error: "The printer service returned an unexpected response." };
  }
}

async function pollMessageStatus(messageId) {
  for (let attempt = 0; attempt < MAX_MESSAGE_POLLS; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, MESSAGE_POLL_MS));
    try {
      const response = await fetch(`${API_BASE}/messages/${encodeURIComponent(messageId)}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const payload = await readJson(response);
      if (!response.ok || payload.ok !== true) continue;

      if (payload.status === "printing") {
        showFeedback("progress", "02", payload.label, payload.message);
      } else if (payload.status === "sent_to_printer") {
        showFeedback("success", "✓", payload.label, payload.message);
      } else if (payload.terminal === true) {
        showFeedback("error", "!", payload.label, payload.message);
      } else {
        showFeedback("progress", "01", payload.label, payload.message);
      }

      if (payload.terminal === true) {
        activeIdempotencyKey = null;
        form.reset();
        characterCount.textContent = "0 / 300";
        await refreshPrinterStatus();
        resetSubmissionButton();
        return;
      }
    } catch {
      // A later poll may recover. Do not resubmit the message.
    }
  }

  showFeedback(
    "progress",
    "…",
    "Still waiting for an update",
    "Your message was received. This page could not confirm the final printer status.",
  );
  resetSubmissionButton();
}

async function submitMessage(event) {
  event.preventDefault();
  if (!validationState(true) || submissionInProgress) return;

  submissionInProgress = true;
  buttonLabel.textContent = "Checking the printer...";
  validationState();
  showFeedback("progress", "00", "Sending your message", "Checking that the printer is ready.");

  const latestStatus = await refreshPrinterStatus();
  if (!latestStatus?.acceptingMessages) {
    showFeedback(
      "error",
      "!",
      latestStatus?.label || "Printer unavailable",
      latestStatus?.message || "Nothing was printed.",
    );
    resetSubmissionButton();
    return;
  }

  activeIdempotencyKey ||= crypto.randomUUID();
  buttonLabel.textContent = "Sending your message...";

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: nameInput.value,
        message: messageInput.value,
        idempotencyKey: activeIdempotencyKey,
        website: honeypotInput.value,
      }),
    });
    const payload = await readJson(response);

    if (!response.ok || payload.ok !== true) {
      showFeedback(
        "error",
        "!",
        "Message not sent",
        payload.error || "Your message could not be sent. Please try again.",
      );
      if (response.status < 500) activeIdempotencyKey = null;
      resetSubmissionButton();
      return;
    }

    showFeedback("progress", "01", "Message received", "Waiting for the printer.");
    await pollMessageStatus(payload.messageId);
  } catch {
    showFeedback(
      "error",
      "!",
      "Connection interrupted",
      "Your request may have arrived. Press the button again to safely check without printing twice.",
    );
    resetSubmissionButton();
  }
}

nameInput.addEventListener("input", () => validationState(Boolean(nameError.textContent)));
messageInput.addEventListener("input", () => validationState(Boolean(messageError.textContent)));
form.addEventListener("submit", submitMessage);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !submissionInProgress) refreshPrinterStatus();
});

refreshPrinterStatus();
statusRefreshTimer = window.setInterval(() => {
  if (!submissionInProgress) refreshPrinterStatus();
}, STATUS_REFRESH_MS);

window.addEventListener("pagehide", () => window.clearInterval(statusRefreshTimer));
