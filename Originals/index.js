const display = document.getElementById("display");
const lapContainer = document.getElementById("lapContainer");

let timer = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let lastLapTime = 0;

const lapDisplay = document.createElement("div");
lapDisplay.className = "lap-display";
document.body.appendChild(lapDisplay);

function start() {
  if (!isRunning) {
    startTime = Date.now() - elapsedTime;
    timer = setInterval(update, 10);
    isRunning = true;
  }
}

function stop() {
  if (isRunning) {
    clearInterval(timer);
    elapsedTime = Date.now() - startTime;
    isRunning = false;
  }
}

function reset() {
  clearInterval(timer);
  startTime = 0;
  elapsedTime = 0;
  isRunning = false;
  display.textContent = "00:00:00";
  lapContainer.innerHTML = "";
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

function formatSplit(ms) {
  let seconds = Math.floor((ms / 1000) % 60);
  let milliseconds = Math.floor((ms % 1000) / 100);
  return `${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(1, "0")}`;
}

function exportLapTimes() {
  const lapEntries = Array.from(lapContainer.children).map(entry => {
    const [label, time] = entry.textContent.split(": ");
    return `${label},${time}`;
  });

  const csvContent = "Lap Number,Time\n" + lapEntries.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lap_times.csv";
  link.click();
}


document.body.addEventListener("click", () => {
  if (!isRunning) {
    start();
    lastLapTime = Date.now();
  } else {
    const now = Date.now();
    const lapDuration = now - lastLapTime;
    lastLapTime = now;
    const lapTime = formatSplit(lapDuration);

    document.getElementById("container").style.display = "none";
    lapDisplay.textContent = `${lapTime}`;
    lapDisplay.style.display = "block";

    const lapEntry = document.createElement("div");
    lapEntry.className = "lap-entry";
    lapEntry.textContent = `Lap ${lapContainer.children.length + 1}: ${lapTime}`;
    lapContainer.appendChild(lapEntry);

    setTimeout(() => {
      lapDisplay.style.display = "none";
      document.getElementById("container").style.display = "flex";
    }, 3000);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("stopBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    stop();
  });

  document.getElementById("resetBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    reset();
  });

  document.getElementById("exportBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    exportLapTimes();
  });
});
