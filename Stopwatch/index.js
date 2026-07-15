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
const targetPanel = document.querySelector(".target-panel");
const overlayMeasureCanvas = document.createElement("canvas");
const overlayMeasureContext = overlayMeasureCanvas.getContext("2d");

const SAFE_ZONE_BUFFER_PX = 16;

let timer = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let lastLapElapsed = 0;
let overlayTimer = null;
let targetEnabled = false;

function buildCanvasFont(fontSizePx) {
  const computed = window.getComputedStyle(lapOverlayTime);
  const fontStyle = computed.fontStyle || "normal";
  const fontWeight = computed.fontWeight || "700";
  const fontFamily = computed.fontFamily || "sans-serif";
  return `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
}

function getLineHeightPixels(fontSizePx) {
  const computed = window.getComputedStyle(lapOverlayTime);
  const lineHeightRaw = computed.lineHeight;

  if (lineHeightRaw.endsWith("px")) {
    const parsedPx = Number.parseFloat(lineHeightRaw);
    return Number.isFinite(parsedPx) ? parsedPx : fontSizePx;
  }

  const unitless = Number.parseFloat(lineHeightRaw);
  if (Number.isFinite(unitless)) {
    return unitless * fontSizePx;
  }

  return fontSizePx;
}

function doesOverlayTextFit(text, fontSizePx, maxWidthPx, maxHeightPx) {
  if (!overlayMeasureContext) {
    return true;
  }

  overlayMeasureContext.font = buildCanvasFont(fontSizePx);
  const measuredWidth = overlayMeasureContext.measureText(text).width;
  const measuredHeight = getLineHeightPixels(fontSizePx);

  return measuredWidth <= maxWidthPx && measuredHeight <= maxHeightPx;
}

function fitLapOverlayTextToViewport() {
  if (!lapOverlayTime.textContent) {
    return;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const computed = window.getComputedStyle(lapOverlayTime);
  const paddingX = Number.parseFloat(computed.paddingLeft) + Number.parseFloat(computed.paddingRight);
  const paddingY = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
  const maxWidthPx = Math.max(24, viewportWidth - paddingX - 8);
  const maxHeightPx = Math.max(24, viewportHeight - paddingY - 8);

  const text = lapOverlayTime.textContent.trim();
  let low = 16;
  let high = Math.max(16, Math.floor(viewportHeight * 1.2));
  let best = 16;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (doesOverlayTextFit(text, mid, maxWidthPx, maxHeightPx)) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  lapOverlayTime.style.fontSize = `${best}px`;
}

function pointInsideBufferedRect(clientX, clientY, element, bufferPx) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return (
    clientX >= rect.left - bufferPx &&
    clientX <= rect.right + bufferPx &&
    clientY >= rect.top - bufferPx &&
    clientY <= rect.bottom + bufferPx
  );
}

function isInTapSafeZone(event) {
  const { clientX, clientY } = event;

  return pointInsideBufferedRect(clientX, clientY, targetPanel, SAFE_ZONE_BUFFER_PX);
}

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
  requestAnimationFrame(() => {
    fitLapOverlayTextToViewport();
  });

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
  const totalSeconds = ms / 1000;
  return totalSeconds.toFixed(2);
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
    const lapTimeFloat = Number.parseFloat(entry.dataset.lapTime ?? "0");
    const normalizedLapTime = Number.isFinite(lapTimeFloat) ? lapTimeFloat : 0;
    return `${entry.dataset.lapNumber},${normalizedLapTime}`;
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

  targetInput.addEventListener("blur", () => {
    if (targetInput.value.trim() === "") {
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

  const handleViewportResize = () => {
    if (!lapOverlay.classList.contains("is-visible")) {
      return;
    }

    fitLapOverlayTextToViewport();
  };

  window.addEventListener("resize", handleViewportResize);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportResize);
  }

  document.addEventListener("pointerup", (event) => {
    if (isInTapSafeZone(event)) {
      return;
    }

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
