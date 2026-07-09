const STORAGE_KEY = "oilTracker.cars";
const app = document.getElementById("app");

let cars = loadCars();
let editingId = null;
let loggingId = null;

function loadCars() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCars() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- Date helpers ----
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) +
    (b.getDate() - a.getDate()) / 30.4;
}

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ---- Core computation ----
// Oil is due at the recommended mileage OR 6 months after the last change, whichever comes
// first — oil degrades with age even in a car that's barely driven, so the date cap never
// stretches out no matter how little (or how much) the car is driven.
const MAX_MONTHS = 6;

function computeStatus(car) {
  const lastDate = parseDate(car.lastDate);
  const today = new Date();

  const nextMiles = car.lastMiles + car.recInterval;
  const nextDate = addMonths(lastDate, MAX_MONTHS);
  const daysRemaining = Math.round((nextDate - today) / 86400000);

  let status = "ok";
  if (daysRemaining <= 0) status = "overdue";
  else if (daysRemaining <= 21) status = "soon";

  return { nextMiles, nextDate, daysRemaining, status };
}

// ---- Rendering ----
function render() {
  if (cars.length === 0) {
    app.innerHTML = `
      <header class="top">
        <div>
          <h1>Oil Change Tracker</h1>
          <div class="subtitle">Stay ahead of every change</div>
        </div>
      </header>
      <div class="empty-state">
        <span class="emoji">🛢️</span>
        <div>No cars yet. Add your first one to get started.</div>
        <button class="btn btn-primary" onclick="openAddCar()">+ Add a Car</button>
      </div>
    `;
    return;
  }

  const sorted = [...cars].sort((a, b) => computeStatus(a).daysRemaining - computeStatus(b).daysRemaining);

  app.innerHTML = `
    <header class="top">
      <div>
        <h1>Oil Change Tracker</h1>
        <div class="subtitle">${cars.length} car${cars.length > 1 ? "s" : ""} tracked</div>
      </div>
      <button class="fab" onclick="openAddCar()">+</button>
    </header>
    <div class="car-list">
      ${sorted.map(renderCard).join("")}
    </div>
    <footer class="install-hint">Add this app to your home screen for one-tap access.</footer>
  `;
}

function renderCard(car) {
  const s = computeStatus(car);
  const dueText = s.status === "overdue"
    ? `Overdue — was due ${fmtDate(s.nextDate)}`
    : `Next due by ${fmtDate(s.nextDate)} (or ${s.nextMiles.toLocaleString()} mi, if sooner)`;

  const statusLabel = { ok: "On track", soon: "Due soon", overdue: "Overdue" }[s.status];

  return `
    <div class="car-card status-${s.status}">
      <div class="row-top">
        <div>
          <h3>${escapeHtml(car.name)}</h3>
          <div class="meta">${escapeHtml(car.oilType || "Oil type not set")}</div>
        </div>
        <span class="badge status-${s.status}">${statusLabel}</span>
      </div>
      <div class="due-line">${dueText}</div>
      <div class="actions">
        <button class="btn btn-secondary" onclick="openEditCar('${car.id}')">Edit</button>
        <button class="btn btn-secondary" onclick="openHistory('${car.id}')">History</button>
        <button class="btn btn-secondary" onclick="openLogChange('${car.id}')">Log Change</button>
        <button class="btn btn-primary" onclick="downloadIcs('${car.id}')">📅 Reminder</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---- Add / Edit car sheet ----
const sheetBackdrop = document.getElementById("sheet-backdrop");
const carSheet = document.getElementById("car-sheet");
const carForm = document.getElementById("car-form");
const makeSelect = document.getElementById("f-make");

Object.keys(CAR_OIL_DEFAULTS).forEach(make => {
  const opt = document.createElement("option");
  opt.value = make;
  opt.textContent = make;
  makeSelect.appendChild(opt);
});

makeSelect.addEventListener("change", () => {
  const def = CAR_OIL_DEFAULTS[makeSelect.value];
  if (!def) return;
  document.getElementById("f-oiltype").value = def.oil;
  document.getElementById("f-mfginterval").value = def.interval;
  document.getElementById("f-recinterval").value = Math.round(def.interval / 2);
});

document.getElementById("f-mfginterval").addEventListener("input", (e) => {
  const val = Number(e.target.value);
  const recField = document.getElementById("f-recinterval");
  if (val && !recField.dataset.userEdited) {
    recField.value = Math.round(val / 2);
  }
});

document.getElementById("f-recinterval").addEventListener("input", (e) => {
  e.target.dataset.userEdited = "1";
});

function openAddCar() {
  editingId = null;
  carForm.reset();
  document.getElementById("f-recinterval").dataset.userEdited = "";
  document.getElementById("sheet-title").textContent = "Add Car";
  document.getElementById("btn-delete").classList.add("hidden");
  document.getElementById("f-lastdate").value = toISODate(new Date());
  showSheet(carSheet);
}

function openEditCar(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;
  editingId = id;
  document.getElementById("sheet-title").textContent = "Edit Car";
  document.getElementById("f-name").value = car.name;
  document.getElementById("f-make").value = car.make || "";
  document.getElementById("f-oiltype").value = car.oilType || "";
  document.getElementById("f-mfginterval").value = car.mfgInterval;
  document.getElementById("f-recinterval").value = car.recInterval;
  document.getElementById("f-recinterval").dataset.userEdited = "1";
  document.getElementById("f-lastdate").value = car.lastDate;
  document.getElementById("f-lastmiles").value = car.lastMiles;
  document.getElementById("btn-delete").classList.remove("hidden");
  showSheet(carSheet);
}

carForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById("f-name").value.trim(),
    make: makeSelect.value,
    oilType: document.getElementById("f-oiltype").value.trim(),
    mfgInterval: Number(document.getElementById("f-mfginterval").value),
    recInterval: Number(document.getElementById("f-recinterval").value),
    lastDate: document.getElementById("f-lastdate").value,
    lastMiles: Number(document.getElementById("f-lastmiles").value),
  };

  if (editingId) {
    const car = cars.find(c => c.id === editingId);
    Object.assign(car, data);
  } else {
    cars.push({ id: uid(), history: [], ...data });
  }
  saveCars();
  hideSheet(carSheet);
  render();
});

document.getElementById("btn-cancel").addEventListener("click", () => hideSheet(carSheet));

document.getElementById("btn-delete").addEventListener("click", () => {
  if (!editingId) return;
  if (confirm("Delete this car and its history?")) {
    cars = cars.filter(c => c.id !== editingId);
    saveCars();
    hideSheet(carSheet);
    render();
  }
});

// ---- Log change sheet ----
const logSheet = document.getElementById("log-sheet");
const logForm = document.getElementById("log-form");

function openLogChange(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;
  loggingId = id;
  document.getElementById("log-car-name").textContent = car.name;
  document.getElementById("l-date").value = toISODate(new Date());
  document.getElementById("l-miles").value = "";
  document.getElementById("l-miles").placeholder = `Last: ${car.lastMiles.toLocaleString()} mi`;
  showSheet(logSheet);
}

logForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const car = cars.find(c => c.id === loggingId);
  if (!car) return;
  if (!car.history) car.history = [];
  car.history.push({ date: car.lastDate, miles: car.lastMiles });
  car.lastDate = document.getElementById("l-date").value;
  car.lastMiles = Number(document.getElementById("l-miles").value);
  saveCars();
  hideSheet(logSheet);
  render();
});

document.getElementById("log-cancel").addEventListener("click", () => hideSheet(logSheet));

// ---- History sheet ----
const historySheet = document.getElementById("history-sheet");

function openHistory(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;
  document.getElementById("history-car-name").textContent = `${car.name} — History`;

  const entries = [
    { date: car.lastDate, miles: car.lastMiles, current: true },
    ...((car.history || []).slice().reverse()),
  ];

  const list = document.getElementById("history-list");
  if (entries.length === 1) {
    list.innerHTML = `<p class="hint">No past changes logged yet — this is the first one on record.</p>`;
  } else {
    list.innerHTML = entries.map((e, i) => {
      const prev = entries[i + 1];
      const delta = prev ? e.miles - prev.miles : null;
      return `
        <div class="history-item">
          <div>
            <div class="history-date">${fmtDate(parseDate(e.date))}${e.current ? " (current)" : ""}</div>
            <div class="history-miles">${e.miles.toLocaleString()} mi</div>
          </div>
          ${delta != null ? `<div class="history-delta">+${delta.toLocaleString()} mi</div>` : ""}
        </div>
      `;
    }).join("");
  }

  showSheet(historySheet);
}

document.getElementById("history-close").addEventListener("click", () => hideSheet(historySheet));

// ---- Sheet show/hide ----
function showSheet(sheet) {
  sheetBackdrop.classList.remove("hidden");
  sheet.classList.remove("hidden");
}

function hideSheet(sheet) {
  sheetBackdrop.classList.add("hidden");
  sheet.classList.add("hidden");
}

sheetBackdrop.addEventListener("click", () => {
  hideSheet(carSheet);
  hideSheet(logSheet);
  hideSheet(historySheet);
});

// ---- ICS calendar export ----
function downloadIcs(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;
  const s = computeStatus(car);
  const dt = s.nextDate;
  const dateStr = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const title = `Oil Change: ${car.name} - ${s.nextMiles.toLocaleString()} mi`;
  const desc = `Time to change the oil in ${car.name}.\\nUse: ${car.oilType || "see owner's manual"}\\nTarget mileage: ${s.nextMiles.toLocaleString()} mi (recommended interval: ${car.recInterval} mi, manufacturer suggests ${car.mfgInterval} mi).`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oil Change Tracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${car.id}-${dateStr}@oil-change-tracker`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Oil change reminder",
    "TRIGGER:-P3D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oil-change-${car.name.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function icsEscape(str) {
  return String(str).replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

// ---- Init ----
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
