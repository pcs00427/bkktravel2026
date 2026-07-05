const STORAGE_KEY = "bkk-travel-planner-v2";

const createEmptyItem = () => ({
  time: "",
  title: "",
  location: "",
  transport: "",
  mapUrl: "",
  note: "",
});

const createDefaultDay = (dayNumber) => ({
  date: "",
  title: `Day ${dayNumber}`,
  hotel: "",
  budget: "",
  note: "",
  items: [createEmptyItem()],
});

const createDefaultState = () => ({
  tripName: "曼谷五天自由行",
  destination: "Bangkok",
  startDate: "",
  endDate: "",
  travelers: "",
  baseArea: "",
  hotelName: "",
  budgetNote: "",
  tripNote: "",
  travelNotes: {
    mustBook: "",
    checklist: "",
    foodAndShopping: "",
    importantInfo: "",
    freeform: "",
  },
  flights: {
    outbound: {
      airline: "",
      departAirport: "",
      departTime: "",
      arriveAirport: "",
      arriveTime: "",
      bookingRef: "",
      note: "",
    },
    return: {
      airline: "",
      departAirport: "",
      departTime: "",
      arriveAirport: "",
      arriveTime: "",
      bookingRef: "",
      note: "",
    },
  },
  transport: {
    airportToCity: "",
    cityTransit: "",
    departureRide: "",
    note: "",
  },
  days: Array.from({ length: 5 }, (_, index) => createDefaultDay(index + 1)),
});

let state = loadState();
let saveTimer = null;

const app = document.querySelector("#app");
const daysContainer = document.querySelector("#daysContainer");
const dayTemplate = document.querySelector("#dayTemplate");
const itemCardTemplate = document.querySelector("#itemCardTemplate");
const saveStatus = document.querySelector("#saveStatus");
const importFile = document.querySelector("#importFile");

hydrateStaticFields();
renderDays();
bindGlobalEvents();

function loadState() {
  const current = localStorage.getItem(STORAGE_KEY);
  const legacy = localStorage.getItem("bkk-travel-planner-v1");
  const raw = current ?? legacy;

  if (!raw) {
    return createDefaultState();
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

function normalizeState(incoming) {
  const base = createDefaultState();
  const safe = incoming && typeof incoming === "object" ? incoming : {};
  const days = Array.isArray(safe.days) ? safe.days : [];
  const legacyTransport = safe.transport ?? {};
  const legacyNotes = safe.travelNotes ?? {};

  return {
    ...base,
    ...pickScalarFields(base, safe, [
      "tripName",
      "destination",
      "startDate",
      "endDate",
      "travelers",
      "baseArea",
      "hotelName",
      "budgetNote",
      "tripNote",
    ]),
    travelNotes: {
      ...base.travelNotes,
      mustBook: legacyNotes.mustBook ?? legacyNotes.prepList ?? "",
      checklist: legacyNotes.checklist ?? "",
      foodAndShopping: legacyNotes.foodAndShopping ?? joinLegacyLists(legacyNotes.foodList, legacyNotes.shoppingList),
      importantInfo: legacyNotes.importantInfo ?? "",
      freeform: legacyNotes.freeform ?? "",
    },
    flights: {
      outbound: {
        ...base.flights.outbound,
        ...pickScalarFields(base.flights.outbound, safe.flights?.outbound, [
          "airline",
          "departAirport",
          "departTime",
          "arriveAirport",
          "arriveTime",
          "bookingRef",
          "note",
        ]),
      },
      return: {
        ...base.flights.return,
        ...pickScalarFields(base.flights.return, safe.flights?.return, [
          "airline",
          "departAirport",
          "departTime",
          "arriveAirport",
          "arriveTime",
          "bookingRef",
          "note",
        ]),
      },
    },
    transport: {
      airportToCity: legacyTransport.airportToCity ?? legacyTransport.arrivalPlan ?? "",
      cityTransit: legacyTransport.cityTransit ?? "",
      departureRide: legacyTransport.departureRide ?? legacyTransport.departurePlan ?? "",
      note: legacyTransport.note ?? "",
    },
    days: Array.from({ length: 5 }, (_, index) => normalizeDay(days[index], index + 1)),
  };
}

function normalizeDay(incomingDay, dayNumber) {
  const base = createDefaultDay(dayNumber);
  const safeDay = incomingDay && typeof incomingDay === "object" ? incomingDay : {};
  const items = Array.isArray(safeDay.items) ? safeDay.items : [];

  return {
    ...base,
    ...pickScalarFields(base, safeDay, ["date", "title", "hotel", "budget", "note"]),
    items: (items.length ? items : base.items).map(normalizeItem),
  };
}

function normalizeItem(incomingItem) {
  const base = createEmptyItem();
  const safeItem = incomingItem && typeof incomingItem === "object" ? incomingItem : {};

  return {
    ...base,
    ...pickScalarFields(base, safeItem, ["time", "title", "location", "transport", "mapUrl", "note"]),
  };
}

function joinLegacyLists(first, second) {
  return [first, second].filter(Boolean).join("\n");
}

function pickScalarFields(base, incoming, keys) {
  const result = {};

  keys.forEach((key) => {
    if (incoming?.[key] !== undefined && typeof incoming[key] !== "object") {
      result[key] = incoming[key];
    } else {
      result[key] = base[key];
    }
  });

  return result;
}

function hydrateStaticFields() {
  app.querySelectorAll("[data-path]").forEach((input) => {
    input.value = getValueByPath(state, input.dataset.path) ?? "";
  });
}

function renderDays() {
  daysContainer.innerHTML = "";

  state.days.forEach((day, dayIndex) => {
    const fragment = dayTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".day-card");
    const dayDisplay = fragment.querySelector(".day-title-display");
    const dayIndexLabel = fragment.querySelector(".day-index");
    const dateInput = fragment.querySelector(".day-date-input");
    const titleInput = fragment.querySelector(".day-title-input");
    const hotelInput = fragment.querySelector(".day-hotel-input");
    const budgetInput = fragment.querySelector(".day-budget-input");
    const noteInput = fragment.querySelector(".day-note-input");
    const itemsBody = fragment.querySelector(".day-items-body");
    const addItemBtn = fragment.querySelector(".add-item-btn");

    card.dataset.dayIndex = String(dayIndex);
    dayIndexLabel.textContent = `Day ${dayIndex + 1}`;
    dayDisplay.textContent = day.title || `Day ${dayIndex + 1}`;

    dateInput.value = day.date;
    titleInput.value = day.title;
    hotelInput.value = day.hotel;
    budgetInput.value = day.budget;
    noteInput.value = day.note;

    dateInput.addEventListener("input", (event) => updateDayField(dayIndex, "date", event.target.value));
    titleInput.addEventListener("input", (event) => {
      const value = event.target.value;
      dayDisplay.textContent = value || `Day ${dayIndex + 1}`;
      updateDayField(dayIndex, "title", value);
    });
    hotelInput.addEventListener("input", (event) => updateDayField(dayIndex, "hotel", event.target.value));
    budgetInput.addEventListener("input", (event) => updateDayField(dayIndex, "budget", event.target.value));
    noteInput.addEventListener("input", (event) => updateDayField(dayIndex, "note", event.target.value));

    day.items.forEach((item, itemIndex) => {
      const itemFragment = itemCardTemplate.content.cloneNode(true);
      const itemCard = itemFragment.querySelector(".stop-card");
      itemCard.dataset.dayIndex = String(dayIndex);
      itemCard.dataset.itemIndex = String(itemIndex);
      bindItemCard(itemCard, dayIndex, itemIndex, item);
      itemsBody.appendChild(itemFragment);
    });

    addItemBtn.addEventListener("click", () => {
      state.days[dayIndex].items.push(createEmptyItem());
      persistAndRender("已新增停靠點");
    });

    daysContainer.appendChild(fragment);
  });
}

function bindItemCard(card, dayIndex, itemIndex, item) {
  const indexLabel = card.querySelector(".stop-index");
  const timeInput = card.querySelector(".item-time-input");
  const titleInput = card.querySelector(".item-title-input");
  const locationInput = card.querySelector(".item-location-input");
  const transportInput = card.querySelector(".item-transport-input");
  const mapInput = card.querySelector(".item-map-input");
  const noteInput = card.querySelector(".item-note-input");
  const mapLink = card.querySelector(".map-link");
  const deleteBtn = card.querySelector(".delete-item-btn");

  indexLabel.textContent = `Stop ${itemIndex + 1}`;
  timeInput.value = item.time;
  titleInput.value = item.title;
  locationInput.value = item.location;
  transportInput.value = item.transport;
  mapInput.value = item.mapUrl;
  noteInput.value = item.note;
  syncMapLink(mapLink, item.mapUrl);

  timeInput.addEventListener("input", (event) => updateItemField(dayIndex, itemIndex, "time", event.target.value));
  titleInput.addEventListener("input", (event) => updateItemField(dayIndex, itemIndex, "title", event.target.value));
  locationInput.addEventListener("input", (event) => updateItemField(dayIndex, itemIndex, "location", event.target.value));
  transportInput.addEventListener("input", (event) => updateItemField(dayIndex, itemIndex, "transport", event.target.value));
  noteInput.addEventListener("input", (event) => updateItemField(dayIndex, itemIndex, "note", event.target.value));
  mapInput.addEventListener("input", (event) => {
    const value = event.target.value;
    updateItemField(dayIndex, itemIndex, "mapUrl", value, false);
    syncMapLink(mapLink, value);
    queueSave("已儲存到瀏覽器");
  });

  deleteBtn.addEventListener("click", () => {
    state.days[dayIndex].items.splice(itemIndex, 1);
    if (state.days[dayIndex].items.length === 0) {
      state.days[dayIndex].items.push(createEmptyItem());
    }
    persistAndRender("已刪除停靠點");
  });
}

function bindGlobalEvents() {
  app.querySelectorAll("[data-path]").forEach((input) => {
    input.addEventListener("input", (event) => {
      setValueByPath(state, event.target.dataset.path, event.target.value);
      queueSave("已儲存到瀏覽器");
    });
  });

  document.querySelector("#exportBtn").addEventListener("click", exportState);
  document.querySelector("#importBtn").addEventListener("click", () => importFile.click());
  document.querySelector("#resetBtn").addEventListener("click", resetState);
  importFile.addEventListener("change", importState);
}

function updateDayField(dayIndex, field, value) {
  state.days[dayIndex][field] = value;
  queueSave("已儲存到瀏覽器");
}

function updateItemField(dayIndex, itemIndex, field, value, shouldSave = true) {
  state.days[dayIndex].items[itemIndex][field] = value;
  if (shouldSave) {
    queueSave("已儲存到瀏覽器");
  }
}

function queueSave(message) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveStatus(message);
  }, 180);
}

function persistAndRender(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  hydrateStaticFields();
  renderDays();
  setSaveStatus(message);
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `bkk-trip-${today}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setSaveStatus("已匯出 JSON");
}

function importState(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(String(reader.result)));
      persistAndRender("已匯入資料");
    } catch {
      alert("JSON 格式錯誤，請重新確認檔案內容。");
    } finally {
      importFile.value = "";
    }
  };

  reader.readAsText(file);
}

function resetState() {
  if (!window.confirm("要把目前內容重設成新的旅遊範本嗎？")) {
    return;
  }

  state = createDefaultState();
  persistAndRender("已重設範本");
}

function setSaveStatus(message) {
  const time = new Date().toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  saveStatus.textContent = `${message} · ${time}`;
}

function getValueByPath(source, path) {
  return path.split(".").reduce((current, key) => current?.[key], source);
}

function setValueByPath(target, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const container = keys.reduce((current, key) => current[key], target);
  container[lastKey] = value;
}

function syncMapLink(anchor, value) {
  const isValidUrl = /^https?:\/\/.+/i.test(value.trim());
  anchor.href = isValidUrl ? value : "#";
  anchor.classList.toggle("is-active", isValidUrl);
  anchor.tabIndex = isValidUrl ? 0 : -1;
  anchor.setAttribute("aria-disabled", String(!isValidUrl));
}
