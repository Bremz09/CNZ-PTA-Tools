const display = document.getElementById("display");
const statusLabel = document.getElementById("statusLabel");
const lapContainer = document.getElementById("lapContainer");
const lapOverlay = document.getElementById("lapOverlay");
const lapOverlayTime = document.getElementById("lapOverlayTime");
const startStopBtn = document.getElementById("startStopBtn");
const lapBtn = document.getElementById("lapBtn");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");
const targetToggle = document.getElementById("targetToggle");
const targetInput = document.getElementById("targetInput");

let timer = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let lastLapElapsed = 0;
let overlayTimer = null;
let targetEnabled = false;

function setStatus() {
  if (isRunning) {
    statusLabel.textContent = "Running";
  } else if (elapsedTime > 0) {
    statusLabel.textContent = "Paused";
  } else {
    statusLabel.textContent = "Ready";
  }

  startStopBtn.textContent = isRunning ? "Stop" : "Start";
  lapBtn.disabled = !isRunning;
}

function showLapOverlay(value, state) {
  lapOverlayTime.textContent = value;
  lapOverlay.classList.remove("is-negative", "is-positive");

  if (state === "negative") {
    lapOverlay.classList.add("is-negative");
  } else if (state === "positive") {
    lapOverlay.classList.add("is-positive");
  }

  lapOverlay.classList.add("is-visible");
  lapOverlay.setAttribute("aria-hidden", "false");

  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    lapOverlay.classList.remove("is-visible");
    lapOverlay.setAttribute("aria-hidden", "true");
  }, 5000);
}

function start() {
  if (!isRunning) {
    startTime = Date.now() - elapsedTime;
    timer = setInterval(update, 10);
    isRunning = true;
    setStatus();
  }
}

function stop() {
  if (isRunning) {
    clearInterval(timer);
    timer = null;
    elapsedTime = Date.now() - startTime;
    isRunning = false;
    setStatus();
  }
}

function reset() {
  clearInterval(timer);
  timer = null;
  startTime = 0;
  elapsedTime = 0;
  isRunning = false;
  lastLapElapsed = 0;
  display.textContent = "00:00:00";
  lapContainer.innerHTML = "";
  lapOverlay.classList.remove("is-visible");
  lapOverlay.setAttribute("aria-hidden", "true");
  lapOverlayTime.textContent = "";
  lapOverlay.classList.remove("is-negative", "is-positive");
  clearTimeout(overlayTimer);
  setStatus();
}

function update() {
  const currentTime = Date.now();
  elapsedTime = currentTime - startTime;

  let minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
  let seconds = Math.floor((elapsedTime / 1000) % 60);
  let milliseconds = Math.floor((elapsedTime % 1000) / 10);

  minutes = String(minutes).padStart(2, "0");
  seconds = String(seconds).padStart(2, "0");
  milliseconds = String(milliseconds).padStart(2, "0");

  display.textContent = `${minutes}:${seconds}:${milliseconds}`;
}

function formatTime(ms) {
  let minutes = Math.floor((ms / (1000 * 60)) % 60);
  let seconds = Math.floor((ms / 1000) % 60);
  let milliseconds = Math.floor((ms % 1000) / 10);

  minutes = String(minutes).padStart(2, "0");
  seconds = String(seconds).padStart(2, "0");
  milliseconds = String(milliseconds).padStart(2, "0");

  return `${minutes}:${seconds}:${milliseconds}`;
}

function formatLapOverlayTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(seconds).padStart(2, "0")}.${tenths}`;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("sw.js").catch(() => {
    // Leave the app functional if the browser blocks service workers.
  });
}

function getTargetSeconds() {
  const parsed = Number.parseFloat(targetInput.value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTargetDifference(ms, targetSeconds) {
  const differenceSeconds = (ms / 1000) - targetSeconds;
  const absolute = Math.abs(differenceSeconds).toFixed(1);
  return `${differenceSeconds >= 0 ? "+" : "-"}${absolute}`;
}

function recordLap() {
  if (!isRunning) {
    return;
  }

  const currentElapsed = Date.now() - startTime;
  const lapDuration = currentElapsed - lastLapElapsed;
  lastLapElapsed = currentElapsed;

  const lapTime = formatTime(lapDuration);
  const lapNumber = lapContainer.children.length + 1;

  const lapEntry = document.createElement("div");
  lapEntry.className = "lap-entry";
  lapEntry.dataset.lapNumber = String(lapNumber);
  lapEntry.dataset.lapTime = lapTime;
  lapEntry.innerHTML = `<span>Lap ${lapNumber}</span><span class="lap-entry-time">${lapTime}</span>`;
  lapContainer.prepend(lapEntry);

  if (targetEnabled) {
    const targetSeconds = getTargetSeconds();
    const differenceSeconds = (lapDuration / 1000) - targetSeconds;
    const overlayValue = formatTargetDifference(lapDuration, targetSeconds);
    const overlayState = differenceSeconds < 0 ? "negative" : differenceSeconds > 0 ? "positive" : "neutral";
    showLapOverlay(overlayValue, overlayState);
  } else {
    showLapOverlay(formatLapOverlayTime(lapDuration), "neutral");
  }
}

function exportLapTimes() {
  const lapEntries = Array.from(lapContainer.children).reverse().map(entry => {
    return `${entry.dataset.lapNumber},${entry.dataset.lapTime}`;
  });

  const csvContent = "Lap Number,Time\n" + lapEntries.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lap_times.csv";
  link.click();
}

document.addEventListener("DOMContentLoaded", () => {
  targetToggle.addEventListener("change", () => {
    targetEnabled = targetToggle.checked;
    targetInput.disabled = !targetEnabled;
  });

  targetInput.addEventListener("input", () => {
    if (targetInput.value === "") {
      targetInput.value = "0";
    }
  });

  startStopBtn.addEventListener("click", () => {
    if (isRunning) {
      stop();
      return;
    }

    start();
  });

  lapBtn.addEventListener("click", () => {
    recordLap();
  });

  resetBtn.addEventListener("click", () => {
    reset();
  });

  exportBtn.addEventListener("click", () => {
    exportLapTimes();
  });

  document.addEventListener("pointerup", (event) => {
    if (event.target.closest("#controls")) {
      return;
    }

    if (event.target.closest("button, a, input, textarea, select, label")) {
      return;
    }

    if (isRunning) {
      recordLap();
      return;
    }

    start();
  });

  setStatus();
  registerServiceWorker();
});
