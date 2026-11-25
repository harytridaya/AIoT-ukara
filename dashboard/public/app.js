// Frontend dashboard: data diambil dari API Node-RED pada origin yang sama.
const API = { 
  status: "/api/status", 
  history: "/api/history",
  mode: "/api/mode"
};
const POLL_INTERVAL_MS = 3000;
const MAX_CHART_POINTS = 30;

const $ = (id) => document.getElementById(id);
let temperatureChart;
let humidityChart;
let currentSourceMode = "simulation";

function makeChart(canvasId, label, color, unit) {
  const ctx = $(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [{
      label, data: [], borderColor: color, backgroundColor: color + "18",
      borderWidth: 2, fill: true, tension: .35, pointRadius: 2,
      pointHoverRadius: 5
    }]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: (context) => `${context.parsed.y} ${unit}`
      }}},
      scales: {
        x: { grid: { display: false }, ticks: { color: "#9aa3b4", maxTicksLimit: 6, font: { size: 9 }}},
        y: { grid: { color: "#f0f2f6" }, ticks: { color: "#9aa3b4", font: { size: 9 }}}
      }
    }
  });
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("id-ID");
}

function numberOrDash(value, digits = 1) {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n)
    ? "--" : n.toFixed(digits);
}

function normalizeStatus(row) {
  const raw = String(row.status ?? row.anomaly_status ?? "").toLowerCase();
  const rule = String(row.rule_anomaly ?? row.anomaly_rule ?? row.rule ?? "").toLowerCase();
  if (raw.includes("anom") || raw.includes("abnormal") || raw.includes("alert") ||
      rule.includes("anom") || rule === "true" || rule === "1") return "Anomali";
  if (raw.includes("warning") || raw.includes("waspada")) return "Waspada";
  return "Normal";
}

function setStatusBadge(online) {
  const badge = $("connectionBadge");
  badge.className = `connection-pill ${online ? "online" : "offline"}`;
  badge.innerHTML = `<i></i> ${online ? "Backend terhubung" : "Backend terputus"}`;
  $("apiStatus").textContent = online ? "Aktif" : "Tidak terhubung";
}

function updateSourceModeUI(mode) {
  const toggle = $("sourceToggle");
  const labelReal = $("labelReal");
  const labelSim = $("labelSim");
  const modeLabel = $("sourceModeLabel");
  
  if (mode === "simulation") {
    if (toggle) toggle.checked = true;
    if (labelSim) labelSim.classList.add("active");
    if (labelReal) labelReal.classList.remove("active");
    if (modeLabel) {
      modeLabel.textContent = "Simulasi Inject";
      modeLabel.className = "mode-badge-sim";
    }
  } else {
    if (toggle) toggle.checked = false;
    if (labelReal) labelReal.classList.add("active");
    if (labelSim) labelSim.classList.remove("active");
    if (modeLabel) {
      modeLabel.textContent = "Real Device ESP32";
      modeLabel.className = "mode-badge-real";
    }
  }
}

async function setSourceMode(newMode) {
  currentSourceMode = newMode;
  updateSourceModeUI(newMode);
  try {
    const res = await fetch(API.mode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode })
    });
    if (res.ok) {
      showToast(newMode === "esp" ? "Mode aktif: 📡 Real ESP32 (MQTT)" : "Mode aktif: 🧪 Simulasi Inject");
      await loadDashboard();
    }
  } catch (err) {
    console.warn("Gagal mengubah mode sumber data:", err);
    showToast("Gagal mengubah mode sumber data");
  }
}

function updateSummary(data) {
  if (!data) return;
  $("deviceId").textContent = data.device_id || data.deviceId || "ESP32";
  $("lastUpdate").textContent = formatTime(data.timestamp || data.time);
  $("temperature").innerHTML = `${numberOrDash(data.temperature)}<small>°C</small>`;
  $("humidity").innerHTML = `${numberOrDash(data.humidity)}<small>%</small>`;
  $("aiScore").textContent = numberOrDash(data.ai_score ?? data.anomaly_score, 3);
  const status = normalizeStatus(data);
  const statusEl = $("anomalyStatus");
  statusEl.textContent = status;
  statusEl.className = "status-value" + (status === "Anomali" ? " danger" : status === "Waspada" ? " warning" : "");
  $("anomalyDetail").textContent = `Rule: ${data.rule_anomaly ?? data.anomaly_rule ?? data.rule ?? "-"} · AI: ${numberOrDash(data.ai_score ?? data.anomaly_score, 3)}`;
}

function updateCharts(rows) {
  const ordered = [...(rows || [])].reverse().slice(-MAX_CHART_POINTS);
  const labels = ordered.map(row => {
    const d = new Date(row.timestamp || row.time);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("id-ID", {hour:"2-digit", minute:"2-digit"});
  });
  const temps = ordered.map(row => Number(row.temperature));
  const hums = ordered.map(row => Number(row.humidity));
  temperatureChart.data.labels = labels;
  temperatureChart.data.datasets[0].data = temps;
  humidityChart.data.labels = labels;
  humidityChart.data.datasets[0].data = hums;
  temperatureChart.update();
  humidityChart.update();
}

function renderHistory(rows) {
  const body = $("historyBody");
  if (!rows || rows.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada data untuk mode yang dipilih.</td></tr>';
    return;
  }
  body.innerHTML = [...rows].slice(0, 20).map(row => {
    const status = normalizeStatus(row);
    const cls = status === "Anomali" ? "status-anomaly" : status === "Waspada" ? "status-warning" : "status-normal";
    const rule = row.rule_anomaly ?? row.anomaly_rule ?? row.rule ?? "-";
    return `<tr>
      <td>${formatTime(row.timestamp || row.time)}</td>
      <td>${numberOrDash(row.temperature)} °C</td>
      <td>${numberOrDash(row.humidity)} %</td>
      <td>${String(rule)}</td>
      <td>${numberOrDash(row.ai_score ?? row.anomaly_score, 3)}</td>
      <td><span class="status-tag ${cls}">${status}</span></td>
    </tr>`;
  }).join("");
}

async function loadDashboard() {
  try {
    const [statusResponse, historyResponse] = await Promise.all([
      fetch(API.status, { cache: "no-store" }),
      fetch(API.history, { cache: "no-store" })
    ]);
    if (!statusResponse.ok || !historyResponse.ok) throw new Error("API Node-RED mengembalikan error");
    const statusData = await statusResponse.json();
    const historyData = await historyResponse.json();
    setStatusBadge(true);

    if (statusData && statusData.mode && statusData.mode !== currentSourceMode) {
      currentSourceMode = statusData.mode;
      updateSourceModeUI(currentSourceMode);
    }

    const latest = statusData.latest || statusData;
    if (latest && (latest.temperature !== undefined || latest.humidity !== undefined)) {
      updateSummary(latest);
    }
    const rows = Array.isArray(historyData) ? historyData : (historyData.rows || []);
    updateCharts(rows);
    renderHistory(rows);
  } catch (error) {
    setStatusBadge(false);
    console.warn("Gagal mengambil data dashboard:", error);
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function updateClock() {
  $("currentTime").textContent = new Date().toLocaleTimeString("id-ID");
}

document.addEventListener("DOMContentLoaded", () => {
  temperatureChart = makeChart("temperatureChart", "Suhu", "#ee9b4b", "°C");
  humidityChart = makeChart("humidityChart", "Kelembapan", "#4b83e8", "%");

  const sourceToggle = $("sourceToggle");
  if (sourceToggle) {
    sourceToggle.addEventListener("change", (e) => {
      setSourceMode(e.target.checked ? "simulation" : "esp");
    });
  }

  const labelReal = $("labelReal");
  if (labelReal) {
    labelReal.addEventListener("click", () => setSourceMode("esp"));
  }

  const labelSim = $("labelSim");
  if (labelSim) {
    labelSim.addEventListener("click", () => setSourceMode("simulation"));
  }

  $("refreshButton").addEventListener("click", async () => {
    await loadDashboard();
    showToast("Data dashboard diperbarui");
  });

  updateClock();
  loadDashboard();
  setInterval(updateClock, 1000);
  setInterval(loadDashboard, POLL_INTERVAL_MS);
});
