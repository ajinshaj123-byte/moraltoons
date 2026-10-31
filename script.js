/* ==========================================================
   MORALTOONS — SCRIPT.JS
   One screen is visible at a time. Everything goes through
   navigate(), so every button leads somewhere sensible.
   ========================================================== */

"use strict";

/* ---------- 1. SETTINGS AND CONTENT ---------- */

const ASSET = "assets/";
const STORAGE_KEY = "moraltoons_data_v1";
const PIN_LENGTH = 4;
const MAX_NAME = 30;
const MIN_LIMIT = 5;
const MAX_LIMIT = 240;
const DEFAULT_LIMIT = 30;
const BONUS_MINUTES = 10;
const XP_PER_ANSWER = 10;
const TICK_MS = 5000; // how often we add learning time
const MAX_TICK_SECONDS = 10; // never add more than this per tick (sleep / lag safety)
const MAX_PIN_TRIES = 5;
const LOCKOUT_SECONDS = 30;

// Only Level 1 is playable. Levels 2–12 are locked placeholders.
const LEVELS = [
  { id: 1, value: "Kindness", title: "The Ant and the Dove", icon: "🐜", playable: true,
    description: "Discover how a small act of kindness can make a big difference." },
  { id: 2, value: "Honesty", title: "The Boy Who Cried Wolf", icon: "🐺", playable: false,
    description: "Learn why telling the truth matters." },
  { id: 3, value: "Helping Others", title: "The Lion and the Mouse", icon: "🦁", playable: false,
    description: "Even the smallest friend can make a big difference." },
  { id: 4, value: "Perseverance", title: "The Thirsty Crow", icon: "🐦‍⬛", playable: false,
    description: "Keep trying when something feels difficult." },
  { id: 5, value: "Gratitude & Friendship", title: "Sand and Stone", icon: "🤝", playable: false,
    description: "Learn to value friendship and kindness." },
  { id: 6, value: "Respect for Nature", title: "The Apple Tree and the Farmer", icon: "🌳", playable: false,
    description: "Care for nature and appreciate what it gives us." },
  { id: 7, value: "Patience & Effort", title: "Cocoon and the Butterfly", icon: "🦋", playable: false,
    description: "Understand why patience and effort are important." },
  { id: 8, value: "Sharing & Generosity", title: "The Value of a Copper Coin", icon: "🪙", playable: false,
    description: "Discover the joy of sharing with others." },
  { id: 9, value: "Think Before You Act", title: "The Goose with the Golden Eggs", icon: "🥚", playable: false,
    description: "Think carefully before making important decisions." },
  { id: 10, value: "Humility", title: "The Fox and the Grapes", icon: "🦊", playable: false,
    description: "Learn to respond to disappointment wisely." },
  { id: 11, value: "Cooperation", title: "Three Sons and a Bundle of Sticks", icon: "🪵", playable: false,
    description: "Discover the strength of working together." },
  { id: 12, value: "Contentment", title: "True Wealth", icon: "💛", playable: false,
    description: "Understand what makes life truly meaningful." }
];

const CHARACTERS = {
  arjun: { name: "Arjun", normal: "arjun.png", happy: "arjun-happy.png", sad: "arjun-sad.png" },
  priya: { name: "Priya", normal: "priya.png", happy: "priya-happy.png", sad: "priya-sad.png" },
  bholu: { name: "Bholu", normal: "bholu.png", happy: "bholu-happy.png", sad: "bholu-sad.png" }
};

/* Level 1 content. "correct" is a zero-based index (0 = first answer).
   If an answer picture shows something different from the text, change the text here. */
const LEVEL_CONTENT = {
  1: {
    lesson: "You learned that kindness can make a big difference.",
    storyText: "Watch how the dove helps the ant, and how the ant later returns the kindness.",
    questions: [
      {
        scene: "q1-scene.png",
        sceneAlt: "The ant struggling in the water",
        question: "How did the dove save the ant?",
        answers: [
          { text: "The dove gives the ant a toy.", image: "q1-a.png" },
          { text: "The dove drops a leaf into the water.", image: "q1-b.png" },
          { text: "The dove flies away.", image: "q1-c.png" }
        ],
        correct: 1,
        explanation: "The kind dove dropped a leaf so the ant could climb to safety."
      },
      {
        scene: "q2-scene.png",
        sceneAlt: "The dove in danger from a hunter",
        question: "How did the ant help the dove?",
        answers: [
          { text: "The ant brings food.", image: "q2-a.png" },
          { text: "The ant bites the hunter.", image: "q2-b.png" },
          { text: "The ant calls other birds.", image: "q2-c.png" }
        ],
        correct: 1,
        explanation: "The ant bit the hunter, helping the dove escape."
      },
      {
        scene: "q3-scene.png",
        sceneAlt: "Children showing different ways to act",
        question: "Which picture shows kindness?",
        answers: [
          { text: "Taking another child's toy.", image: "q3-a.png" },
          { text: "Ignoring someone who needs help.", image: "q3-b.png" },
          { text: "Helping a friend.", image: "q3-c.png" }
        ],
        correct: 2,
        explanation: "Helping a friend is a kind thing to do."
      }
    ]
  }
};

/* Which "zone" each screen belongs to. The zone controls the header menu and the colours. */
const SCREEN_ZONE = {
  "setup": "setup", "pin-setup": "setup",
  "pin": "gate",
  "home": "child", "guides": "child", "map": "child", "level": "child",
  "story": "child", "quiz": "child", "results": "child",
  "break": "break",
  "parent": "parent", "reports": "parent", "settings": "parent"
};

const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' rx='24' fill='#eee6ff'/>" +
  "<circle cx='60' cy='52' r='26' fill='#ffdc70'/>" +
  "<circle cx='50' cy='48' r='4' fill='#342b43'/><circle cx='70' cy='48' r='4' fill='#342b43'/>" +
  "<path d='M46 62q14 14 28 0' stroke='#342b43' stroke-width='4' fill='none' stroke-linecap='round'/>" +
  "<rect x='34' y='84' width='52' height='20' rx='10' fill='#ff9f43'/></svg>"
);

/* ---------- 2. SMALL HELPERS ---------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = String(value);
  else console.warn("setText: element not found:", selector);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDateKey(text) {
  return typeof text === "string" && /^\d{4}-\d{2}-\d{2}$/.test(text);
}

function formatMinutes(seconds) {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function levelById(id) {
  return LEVELS.find(level => level.id === id);
}

/* ---------- 3. SAVED DATA (localStorage, with safe fallbacks) ---------- */

let storageOk = true;
let startupNotice = "";

function storageRead() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageOk = false;
    console.warn("localStorage is not available; progress will not be saved.", error);
    return null;
  }
}

function storageWrite(text) {
  try {
    localStorage.setItem(STORAGE_KEY, text);
    return true;
  } catch (error) {
    if (storageOk) {
      storageOk = false;
      console.warn("Could not save to localStorage.", error);
      showToast("Your browser can't save progress right now.");
      showStorageWarning();
    }
    return false;
  }
}

function defaultState() {
  return {
    profile: null, // { name, createdAt } once step 1 is done
    pin: "", // 4 digits, stored in plain text (prototype only)
    selectedGuide: "arjun",
    xp: 0,
    coins: 0,
    completedLevels: [], // [1]
    levelStars: {}, // { "1": 3 }
    rewarded: {}, // { "1": [0, 1, 2] } questions that already gave XP
    dailyLimit: DEFAULT_LIMIT,
    bonus: {}, // { "2026-11-02": 10 } extra minutes added by a parent
    usage: {}, // { "2026-11-02": 421.5 } seconds of learning per day
    log: [] // activity records used by the reports
  };
}

/* Takes anything found in storage and returns clean, valid data. */
function sanitize(raw) {
  const clean = defaultState();
  if (!isObject(raw)) return clean;

  if (isObject(raw.profile)) {
    clean.profile = {
      name: typeof raw.profile.name === "string" ? raw.profile.name.trim().slice(0, MAX_NAME) : "",
      createdAt: clampInt(raw.profile.createdAt, 0, 8.64e15, Date.now())
    };
  }

  if (typeof raw.pin === "string" && /^\d{4}$/.test(raw.pin)) clean.pin = raw.pin;
  if (typeof raw.selectedGuide === "string" && CHARACTERS[raw.selectedGuide]) clean.selectedGuide = raw.selectedGuide;

  clean.xp = clampInt(raw.xp, 0, 1000000, 0);
  clean.coins = clampInt(raw.coins, 0, 1000000, 0);
  clean.dailyLimit = clampInt(raw.dailyLimit, MIN_LIMIT, MAX_LIMIT, DEFAULT_LIMIT);

  if (Array.isArray(raw.completedLevels)) {
    clean.completedLevels = [...new Set(raw.completedLevels.filter(id => LEVELS.some(l => l.id === id)))];
  }

  if (isObject(raw.levelStars)) {
    Object.keys(raw.levelStars).forEach(id => {
      if (levelById(Number(id))) clean.levelStars[id] = clampInt(raw.levelStars[id], 1, 3, 1);
    });
  }

  if (isObject(raw.rewarded)) {
    Object.keys(raw.rewarded).forEach(id => {
      const content = LEVEL_CONTENT[id];
      if (content && Array.isArray(raw.rewarded[id])) {
        clean.rewarded[id] = [...new Set(raw.rewarded[id].filter(
          i => Number.isInteger(i) && i >= 0 && i < content.questions.length
        ))];
      }
    });
  }

  if (isObject(raw.bonus)) {
    Object.keys(raw.bonus).forEach(key => {
      if (isDateKey(key)) clean.bonus[key] = clampInt(raw.bonus[key], 0, 600, 0);
    });
  }

  if (isObject(raw.usage)) {
    Object.keys(raw.usage).forEach(key => {
      const seconds = Number(raw.usage[key]);
      if (isDateKey(key) && Number.isFinite(seconds) && seconds >= 0) {
        clean.usage[key] = Math.min(86400, seconds);
      }
    });
  }

  if (Array.isArray(raw.log)) {
    clean.log = raw.log
      .filter(e => isObject(e) && typeof e.type === "string" && isDateKey(e.date) && Number.isFinite(e.t))
      .slice(-1000);
  }

  return clean;
}

function loadState() {
  const text = storageRead();
  if (!text) return defaultState();

  try {
    return sanitize(JSON.parse(text));
  } catch (error) {
    console.warn("Saved MoralToons data was damaged. Starting fresh.", error);
    try {
      localStorage.setItem(STORAGE_KEY + "_damaged_backup", text);
    } catch (backupError) {
      console.warn("Could not keep a backup of the damaged data.", backupError);
    }
    startupNotice = "Saved data could not be read, so MoralToons started fresh.";
    return defaultState();
  }
}

let state = loadState();

function save() {
  storageWrite(JSON.stringify(state));
}

function isSetUp() {
  return Boolean(state.profile) && state.pin.length === PIN_LENGTH;
}

function childName() {
  return (state.profile && state.profile.name) || "Little Learner";
}

function currentGuide() {
  return CHARACTERS[state.selectedGuide] || CHARACTERS.arjun;
}

function logEvent(type, extra = {}) {
  state.log.push({ type, t: Date.now(), date: dateKey(), ...extra });
  if (state.log.length > 1000) state.log = state.log.slice(-1000);
  save();
}

/* ---------- 4. SCREEN-TIME LIMIT ---------- */

function todayUsageSeconds() {
  return state.usage[dateKey()] || 0;
}

function todayLimitMinutes() {
  return state.dailyLimit + (state.bonus[dateKey()] || 0);
}

function remainingSeconds() {
  return Math.max(0, todayLimitMinutes() * 60 - todayUsageSeconds());
}

function isTimeUp() {
  return isSetUp() && remainingSeconds() <= 0;
}

/* ---------- 5. UI STATE (not saved) ---------- */

const ui = {
  parentUnlocked: false,
  afterPin: "parent",
  lastChild: "home",
  levelId: 1,
  quiz: null,
  lastResult: null,
  reportPeriod: "daily",
  pinFails: 0,
  lockedUntil: 0,
  lockTimer: null,
  limitLoggedFor: "",
  introActive: false, // true while the opening animation covers the page
  missingAssets: new Set()
};

/* ---------- 6. TOAST, DIALOG, MISSING FILES ---------- */

let toastTimer = null;

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function showStorageWarning() {
  const note = $("#storage-warning");
  if (note) note.hidden = false;
}

/* Returns a Promise that resolves true (confirmed) or false (cancelled). */
function askConfirm({ title, text, okLabel, typeWord }) {
  const dialog = $("#confirm-dialog");

  if (!dialog || typeof dialog.showModal !== "function") {
    return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  }

  return new Promise(resolve => {
    const ok = $("#confirm-ok");
    const cancel = $("#confirm-cancel");
    const typeWrap = $("#confirm-type-wrap");
    const typeInput = $("#confirm-type");
    let finished = false;

    setText("#confirm-title", title);
    setText("#confirm-text", text);
    ok.textContent = okLabel;
    typeWrap.hidden = !typeWord;
    typeInput.value = "";
    ok.disabled = Boolean(typeWord);

    function finish(answer) {
      if (finished) return;
      finished = true;
      if (dialog.open) dialog.close();
      resolve(answer);
    }

    // Using on... properties replaces old handlers, so they never pile up.
    typeInput.oninput = () => {
      ok.disabled = typeWord ? typeInput.value.trim().toUpperCase() !== typeWord : false;
    };
    ok.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
    dialog.onclose = () => finish(false); // Esc key

    dialog.showModal();
  });
}

function registerMissing(path) {
  if (!path || path.startsWith("data:")) return;
  if (!ui.missingAssets.has(path)) {
    ui.missingAssets.add(path);
    console.warn("MoralToons could not load this file:", path);
  }
}

/* Pictures: use a fallback picture if one was given, otherwise a friendly placeholder. */
function handleImageError(img) {
  registerMissing(img.getAttribute("src"));

  if (img.dataset.fallback && img.dataset.fallbackTried !== "1") {
    img.dataset.fallbackTried = "1";
    img.src = img.dataset.fallback;
    return;
  }

  if (img.classList.contains("intro-logo")) {
    img.hidden = true;
    const intro = img.closest(".intro");
    if (intro) intro.classList.add("logo-missing"); // shows the text "MoralToons" instead
    return;
  }

  if (img.classList.contains("brand-logo")) {
    img.hidden = true;
    const brand = img.closest(".brand");
    if (brand) brand.classList.add("logo-missing");
    return;
  }

  if (img.classList.contains("setup-logo")) {
    img.hidden = true;
    return;
  }

  if (img.classList.contains("scene-img")) {
    const wrap = img.closest(".question-scene");
    if (wrap) wrap.hidden = true;
    return;
  }

  if (img.dataset.placeholderApplied === "1") return;
  img.dataset.placeholderApplied = "1";
  img.src = PLACEHOLDER_IMG;
}

function handleVideoError(video) {
  const source = video.currentSrc || (video.querySelector("source") || {}).src || "assets/ant-and-dove.mp4";
  registerMissing("assets/ant-and-dove.mp4");
  setText("#video-note", "The story video could not be loaded (" + source.split("/").slice(-2).join("/") +
    "). You can still try the quiz.");
}

/* Replays a CSS animation class (used for small "pop" effects). */
function replayAnimation(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth; // lets the browser notice the class was removed
  el.classList.add(className);
}

/* ---------- 7. CHARACTER PICTURES ---------- */

function setCharacterImage(img, guideKey, mood = "normal") {
  if (!img) return;
  const guide = CHARACTERS[guideKey] || CHARACTERS.arjun;
  img.dataset.fallbackTried = "";
  img.dataset.placeholderApplied = "";
  img.dataset.fallback = mood === "normal" ? "" : ASSET + guide.normal;
  img.src = ASSET + guide[mood];
  img.alt = mood === "happy" ? `${guide.name} is happy`
          : mood === "sad" ? `${guide.name} is cheering you on`
          : guide.name;
}

/* ---------- 8. NAVIGATION (the single source of truth) ---------- */

function setupStage() {
  if (!state.profile) return "setup";
  if (state.pin.length !== PIN_LENGTH) return "pin-setup";
  return null;
}

function navigate(requested) {
  let name = SCREEN_ZONE[requested] ? requested : "home";
  if (!SCREEN_ZONE[requested]) console.error("Unknown screen:", requested);

  // Guard 1: setup must be finished first.
  const stage = setupStage();
  if (stage && name !== "setup" && name !== "pin-setup") name = stage;
  if (!stage && (name === "setup" || name === "pin-setup")) {
    // Setup is done (or being re-opened by mistake); only allowed while still in setup.
    if (isSetUp()) name = "home";
  }

  let zone = SCREEN_ZONE[name];
  const previousZone = document.body.dataset.zone;

  // Guard 2: parent screens need the PIN.
  if (zone === "parent" && !ui.parentUnlocked) {
    ui.afterPin = name;
    name = "pin";
    zone = "gate";
  }

  // Guard 3: no child screens once today's limit is used up.
  if (zone === "child" && isTimeUp()) {
    name = "break";
    zone = "break";
  }

  // Guard 4: the quiz needs a running quiz.
  if (name === "quiz" && !ui.quiz) name = "story";

  // Guard 5: results need a finished quiz.
  if (name === "results" && !ui.lastResult) name = "map";

  // Leaving the parent zone locks it again.
  if (previousZone === "parent" && zone !== "parent") ui.parentUnlocked = false;

  // Show only the chosen screen.
  $$(".screen").forEach(screen => { screen.hidden = screen.id !== "screen-" + name; });
  document.body.dataset.screen = name;
  document.body.dataset.zone = SCREEN_ZONE[name];

  if (SCREEN_ZONE[name] === "child") ui.lastChild = name;

  // The video only plays on the story screen.
  if (name !== "story") {
    const video = $("#story-video");
    if (video && !video.paused) video.pause();
  }

  renderScreen(name);

  window.scrollTo(0, 0);
  const main = $("#main");
  if (main) main.focus({ preventScroll: true });
}

function renderScreen(name) {
  switch (name) {
    case "setup": renderSetup(); break;
    case "pin-setup": renderPinSetup(); break;
    case "pin": renderPin(); break;
    case "home": renderHome(); break;
    case "guides": renderGuides(); break;
    case "map": renderMap(); break;
    case "level": renderLevel(); break;
    case "story": renderStory(); break;
    case "results": renderResults(); break;
    case "break": renderBreak(); break;
    case "parent": renderParent(); break;
    case "reports": renderReports(); break;
    case "settings": renderSettings(); break;
    default: break; // quiz is drawn by startQuiz()
  }
}

/* ---------- 9. SETUP AND PIN ---------- */

function renderSetup() {
  $("#child-name").value = state.profile ? state.profile.name : "";
  setText("#setup-error", "");
  if (!storageOk) showStorageWarning();
}

function renderPinSetup() {
  $("#setup-pin").value = "";
  $("#setup-pin-confirm").value = "";
  setText("#pin-setup-error", "");

  // If a profile already exists (recovery), there is no step 1 to go back to.
  $("#pin-setup-back").hidden = false;
  if (state.profile && state.pin === "" && ui.pinRecovery) $("#pin-setup-back").hidden = true;
}

function handleSetupSubmit(event) {
  event.preventDefault();
  const name = $("#child-name").value.trim().slice(0, MAX_NAME);

  state.profile = {
    name,
    createdAt: state.profile ? state.profile.createdAt : Date.now()
  };
  save();
  navigate("pin-setup");
}

function handlePinSetupSubmit(event) {
  event.preventDefault();
  const pin = $("#setup-pin").value.trim();
  const confirmPin = $("#setup-pin-confirm").value.trim();
  const error = $("#pin-setup-error");

  if (!/^\d{4}$/.test(pin)) {
    error.textContent = "Please use exactly 4 digits for the PIN.";
    $("#setup-pin").focus();
    return;
  }
  if (pin !== confirmPin) {
    error.textContent = "The two PINs don't match. Please try again.";
    $("#setup-pin-confirm").value = "";
    $("#setup-pin-confirm").focus();
    return;
  }

  state.pin = pin;
  ui.pinRecovery = false;
  logEvent("profile-created");
  showToast(`Welcome to MoralToons${state.profile && state.profile.name ? ", " + state.profile.name : ""}!`);
  navigate("home");
}

function renderPin() {
  $("#parent-pin-input").value = "";
  setText("#pin-error", "");
  updateLockoutMessage();
  setTimeout(() => { const input = $("#parent-pin-input"); if (input && !input.disabled) input.focus(); }, 0);
}

function updateLockoutMessage() {
  const input = $("#parent-pin-input");
  const submit = $("#pin-submit");
  const secondsLeft = Math.ceil((ui.lockedUntil - Date.now()) / 1000);

  clearInterval(ui.lockTimer);

  if (secondsLeft > 0) {
    input.disabled = true;
    submit.disabled = true;
    setText("#pin-error", `Too many tries. Please wait ${secondsLeft} seconds.`);
    ui.lockTimer = setInterval(updateLockoutMessage, 1000);
  } else {
    input.disabled = false;
    submit.disabled = false;
    if ($("#pin-error").textContent.startsWith("Too many tries")) setText("#pin-error", "");
  }
}

function handlePinSubmit(event) {
  event.preventDefault();
  if (Date.now() < ui.lockedUntil) { updateLockoutMessage(); return; }

  const input = $("#parent-pin-input");
  const entered = input.value.trim();

  if (!/^\d{4}$/.test(entered)) {
    setText("#pin-error", "Please enter your 4-digit PIN.");
    input.focus();
    return;
  }

  if (entered !== state.pin) {
    ui.pinFails += 1;
    input.value = "";

    if (ui.pinFails >= MAX_PIN_TRIES) {
      ui.pinFails = 0;
      ui.lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
      updateLockoutMessage();
    } else {
      setText("#pin-error", `That PIN doesn't match. Please try again (${MAX_PIN_TRIES - ui.pinFails} tries left).`);
      input.focus();
    }
    return;
  }

  ui.pinFails = 0;
  ui.parentUnlocked = true; // set BEFORE navigating so the guard lets us in
  const target = ui.afterPin || "parent";
  ui.afterPin = "parent";
  input.value = "";
  navigate(target);
}

function leaveParentZone() {
  ui.parentUnlocked = false;
  navigate(isTimeUp() ? "break" : "home");
}

/* ---------- 10. HOME AND GUIDES ---------- */

function renderHome() {
  const guide = currentGuide();
  const name = state.profile && state.profile.name;

  setText("#welcome-message", name
    ? `Hi ${name}! Come along with ${guide.name} and discover the magic of good values!`
    : `Come along with ${guide.name} and discover the magic of good values!`);
  setText("#home-xp", state.xp);
  setText("#home-coins", state.coins);
  setText("#home-levels", `${state.completedLevels.length}/${LEVELS.length}`);
  setText("#home-guide-caption", `${guide.name} is ready to learn with you!`);
  setCharacterImage($("#home-guide-image"), state.selectedGuide);
}

function renderGuides() {
  $$("[data-guide]").forEach(card => {
    const selected = card.dataset.guide === state.selectedGuide;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  setText("#guide-status", `${currentGuide().name} is your guide!`);
}

function selectGuide(key) {
  if (!CHARACTERS[key]) return;
  state.selectedGuide = key;
  save();
  renderGuides();
}

/* ---------- 11. LEARNING MAP AND LEVEL ---------- */

function renderMap() {
  setText("#map-xp", state.xp);
  setText("#map-coins", state.coins);
  setText("#map-completed", state.completedLevels.length);

  const container = $("#level-map");
  container.replaceChildren();

  LEVELS.forEach(level => {
    const completed = state.completedLevels.includes(level.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "level-card";
    card.dataset.level = String(level.id);
    if (level.playable) card.classList.add("unlocked");
    if (completed) card.classList.add("completed");
    if (!level.playable) card.setAttribute("aria-disabled", "true");

    const number = document.createElement("span");
    number.className = "level-number";
    number.textContent = String(level.id);

    const icon = document.createElement("span");
    icon.className = "level-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = level.playable ? level.icon : "🔒";

    const value = document.createElement("h3");
    value.textContent = level.value;

    const story = document.createElement("p");
    story.textContent = level.title;

    const status = document.createElement("span");
    status.className = "level-status";
    status.textContent = completed ? "⭐ Completed" : level.playable ? "▶ Play" : "🔒 Coming soon";

    card.append(number, icon, value, story, status);
    container.appendChild(card);
  });
}

function openLevel(id) {
  const level = levelById(id);
  if (!level || !level.playable || !LEVEL_CONTENT[id]) {
    showToast("This story is coming soon!");
    return;
  }
  ui.levelId = id;
  navigate("level");
}

function renderLevel() {
  const level = levelById(ui.levelId) || LEVELS[0];
  const completed = state.completedLevels.includes(level.id);

  setText("#level-number", `LEVEL ${level.id}`);
  setText("#level-value", level.value);
  setText("#level-story-title", level.title);
  setText("#level-description", level.description);
  setText("#level-status", completed ? "Completed ⭐" : "Ready to play");
  setText("#level-stars", state.levelStars[String(level.id)] || 0);
  setCharacterImage($("#level-guide-image"), state.selectedGuide);
}

/* ---------- 12. STORY ---------- */

function renderStory() {
  const level = levelById(ui.levelId) || LEVELS[0];
  const content = LEVEL_CONTENT[level.id];

  setText("#story-value-tag", `LEVEL ${level.id} • ${level.value.toUpperCase()}`);
  setText("#story-heading", level.title);
  setText("#story-tag", `🌿 ${level.value.toUpperCase()}`);
  setText("#story-description", content ? content.storyText : level.description);

  const note = $("#video-note");
  if (!ui.missingAssets.has("assets/ant-and-dove.mp4")) {
    note.textContent = `Watch with ${currentGuide().name}, then take the picture quiz!`;
  }
}

/* ---------- 13. QUIZ ---------- */

function startQuiz() {
  if (isTimeUp()) { navigate("break"); return; }

  const content = LEVEL_CONTENT[ui.levelId];
  if (!content) { showToast("This quiz is coming soon!"); return; }

  ui.quiz = {
    levelId: ui.levelId,
    index: 0,
    earnedXp: 0,
    wrongAnswers: 0,
    locked: false, // true after the right answer is chosen
    finished: false,
    readyAt: 0 // answers ignore taps for a moment after a new question appears
  };

  navigate("quiz");
  renderQuestion();
}

function currentQuestions() {
  return LEVEL_CONTENT[ui.quiz.levelId].questions;
}

function renderQuestion() {
  const quiz = ui.quiz;
  if (!quiz) return;

  const questions = currentQuestions();
  const q = questions[quiz.index];
  const level = levelById(quiz.levelId);

  quiz.locked = false;
  quiz.readyAt = Date.now() + 450; // protects against a double-tap on "Next" answering the next question

  setText("#quiz-value-tag", `LEVEL ${level.id} • ${level.value.toUpperCase()}`);
  setText("#quiz-counter", `Question ${quiz.index + 1} of ${questions.length}`);
  setText("#score", quiz.earnedXp);
  setText("#question-text", q.question);
  setText("#guide-question", `${currentGuide().name} says: let's think together!`);
  setCharacterImage($("#quiz-guide-image"), state.selectedGuide);

  const percent = Math.round((quiz.index / questions.length) * 100);
  $("#progress-bar").style.width = percent + "%";
  $("#progress-track").setAttribute("aria-valuenow", String(percent));

  // Scene picture (hidden automatically if the file is missing)
  const sceneWrap = $("#question-scene");
  const scene = $("#scene-image");
  sceneWrap.hidden = false;
  scene.dataset.fallbackTried = "";
  scene.dataset.placeholderApplied = "";
  scene.src = ASSET + q.scene;
  scene.alt = q.sceneAlt || "";

  // Answer buttons
  const grid = $("#answer-grid");
  grid.replaceChildren();
  q.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-card";
    button.dataset.answer = String(index);

    const image = document.createElement("img");
    image.src = ASSET + answer.image;
    image.alt = "";

    const label = document.createElement("span");
    label.textContent = answer.text;

    button.append(image, label);
    grid.appendChild(button);
  });

  $("#feedback").hidden = true;
  setText("#feedback-message", "");
  $("#feedback").className = "feedback";
  $("#next-button").hidden = true;
}

function checkAnswer(index) {
  const quiz = ui.quiz;
  if (!quiz || quiz.locked || quiz.finished) return; // blocks double clicks
  if (Date.now() < quiz.readyAt) return; // a new question just appeared
  if (isTimeUp()) { navigate("break"); return; }

  const questions = currentQuestions();
  const q = questions[quiz.index];
  const buttons = $$(".answer-card", $("#answer-grid"));
  const chosen = buttons[index];
  if (!chosen || chosen.disabled) return;

  const feedback = $("#feedback");
  const key = String(quiz.levelId);

  if (index === q.correct) {
    quiz.locked = true; // set first: later clicks do nothing
    buttons.forEach(b => { b.disabled = true; });
    chosen.classList.add("correct");

    state.rewarded[key] = state.rewarded[key] || [];
    const firstTime = !state.rewarded[key].includes(quiz.index);
    let message = `Wonderful! ⭐ ${q.explanation}`;

    if (firstTime) {
      state.rewarded[key].push(quiz.index);
      state.xp += XP_PER_ANSWER;
      state.coins += 1;
      quiz.earnedXp += XP_PER_ANSWER;
      message += ` +${XP_PER_ANSWER} XP and 1 coin!`;
      logEvent("correct", { level: quiz.levelId, q: quiz.index + 1, xp: XP_PER_ANSWER });
    } else {
      message += " (You already earned XP for this question. Great practice!)";
      logEvent("correct", { level: quiz.levelId, q: quiz.index + 1, xp: 0 });
    }

    save();
    feedback.className = "feedback success";
    setText("#feedback-message", message);
    setCharacterImage($("#reaction-image"), state.selectedGuide, "happy");
    feedback.hidden = false;
    setText("#score", quiz.earnedXp);
    replayAnimation($("#reaction"), "react-happy");
    if (firstTime) replayAnimation($(".score-pill"), "bump");

    const last = quiz.index === questions.length - 1;
    const next = $("#next-button");
    next.textContent = last ? "See My Results ⭐" : "Next Question →";
    next.hidden = false;
    next.focus();
  } else {
    // Wrong answer: no XP, that button is switched off, the child can try another picture.
    quiz.wrongAnswers += 1;
    chosen.disabled = true;
    chosen.classList.add("wrong");
    logEvent("wrong", { level: quiz.levelId, q: quiz.index + 1 });

    feedback.className = "feedback error";
    setText("#feedback-message", "Not quite! 💛 Look again and try another picture.");
    setCharacterImage($("#reaction-image"), state.selectedGuide, "sad");
    feedback.hidden = false;
    replayAnimation($("#reaction"), "react-sad");
  }
}

function nextQuestion() {
  const quiz = ui.quiz;
  if (!quiz || !quiz.locked || quiz.finished) return; // only after a correct answer
  quiz.locked = false; // so a double click can't skip a question

  if (quiz.index >= currentQuestions().length - 1) {
    finishQuiz();
    return;
  }
  quiz.index += 1;
  renderQuestion();
}

function finishQuiz() {
  const quiz = ui.quiz;
  quiz.finished = true;

  const stars = quiz.wrongAnswers === 0 ? 3 : quiz.wrongAnswers <= 2 ? 2 : 1;
  const key = String(quiz.levelId);
  const firstCompletion = !state.completedLevels.includes(quiz.levelId);

  if (firstCompletion) {
    state.completedLevels.push(quiz.levelId);
    state.coins += 5;
    logEvent("level-completed", { level: quiz.levelId });
  }
  state.levelStars[key] = Math.max(state.levelStars[key] || 0, stars);
  save();

  ui.lastResult = {
    levelId: quiz.levelId,
    earnedXp: quiz.earnedXp,
    stars,
    firstCompletion
  };
  ui.quiz = null;
  navigate("results");
}

function renderResults() {
  const result = ui.lastResult;
  if (!result) return;
  const content = LEVEL_CONTENT[result.levelId];

  setText("#results-stars", "⭐".repeat(result.stars) + "☆".repeat(3 - result.stars));
  setText("#results-message", content ? content.lesson : "Well done!");
  setText("#results-round-xp", result.earnedXp);
  setText("#results-total-xp", state.xp);
  setText("#results-coins", state.coins);
  setText("#results-note", result.firstCompletion
    ? "You finished a new level and earned 5 bonus coins!"
    : "Practice rounds are fun, but XP is earned only the first time for each question.");
  setCharacterImage($("#results-guide-image"), state.selectedGuide, "happy");
}

function replayQuiz() {
  ui.levelId = ui.lastResult ? ui.lastResult.levelId : ui.levelId;
  startQuiz();
}

/* ---------- 14. BREAK SCREEN ---------- */

function renderBreak() {
  $("#break-resume-button").hidden = isTimeUp();
  if (ui.limitLoggedFor !== dateKey() && isTimeUp()) {
    ui.limitLoggedFor = dateKey();
    logEvent("limit-reached");
  }
}

/* ---------- 15. LEARNING TIME TRACKING ---------- */

let lastTick = Date.now();

/* Adds time only while: the page is visible, a child screen is showing, and setup is done. */
function tick() {
  const now = Date.now();
  const delta = Math.min((now - lastTick) / 1000, MAX_TICK_SECONDS);
  lastTick = now;

  if (document.visibilityState !== "visible") return;
  if (!isSetUp()) return;
  if (ui.introActive) return; // the opening animation is not learning time

  const zone = document.body.dataset.zone;

  if (zone === "child") {
    const key = dateKey();
    state.usage[key] = Math.round(((state.usage[key] || 0) + delta) * 100) / 100;
    pruneOldUsage();
    save();

    if (isTimeUp()) navigate("break");
  } else if (zone === "break") {
    // A new day (or extra time) may have arrived while the break screen was open.
    $("#break-resume-button").hidden = isTimeUp();
  }
}

function pruneOldUsage() {
  const keys = Object.keys(state.usage).sort();
  while (keys.length > 400) delete state.usage[keys.shift()];
}

/* ---------- 16. PARENT DASHBOARD, REPORTS, SETTINGS ---------- */

function renderParent() {
  setText("#dash-today", formatMinutes(todayUsageSeconds()));
  setText("#dash-remaining", formatMinutes(remainingSeconds()));
  setText("#dash-xp", state.xp);
  setText("#dash-values", `${state.completedLevels.length}/${LEVELS.length}`);
  setText("#dash-child", childName());
  setText("#dash-guide", currentGuide().name);

  const bonus = state.bonus[dateKey()] || 0;
  setText("#dash-limit", `${state.dailyLimit} min` + (bonus ? ` (+${bonus} min today)` : ""));
  setText("#parent-message", "");
}

function addTimeToday() {
  const key = dateKey();
  state.bonus[key] = Math.min(600, (state.bonus[key] || 0) + BONUS_MINUTES);
  save();
  renderParent();
  setText("#parent-message", `Added ${BONUS_MINUTES} minutes for today.`);
}

function resumeLearning() {
  if (isTimeUp()) {
    setText("#parent-message", "Today's limit has been reached. Add time or raise the daily limit first.");
    return;
  }
  navigate("home"); // leaving the parent zone locks it again
}

function periodStartKey(period) {
  const days = period === "monthly" ? 30 : period === "weekly" ? 7 : 1;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return dateKey(start);
}

function renderReports() {
  const period = ui.reportPeriod;
  const start = periodStartKey(period);

  const seconds = Object.keys(state.usage)
    .filter(key => key >= start)
    .reduce((sum, key) => sum + state.usage[key], 0);

  const events = state.log.filter(entry => entry.date >= start);
  const correct = events.filter(e => e.type === "correct").length;
  const wrong = events.filter(e => e.type === "wrong").length;
  const xp = events.reduce((sum, e) => sum + (e.type === "correct" ? (e.xp || 0) : 0), 0);
  const values = events.filter(e => e.type === "level-completed").length;

  setText("#report-time", formatMinutes(seconds));
  setText("#report-values", values);
  setText("#report-accuracy", correct + wrong === 0 ? "—" : Math.round((correct / (correct + wrong)) * 100) + "%");
  setText("#report-xp", xp);
  setText("#report-period-title", period === "daily" ? "Today's report"
    : period === "weekly" ? "Last 7 days" : "Last 30 days");

  $$(".report-tab").forEach(tab => {
    const active = tab.dataset.period === period;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });

  const labels = {
    "profile-created": "Profile created",
    "correct": "Answered a quiz question correctly",
    "wrong": "Tried a quiz question",
    "level-completed": "Completed a new story",
    "limit-reached": "Daily screen-time limit reached"
  };

  const list = $("#report-list");
  list.replaceChildren();
  const recent = events.slice(-10).reverse();

  if (recent.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No learning activity recorded for this period yet.";
    list.appendChild(item);
  } else {
    recent.forEach(entry => {
      const item = document.createElement("li");
      item.textContent = `${new Date(entry.t).toLocaleString()} — ${labels[entry.type] || "Learning activity"}`;
      list.appendChild(item);
    });
  }
}

function renderSettings() {
  $("#profile-name").value = state.profile ? state.profile.name : "";
  $("#profile-guide").value = state.selectedGuide;
  $("#daily-limit").value = String(state.dailyLimit);
  ["#current-pin", "#new-pin", "#confirm-new-pin"].forEach(id => { $(id).value = ""; });
  ["#profile-message", "#limit-message", "#pin-change-message", "#data-message"].forEach(id => setText(id, ""));

  const list = $("#missing-assets");
  list.replaceChildren();
  const item = document.createElement("li");
  if (ui.missingAssets.size === 0) {
    item.textContent = "No missing files noticed so far.";
    list.appendChild(item);
  } else {
    ui.missingAssets.forEach(path => {
      const li = document.createElement("li");
      li.textContent = path;
      list.appendChild(li);
    });
  }
}

function saveProfile(event) {
  event.preventDefault();
  const guide = $("#profile-guide").value;
  state.profile = {
    name: $("#profile-name").value.trim().slice(0, MAX_NAME),
    createdAt: state.profile ? state.profile.createdAt : Date.now()
  };
  if (CHARACTERS[guide]) state.selectedGuide = guide;
  save();
  setText("#profile-message", "Profile saved.");
}

function saveLimit(event) {
  event.preventDefault();
  const raw = $("#daily-limit").value.trim();
  const minutes = Number(raw);

  if (raw === "" || !Number.isInteger(minutes) || minutes < MIN_LIMIT || minutes > MAX_LIMIT) {
    setText("#limit-message", `Please enter a whole number from ${MIN_LIMIT} to ${MAX_LIMIT}.`);
    return;
  }
  state.dailyLimit = minutes;
  save();
  setText("#limit-message", `Saved. The daily limit is now ${minutes} minutes.`);
}

function changePin(event) {
  event.preventDefault();
  const current = $("#current-pin").value.trim();
  const next = $("#new-pin").value.trim();
  const again = $("#confirm-new-pin").value.trim();
  const message = "#pin-change-message";

  if (current !== state.pin) { setText(message, "The current PIN is not correct."); return; }
  if (!/^\d{4}$/.test(next)) { setText(message, "The new PIN must be exactly 4 digits."); return; }
  if (next !== again) { setText(message, "The new PINs don't match."); return; }

  state.pin = next;
  save();
  ["#current-pin", "#new-pin", "#confirm-new-pin"].forEach(id => { $(id).value = ""; });
  setText(message, "PIN changed.");
}

async function resetProgress() {
  const ok = await askConfirm({
    title: "Reset learning progress?",
    text: "This clears XP, coins, stars, completed levels and the activity list. " +
          "The profile, PIN, settings and today's screen-time record stay.",
    okLabel: "Reset progress"
  });
  if (!ok) return;

  state.xp = 0;
  state.coins = 0;
  state.completedLevels = [];
  state.levelStars = {};
  state.rewarded = {};
  state.log = [];
  ui.quiz = null;
  ui.lastResult = null;
  save();
  setText("#data-message", "Learning progress was reset.");
}

async function deleteAccount() {
  const ok = await askConfirm({
    title: "Delete everything?",
    text: "This permanently deletes the profile, PIN, progress and history saved in this browser.",
    okLabel: "Delete everything",
    typeWord: "DELETE"
  });
  if (!ok) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "_damaged_backup");
  } catch (error) {
    console.warn("Could not clear saved data.", error);
  }

  state = defaultState();
  ui.parentUnlocked = false;
  ui.quiz = null;
  ui.lastResult = null;
  ui.pinFails = 0;
  ui.lockedUntil = 0;
  ui.afterPin = "parent";
  navigate("setup");
  showToast("All saved data was deleted.");
}

/* ---------- 17. EVENTS (one listener each, attached once) ---------- */

const ACTIONS = {
  "start-quiz": startQuiz,
  "next-question": nextQuestion,
  "replay-quiz": replayQuiz,
  "lock-parent": leaveParentZone,
  "pin-cancel": () => navigate(isTimeUp() ? "break" : (ui.lastChild || "home")),
  "resume-learning": resumeLearning,
  "add-time": addTimeToday,
  "reset-progress": resetProgress,
  "delete-account": deleteAccount
};

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const answer = target.closest("[data-answer]");
  if (answer) { checkAnswer(Number(answer.dataset.answer)); return; }

  const level = target.closest("[data-level]");
  if (level) { openLevel(Number(level.dataset.level)); return; }

  const guide = target.closest("[data-guide]");
  if (guide) { selectGuide(guide.dataset.guide); return; }

  const tab = target.closest("[data-period]");
  if (tab) { ui.reportPeriod = tab.dataset.period; renderReports(); return; }

  const action = target.closest("[data-action]");
  if (action && ACTIONS[action.dataset.action]) { ACTIONS[action.dataset.action](); return; }

  const nav = target.closest("[data-nav]");
  if (nav) { navigate(nav.dataset.nav); }
}

function setupEvents() {
  document.addEventListener("click", handleClick);

  // Only digits are allowed in PIN boxes.
  document.addEventListener("input", event => {
    const el = event.target;
    if (el instanceof HTMLInputElement && el.inputMode === "numeric" && el.type === "password") {
      el.value = el.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    }
  });

  $("#setup-form").addEventListener("submit", handleSetupSubmit);
  $("#pin-setup-form").addEventListener("submit", handlePinSetupSubmit);
  $("#pin-form").addEventListener("submit", handlePinSubmit);
  $("#profile-form").addEventListener("submit", saveProfile);
  $("#limit-form").addEventListener("submit", saveLimit);
  $("#change-pin-form").addEventListener("submit", changePin);

  // Missing pictures and videos (error events do not bubble, so we listen in the capture phase).
  document.addEventListener("error", event => {
    const el = event.target;
    if (el instanceof HTMLImageElement) handleImageError(el);
    else if (el instanceof HTMLSourceElement) handleVideoError(el.parentElement);
    else if (el instanceof HTMLVideoElement) handleVideoError(el);
  }, true);

  const video = $("#story-video");
  video.addEventListener("ended", () => {
    $("#start-quiz-button").classList.add("pulse");
  });
  video.addEventListener("play", () => {
    $("#start-quiz-button").classList.remove("pulse");
  });

  document.addEventListener("visibilitychange", () => {
    lastTick = Date.now();
    if (document.visibilityState === "hidden") save();
  });
  window.addEventListener("pagehide", save);
}

/* ---------- 18. START ---------- */

function startScreen() {
  const stage = setupStage();
  if (stage === "pin-setup") ui.pinRecovery = true;
  return stage || "home";
}

/* ---------- 18b. OPENING INTRO ---------- */

/* The intro is a cover on top of the page. The real start screen is chosen by navigate()
   underneath, exactly as before, so the intro can never skip setup or the PIN. */
function startIntro() {
  const intro = $("#intro");
  if (!intro) return;

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const showMs = reduced ? 1200 : 2600;
  const fadeMs = reduced ? 100 : 500;
  const covered = $$("#main, #site-header, .site-footer");
  let finished = false;

  ui.introActive = true;
  covered.forEach(el => el.setAttribute("inert", "")); // keyboard can't reach the page behind

  function finish() {
    if (finished) return;
    finished = true;
    intro.classList.add("leaving");
    setTimeout(() => {
      intro.hidden = true;
      covered.forEach(el => el.removeAttribute("inert"));
      ui.introActive = false;
      lastTick = Date.now();
      const main = $("#main");
      if (main) main.focus({ preventScroll: true });
    }, fadeMs);
  }

  intro.addEventListener("click", finish);
  setTimeout(finish, showMs);
}

function init() {
  setupEvents();

  // Pictures that already failed before this script ran
  $$("img").forEach(img => {
    if (img.getAttribute("src") && img.complete && img.naturalWidth === 0) handleImageError(img);
  });

  if (!storageOk) showStorageWarning();
  navigate(startScreen()); // setup, PIN setup, break or home – never stuck on a parent screen
  if (startupNotice) showToast(startupNotice);
  startIntro();

  setInterval(tick, TICK_MS);
  console.log("MoralToons is ready! 💛");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
