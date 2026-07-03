/* ==========================================================================
   MIL4N.DE - LANDING PAGE ROUTER & TYPOGRAPHY
   ========================================================================== */

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initClock();
  initTheme();
  initRouter();
});

/* ==========================================================================
   REAL-TIME CLOCK
   ========================================================================== */

function initClock() {
  const clockElement = document.getElementById("store-clock");
  
  function updateClock() {
    const now = new Date();
    
    // Month/Day/Year
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    
    // Hour:Minute
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12
    const hoursStr = String(hours).padStart(2, '0');
    
    // Timezone code (Default is BERLIN since user is in Germany, or dynamic)
    let timezone = "BERLIN";
    try {
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tzName.includes("Europe/Berlin")) timezone = "BERLIN";
      else if (tzName.includes("New_York")) timezone = "NYC";
      else if (tzName.includes("London")) timezone = "LDN";
      else timezone = tzName.split("/")[1].replace("_", " ").toUpperCase();
    } catch(e) {}
    
    // Exact 1:1 format: MM/DD/YYYY hh:mmam/pm TZ
    clockElement.textContent = `${month}/${day}/${year} ${hoursStr}:${minutes}${ampm} ${timezone}`;
  }
  
  updateClock();
  setInterval(updateClock, 1000);
}

/* ==========================================================================
   THEME MANAGER (DARK BY DEFAULT)
   ========================================================================== */

function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateToggleText(savedTheme);
  
  themeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateToggleText(newTheme);
  });
  
  function updateToggleText(theme) {
    themeToggle.textContent = `theme: ${theme === "dark" ? "light" : "dark"}`;
  }
}

/* ==========================================================================
   HASH ROUTER & PANEL SWAPPER
   ========================================================================== */

function initRouter() {
  window.addEventListener("hashchange", handleRouting);
  handleRouting();
}

let secretInterval = null;
let lastMessageCount = -1;

function handleRouting() {
  const hash = window.location.hash || "#menu";
  
  // Stoppe das Polling, wenn wir die Seite verlassen
  if (secretInterval) {
    clearInterval(secretInterval);
    secretInterval = null;
  }
  
  // Hide all panels
  document.querySelectorAll(".panel").forEach(panel => panel.classList.remove("active"));
  
  if (hash === "#menu" || hash === "") {
    document.getElementById("landing-menu").classList.add("active");
  } 
  else if (hash === "#about") {
    document.getElementById("about-view").classList.add("active");
  } 
  else if (hash === "#secret") {
    document.getElementById("secret-view").classList.add("active");
    lastMessageCount = -1; // Zurücksetzen für erzwungenes erstes Laden
    loadSecretMessages(true);
    // Starte Polling alle 3 Sekunden
    secretInterval = setInterval(() => loadSecretMessages(false), 3000);
  }
  else if (hash === "#secret-yatzy") {
    document.getElementById("yatzy-view").classList.add("active");
    initYatzyGame();
  }
  else {
    // Fallback to menu
    window.location.hash = "#menu";
  }
}

async function loadSecretMessages(isInitial = false) {
  const container = document.getElementById("secret-chat-history");
  if (!container) return;
  
  // Nur beim ersten Laden oder falls leer den Ladehinweis anzeigen
  if (isInitial || container.children.length === 0 || container.innerHTML.includes("loading chat history")) {
    container.innerHTML = '<p style="color: var(--gray-text);">loading chat history...</p>';
  }
  
  let messages = [];
  
  // Versuche zuerst, die Nachrichten vom API-Server zu laden
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    
    let apiUrl = "/api/messages";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      apiUrl = "http://localhost:5005/api/messages";
    }
    
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      messages = await response.json();
    } else {
      throw new Error("Local server failed");
    }
  } catch (e) {
    // Fallback auf statische messages.json
    try {
      const response = await fetch("messages.json");
      if (response.ok) {
        messages = await response.json();
      } else {
        if (isInitial) container.innerHTML = '<p style="color: var(--hover-color);">no messages found.</p>';
        return;
      }
    } catch (err) {
      if (isInitial) container.innerHTML = '<p style="color: var(--hover-color);">error loading messages.</p>';
      return;
    }
  }
  
  // Nur rendern, wenn sich die Anzahl der Nachrichten geändert hat (kein Flackern)
  if (messages.length === lastMessageCount) {
    return;
  }
  lastMessageCount = messages.length;
  
  if (messages.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-text);">no messages available.</p>';
    return;
  }
  
  container.innerHTML = "";
  messages.forEach(msg => {
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message";
    
    // Zeitstempel
    const timeSpan = document.createElement("span");
    timeSpan.className = "chat-message-time";
    timeSpan.textContent = msg.timestamp ? `[${msg.timestamp}]` : "";
    
    // Name
    const nameSpan = document.createElement("span");
    nameSpan.className = "chat-message-header";
    nameSpan.textContent = ` ${msg.name || "anon"}: `;
    
    // Text
    const textSpan = document.createElement("span");
    textSpan.className = "chat-message-text";
    textSpan.textContent = msg.text || "";
    
    msgDiv.appendChild(timeSpan);
    msgDiv.appendChild(nameSpan);
    msgDiv.appendChild(textSpan);
    
    container.appendChild(msgDiv);
  });
  
  // Nach unten scrollen
  container.scrollTop = container.scrollHeight;
}

/* ==========================================================================
   YATZY GAME LOGIC & SOLVER BOT
   ========================================================================== */

const CATEGORIES = [
  { id: 'ones', name: 'ones', section: 'upper' },
  { id: 'twos', name: 'twos', section: 'upper' },
  { id: 'threes', name: 'threes', section: 'upper' },
  { id: 'fours', name: 'fours', section: 'upper' },
  { id: 'fives', name: 'fives', section: 'upper' },
  { id: 'sixes', name: 'sixes', section: 'upper' },
  { id: 'upperSubtotal', name: 'subtotal', section: 'meta', calc: true },
  { id: 'upperBonus', name: 'bonus (>=63 = 35)', section: 'meta', calc: true },
  { id: 'threeOfKind', name: 'three of a kind', section: 'lower' },
  { id: 'fourOfKind', name: 'four of a kind', section: 'lower' },
  { id: 'fullHouse', name: 'full house (25)', section: 'lower' },
  { id: 'smallStraight', name: 'small straight (30)', section: 'lower' },
  { id: 'largeStraight', name: 'large straight (40)', section: 'lower' },
  { id: 'yahtzee', name: 'yatzy (50)', section: 'lower' },
  { id: 'yahtzeeBonus', name: 'yatzy bonus (+100)', section: 'meta', calc: true },
  { id: 'chance', name: 'chance', section: 'lower' },
  { id: 'totalScore', name: 'total', section: 'meta', calc: true }
];

const CATEGORY_EXPECTED_VALUES = {
  ones: 2.0,
  twos: 5.2,
  threes: 8.5,
  fours: 12.0,
  fives: 15.5,
  sixes: 19.0,
  threeOfKind: 15.0,
  fourOfKind: 7.0,
  fullHouse: 22.0,
  smallStraight: 23.0,
  largeStraight: 12.0,
  yahtzee: 17.0,
  chance: 22.0
};

const factMemo = [1, 1, 2, 6, 24, 120, 720];
function factorial(n) {
  return factMemo[n] || 1;
}

function getPermutationsCount(roll) {
  const counts = Array(7).fill(0);
  for (const val of roll) {
    counts[val]++;
  }
  let num = factorial(roll.length);
  let den = 1;
  for (let i = 1; i <= 6; i++) {
    den *= factorial(counts[i]);
  }
  return num / den;
}

function getUniqueRolls(m) {
  const results = [];
  function helper(currentRoll, startFace) {
    if (currentRoll.length === m) {
      results.push([...currentRoll]);
      return;
    }
    for (let face = startFace; face <= 6; face++) {
      currentRoll.push(face);
      helper(currentRoll, face);
      currentRoll.pop();
    }
  }
  helper([], 1);
  return results;
}

function isUpperCategory(cat) {
  return ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(cat);
}

function getScore(roll, category) {
  const counts = Array(7).fill(0);
  let sum = 0;
  for (const val of roll) {
    counts[val]++;
    sum += val;
  }
  
  switch (category) {
    case 'ones': return counts[1] * 1;
    case 'twos': return counts[2] * 2;
    case 'threes': return counts[3] * 3;
    case 'fours': return counts[4] * 4;
    case 'fives': return counts[5] * 5;
    case 'sixes': return counts[6] * 6;
    case 'threeOfKind': return counts.some(c => c >= 3) ? sum : 0;
    case 'fourOfKind': return counts.some(c => c >= 4) ? sum : 0;
    case 'fullHouse':
      const hasThree = counts.includes(3);
      const hasTwo = counts.includes(2);
      const hasFive = counts.includes(5);
      return (hasThree && hasTwo) || hasFive ? 25 : 0;
    case 'smallStraight':
      const hasSeq = (arr) => arr.every(val => counts[val] >= 1);
      if (hasSeq([1, 2, 3, 4]) || hasSeq([2, 3, 4, 5]) || hasSeq([3, 4, 5, 6])) {
        return 30;
      }
      return 0;
    case 'largeStraight':
      const hasSeqL = (arr) => arr.every(val => counts[val] >= 1);
      if (hasSeqL([1, 2, 3, 4, 5]) || hasSeqL([2, 3, 4, 5, 6])) {
        return 40;
      }
      return 0;
    case 'yahtzee': return counts.includes(5) ? 50 : 0;
    case 'chance': return sum;
    default: return 0;
  }
}

function getPotentialScore(roll, category, scorecard) {
  let score = getScore(roll, category);
  const counts = Array(7).fill(0);
  for (const val of roll) counts[val]++;
  
  const isYahtzee = counts.includes(5);
  const yahtzeeSlotFilled = scorecard['yahtzee'] !== null;
  const yahtzeeSlotIs50 = scorecard['yahtzee'] === 50;
  
  if (isYahtzee && yahtzeeSlotFilled && yahtzeeSlotIs50) {
    if (category === 'fullHouse') score = 25;
    else if (category === 'smallStraight') score = 30;
    else if (category === 'largeStraight') score = 40;
  }
  return score;
}

function getUpperSum(scorecard) {
  let sum = 0;
  const cats = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  for (const cat of cats) {
    if (scorecard[cat] !== null) {
      sum += scorecard[cat];
    }
  }
  return sum;
}

function getUpperBonus(scorecard) {
  const sum = getUpperSum(scorecard);
  return sum >= 63 ? 35 : 0;
}

function getTotalScore(scorecard) {
  let total = 0;
  total += getUpperSum(scorecard);
  total += getUpperBonus(scorecard);
  const lowerCats = ['threeOfKind', 'fourOfKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];
  for (const cat of lowerCats) {
    if (scorecard[cat] !== null) {
      total += scorecard[cat];
    }
  }
  total += scorecard.yahtzeeBonus || 0;
  return total;
}

function getUtility(roll, cat, scorecard, upperScore) {
  const score = getPotentialScore(roll, cat, scorecard);
  const counts = Array(7).fill(0);
  for (const val of roll) counts[val]++;
  const isYahtzee = counts.includes(5);
  
  let bonusAdded = 0;
  if (isYahtzee && scorecard['yahtzee'] === 50) {
    bonusAdded = 100;
  }
  
  let adjScore = score + bonusAdded;
  if (isUpperCategory(cat) && upperScore < 63) {
    adjScore += score * 0.55;
  }
  return adjScore - CATEGORY_EXPECTED_VALUES[cat];
}

function getMaxCategoryUtility(roll, remainingCategories, scorecard, upperScore) {
  let maxUtil = -Infinity;
  for (const cat of remainingCategories) {
    const utility = getUtility(roll, cat, scorecard, upperScore);
    if (utility > maxUtil) {
      maxUtil = utility;
    }
  }
  return maxUtil;
}

function calculateMaskEV_1(roll, mask, remainingCategories, scorecard, upperScore, rollUtilities) {
  const heldIndices = [];
  const rolledIndices = [];
  for (let i = 0; i < 5; i++) {
    if ((mask & (1 << i)) !== 0) {
      heldIndices.push(i);
    } else {
      rolledIndices.push(i);
    }
  }
  
  const m = rolledIndices.length;
  if (m === 0) {
    const sortedKey = [...roll].sort((a, b) => a - b).join(',');
    return rollUtilities.get(sortedKey) || 0;
  }
  
  const uniqueRolls = getUniqueRolls(m);
  let totalEV = 0;
  let totalPermutations = 0;
  
  for (const rolledVals of uniqueRolls) {
    const finalRoll = [...roll];
    for (let i = 0; i < m; i++) {
      finalRoll[rolledIndices[i]] = rolledVals[i];
    }
    const sortedKey = finalRoll.sort((a, b) => a - b).join(',');
    const permCount = getPermutationsCount(rolledVals);
    const utility = rollUtilities.get(sortedKey) || 0;
    
    totalEV += utility * permCount;
    totalPermutations += permCount;
  }
  
  return totalEV / totalPermutations;
}

function precomputeEV1Table(remainingCategories, scorecard, upperScore) {
  const allRolls5 = getUniqueRolls(5);
  const table = new Map();
  
  const rollUtilities = new Map();
  for (const roll of allRolls5) {
    const key = roll.join(',');
    rollUtilities.set(key, getMaxCategoryUtility(roll, remainingCategories, scorecard, upperScore));
  }
  
  for (const roll of allRolls5) {
    const rollKey = roll.join(',');
    let maxEV = -Infinity;
    for (let mask = 0; mask < 32; mask++) {
      const ev = calculateMaskEV_1(roll, mask, remainingCategories, scorecard, upperScore, rollUtilities);
      if (ev > maxEV) {
        maxEV = ev;
      }
    }
    table.set(rollKey, maxEV);
  }
  return table;
}

function calculateMaskEV_2(roll, mask, ev1Table) {
  const heldIndices = [];
  const rolledIndices = [];
  for (let i = 0; i < 5; i++) {
    if ((mask & (1 << i)) !== 0) {
      heldIndices.push(i);
    } else {
      rolledIndices.push(i);
    }
  }
  
  const m = rolledIndices.length;
  if (m === 0) {
    const sortedKey = [...roll].sort((a, b) => a - b).join(',');
    return ev1Table.get(sortedKey) || 0;
  }
  
  const uniqueRolls = getUniqueRolls(m);
  let totalEV = 0;
  let totalPermutations = 0;
  
  for (const rolledVals of uniqueRolls) {
    const finalRoll = [...roll];
    for (let i = 0; i < m; i++) {
      finalRoll[rolledIndices[i]] = rolledVals[i];
    }
    const sortedKey = finalRoll.sort((a, b) => a - b).join(',');
    const permCount = getPermutationsCount(rolledVals);
    
    const ev1 = ev1Table.get(sortedKey) || 0;
    totalEV += ev1 * permCount;
    totalPermutations += permCount;
  }
  
  return totalEV / totalPermutations;
}

function getBotDecision(roll, rollsRemaining, remainingCategories, scorecard) {
  const upperScore = getUpperSum(scorecard);
  
  if (rollsRemaining === 0) {
    let bestCategory = null;
    let bestScore = -Infinity;
    
    for (const cat of remainingCategories) {
      const utility = getUtility(roll, cat, scorecard, upperScore);
      if (utility > bestScore) {
        bestScore = utility;
        bestCategory = cat;
      }
    }
    return { action: 'score', category: bestCategory };
  }
  
  let bestMask = 0;
  let bestEV = -Infinity;
  
  if (rollsRemaining === 1) {
    const allRolls5 = getUniqueRolls(5);
    const rollUtilities = new Map();
    for (const r of allRolls5) {
      rollUtilities.set(r.join(','), getMaxCategoryUtility(r, remainingCategories, scorecard, upperScore));
    }
    
    for (let mask = 0; mask < 32; mask++) {
      const ev = calculateMaskEV_1(roll, mask, remainingCategories, scorecard, upperScore, rollUtilities);
      if (ev > bestEV) {
        bestEV = ev;
        bestMask = mask;
      }
    }
    return { action: 'hold', mask: bestMask };
  }
  
  if (rollsRemaining === 2) {
    const ev1Table = precomputeEV1Table(remainingCategories, scorecard, upperScore);
    
    for (let mask = 0; mask < 32; mask++) {
      const ev = calculateMaskEV_2(roll, mask, ev1Table);
      if (ev > bestEV) {
        bestEV = ev;
        bestMask = mask;
      }
    }
    return { action: 'hold', mask: bestMask };
  }
}

// Game State
let yatzyState = {
  mode: 'solo',
  activePlayer: 'player',
  rollsRemaining: 3,
  dice: [1, 2, 3, 4, 5],
  held: [false, false, false, false, false],
  scorecards: {
    player: {
      ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
      threeOfKind: null, fourOfKind: null, fullHouse: null, smallStraight: null, largeStraight: null,
      yahtzee: null, chance: null,
      yahtzeeBonus: 0
    },
    bot: {
      ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
      threeOfKind: null, fourOfKind: null, fullHouse: null, smallStraight: null, largeStraight: null,
      yahtzee: null, chance: null,
      yahtzeeBonus: 0
    }
  },
  round: 1,
  isRolling: false,
  hasStartedOnce: false
};

// Elements cache
let yatzyElements = {};

function initYatzyGame() {
  if (yatzyState.hasStartedOnce) return;
  yatzyState.hasStartedOnce = true;
  
  // Cache DOM elements
  yatzyElements = {
    setupSection: document.getElementById("yatzy-setup"),
    gameArea: document.getElementById("yatzy-game-area"),
    btnSolo: document.getElementById("yatzy-mode-solo"),
    btnBot: document.getElementById("yatzy-mode-bot"),
    btnStart: document.getElementById("yatzy-start-btn"),
    status: document.getElementById("yatzy-status"),
    btnRoll: document.getElementById("yatzy-roll-btn"),
    dice: document.querySelectorAll(".yatzy-die"),
    colBot: document.querySelectorAll(".bot-col"),
    scorecardBody: document.getElementById("yatzy-scorecard-body")
  };
  
  // Event listeners for Setup
  yatzyElements.btnSolo.addEventListener("click", () => {
    yatzyState.mode = 'solo';
    yatzyElements.btnSolo.classList.add("active");
    yatzyElements.btnBot.classList.remove("active");
  });
  
  yatzyElements.btnBot.addEventListener("click", () => {
    yatzyState.mode = 'bot';
    yatzyElements.btnBot.classList.add("active");
    yatzyElements.btnSolo.classList.remove("active");
  });
  
  yatzyElements.btnStart.addEventListener("click", startYatzyGame);
  
  // Event listener for Roll
  yatzyElements.btnRoll.addEventListener("click", playerRollDice);
  
  // Event listener for clicking on dice
  yatzyElements.dice.forEach(die => {
    die.addEventListener("click", () => {
      if (yatzyState.activePlayer !== 'player' || yatzyState.rollsRemaining === 3 || yatzyState.rollsRemaining === 0 || yatzyState.isRolling) {
        return;
      }
      const index = parseInt(die.dataset.index);
      yatzyState.held[index] = !yatzyState.held[index];
      updateYatzyUI();
    });
  });
}

function startYatzyGame() {
  // Reset state
  yatzyState.activePlayer = 'player';
  yatzyState.rollsRemaining = 3;
  yatzyState.dice = [1, 2, 3, 4, 5];
  yatzyState.held = [false, false, false, false, false];
  yatzyState.round = 1;
  yatzyState.isRolling = false;
  
  const resetScorecard = () => ({
    ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
    threeOfKind: null, fourOfKind: null, fullHouse: null, smallStraight: null, largeStraight: null,
    yahtzee: null, chance: null,
    yahtzeeBonus: 0
  });
  
  yatzyState.scorecards.player = resetScorecard();
  yatzyState.scorecards.bot = resetScorecard();
  
  // Update col Bot visibility
  document.getElementById("col-header-bot").style.display = yatzyState.mode === 'bot' ? 'table-cell' : 'none';
  
  // Toggle screens
  yatzyElements.setupSection.style.display = "none";
  yatzyElements.gameArea.style.display = "block";
  
  yatzyElements.dice.forEach(die => {
    die.textContent = "-";
    die.classList.remove("held");
  });
  
  updatePlayerStatus("your turn. roll to start the game.");
  updateYatzyUI();
}

function updatePlayerStatus(text) {
  yatzyElements.status.textContent = text;
  yatzyElements.status.style.color = "var(--text-color)";
}

function updateBotStatus(text) {
  yatzyElements.status.textContent = text;
  yatzyElements.status.style.color = "var(--accent-color)";
}

function playerRollDice() {
  if (yatzyState.activePlayer !== 'player' || yatzyState.rollsRemaining === 0 || yatzyState.isRolling) {
    return;
  }
  
  const rolledIndices = [];
  for (let i = 0; i < 5; i++) {
    if (!yatzyState.held[i]) {
      rolledIndices.push(i);
    }
  }
  
  if (rolledIndices.length === 0) return;
  
  updatePlayerStatus("rolling...");
  animateYatzyDiceRoll(() => {
    yatzyState.rollsRemaining--;
    updatePlayerStatus(yatzyState.rollsRemaining === 0 ? "end turn: choose a category on the scorecard." : "click on dice to hold or choose a category.");
    updateYatzyUI();
  }, rolledIndices);
}

function animateYatzyDiceRoll(onComplete, rolledIndices) {
  yatzyState.isRolling = true;
  yatzyElements.btnRoll.disabled = true;
  
  rolledIndices.forEach(idx => {
    yatzyElements.dice[idx].classList.add("rolling");
  });
  
  const interval = setInterval(() => {
    rolledIndices.forEach(idx => {
      yatzyElements.dice[idx].textContent = Math.floor(Math.random() * 6) + 1;
    });
  }, 50);
  
  setTimeout(() => {
    clearInterval(interval);
    rolledIndices.forEach(idx => {
      yatzyElements.dice[idx].classList.remove("rolling");
      const val = Math.floor(Math.random() * 6) + 1;
      yatzyState.dice[idx] = val;
    });
    
    yatzyState.isRolling = false;
    yatzyElements.btnRoll.disabled = false;
    onComplete();
  }, 800);
}

function updateYatzyUI() {
  // Update roll button
  if (yatzyState.activePlayer === 'player') {
    yatzyElements.btnRoll.disabled = yatzyState.rollsRemaining === 0 || yatzyState.isRolling;
    yatzyElements.btnRoll.textContent = `roll (${yatzyState.rollsRemaining} left)`;
  } else {
    yatzyElements.btnRoll.disabled = true;
    yatzyElements.btnRoll.textContent = "bot is playing...";
  }
  
  // Update dice elements representation
  for (let i = 0; i < 5; i++) {
    const die = yatzyElements.dice[i];
    if (yatzyState.rollsRemaining < 3) {
      die.textContent = yatzyState.dice[i];
    }
    
    if (yatzyState.held[i]) {
      die.classList.add("held");
    } else {
      die.classList.remove("held");
    }
  }
  
  // Render scorecard
  renderScorecard();
}

function renderScorecard() {
  const tbody = yatzyElements.scorecardBody;
  tbody.innerHTML = "";
  
  const playerCard = yatzyState.scorecards.player;
  const botCard = yatzyState.scorecards.bot;
  
  const pUpperSum = getUpperSum(playerCard);
  const pUpperBonus = getUpperBonus(playerCard);
  const bUpperSum = getUpperSum(botCard);
  const bUpperBonus = getUpperBonus(botCard);
  
  CATEGORIES.forEach(cat => {
    const tr = document.createElement("tr");
    
    if (cat.section === 'meta') {
      tr.className = cat.id === 'totalScore' ? 'total-row' : 'subtotal-row';
    }
    
    // Category Name
    const tdName = document.createElement("td");
    tdName.textContent = cat.name;
    tr.appendChild(tdName);
    
    // Player Score
    const tdPlayer = document.createElement("td");
    tdPlayer.className = "score-cell";
    
    if (cat.calc) {
      tdPlayer.className += " filled";
      if (cat.id === 'upperSubtotal') tdPlayer.textContent = pUpperSum;
      else if (cat.id === 'upperBonus') tdPlayer.textContent = pUpperBonus;
      else if (cat.id === 'yahtzeeBonus') tdPlayer.textContent = playerCard.yahtzeeBonus;
      else if (cat.id === 'totalScore') tdPlayer.textContent = getTotalScore(playerCard);
    } else {
      const pScore = playerCard[cat.id];
      if (pScore !== null) {
        tdPlayer.textContent = pScore;
        tdPlayer.className += " filled";
      } else {
        if (yatzyState.activePlayer === 'player' && yatzyState.rollsRemaining < 3 && !yatzyState.isRolling) {
          const potScore = getPotentialScore(yatzyState.dice, cat.id, playerCard);
          tdPlayer.textContent = potScore;
          tdPlayer.className += " empty";
          
          tdPlayer.onclick = () => {
            selectCategoryForPlayer(cat.id, potScore);
          };
        } else {
          tdPlayer.textContent = "-";
          tdPlayer.className += " empty";
        }
      }
    }
    tr.appendChild(tdPlayer);
    
    // Bot Score
    if (yatzyState.mode === 'bot') {
      const tdBot = document.createElement("td");
      tdBot.className = "score-cell bot-cell bot-col";
      
      if (cat.calc) {
        tdBot.className += " filled";
        if (cat.id === 'upperSubtotal') tdBot.textContent = bUpperSum;
        else if (cat.id === 'upperBonus') tdBot.textContent = bUpperBonus;
        else if (cat.id === 'yahtzeeBonus') tdBot.textContent = botCard.yahtzeeBonus;
        else if (cat.id === 'totalScore') tdBot.textContent = getTotalScore(botCard);
      } else {
        const bScore = botCard[cat.id];
        if (bScore !== null) {
          tdBot.textContent = bScore;
          tdBot.className += " filled";
        } else {
          tdBot.textContent = "-";
        }
      }
      tr.appendChild(tdBot);
    }
    
    tbody.appendChild(tr);
  });
}

function selectCategoryForPlayer(catId, score) {
  const playerCard = yatzyState.scorecards.player;
  if (playerCard[catId] !== null) return;
  
  const counts = Array(7).fill(0);
  for (const val of yatzyState.dice) counts[val]++;
  const isYahtzee = counts.includes(5);
  
  if (isYahtzee && playerCard['yahtzee'] === 50) {
    playerCard.yahtzeeBonus += 100;
  }
  
  playerCard[catId] = score;
  
  if (yatzyState.mode === 'solo') {
    if (isGameOver()) {
      endYatzyGame();
    } else {
      yatzyState.rollsRemaining = 3;
      yatzyState.held = [false, false, false, false, false];
      yatzyState.round++;
      updateYatzyUI();
      updatePlayerStatus("your turn. roll to start the round.");
    }
  } else {
    if (isGameOver()) {
      endYatzyGame();
    } else {
      runBotTurn();
    }
  }
}

function runBotTurn() {
  yatzyState.activePlayer = 'bot';
  yatzyState.rollsRemaining = 3;
  yatzyState.held = [false, false, false, false, false];
  updateYatzyUI();
  
  updateBotStatus("bot is rolling...");
  setTimeout(() => {
    const rolledIndices = [0, 1, 2, 3, 4];
    animateYatzyDiceRoll(() => {
      yatzyState.rollsRemaining = 2;
      updateYatzyUI();
      
      const remainingBotCategories = getRemainingCategories(yatzyState.scorecards.bot);
      const decision = getBotDecision(yatzyState.dice, 2, remainingBotCategories, yatzyState.scorecards.bot);
      applyBotHold(decision.mask);
      updateBotStatus("bot is thinking...");
      updateYatzyUI();
      
      setTimeout(() => {
        const rolledIndices2 = [];
        for (let i = 0; i < 5; i++) {
          if (!yatzyState.held[i]) rolledIndices2.push(i);
        }
        
        if (rolledIndices2.length === 0) {
          botSecondRollComplete(remainingBotCategories);
        } else {
          updateBotStatus("bot is rolling...");
          animateYatzyDiceRoll(() => {
            yatzyState.rollsRemaining = 1;
            updateYatzyUI();
            
            const decision2 = getBotDecision(yatzyState.dice, 1, remainingBotCategories, yatzyState.scorecards.bot);
            applyBotHold(decision2.mask);
            updateBotStatus("bot is thinking...");
            updateYatzyUI();
            
            setTimeout(() => {
              const rolledIndices3 = [];
              for (let i = 0; i < 5; i++) {
                if (!yatzyState.held[i]) rolledIndices3.push(i);
              }
              
              if (rolledIndices3.length === 0) {
                botThirdRollComplete(remainingBotCategories);
              } else {
                updateBotStatus("bot is rolling...");
                animateYatzyDiceRoll(() => {
                  yatzyState.rollsRemaining = 0;
                  updateYatzyUI();
                  botThirdRollComplete(remainingBotCategories);
                }, rolledIndices3);
              }
            }, 1000);
          }, rolledIndices2);
        }
      }, 1000);
    }, rolledIndices);
  }, 1000);
}

function botSecondRollComplete(remainingBotCategories) {
  const decision2 = getBotDecision(yatzyState.dice, 1, remainingBotCategories, yatzyState.scorecards.bot);
  applyBotHold(decision2.mask);
  updateBotStatus("bot is thinking...");
  updateYatzyUI();
  
  setTimeout(() => {
    botThirdRollComplete(remainingBotCategories);
  }, 1000);
}

function botThirdRollComplete(remainingBotCategories) {
  const decision3 = getBotDecision(yatzyState.dice, 0, remainingBotCategories, yatzyState.scorecards.bot);
  const cat = decision3.category;
  const score = getPotentialScore(yatzyState.dice, cat, yatzyState.scorecards.bot);
  
  const counts = Array(7).fill(0);
  for (const val of yatzyState.dice) counts[val]++;
  const isYahtzee = counts.includes(5);
  
  if (isYahtzee && yatzyState.scorecards.bot['yahtzee'] === 50) {
    yatzyState.scorecards.bot.yahtzeeBonus += 100;
  }
  
  yatzyState.scorecards.bot[cat] = score;
  updateBotStatus(`bot chooses ${getCategoryEnglishName(cat)} for ${score} points.`);
  updateYatzyUI();
  
  setTimeout(() => {
    const roundOver = isGameOver();
    if (roundOver) {
      endYatzyGame();
    } else {
      yatzyState.activePlayer = 'player';
      yatzyState.rollsRemaining = 3;
      yatzyState.held = [false, false, false, false, false];
      yatzyState.round++;
      updateYatzyUI();
      updatePlayerStatus("your turn. roll to start the round.");
    }
  }, 1500);
}

function applyBotHold(mask) {
  for (let i = 0; i < 5; i++) {
    yatzyState.held[i] = (mask & (1 << i)) !== 0;
  }
}

function getRemainingCategories(scorecard) {
  return Object.keys(CATEGORY_EXPECTED_VALUES).filter(cat => scorecard[cat] === null);
}

function getCategoryEnglishName(cat) {
  const category = CATEGORIES.find(c => c.id === cat);
  return category ? category.name : cat;
}

function isGameOver() {
  const cats = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'threeOfKind', 'fourOfKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];
  const playerFilled = cats.every(cat => yatzyState.scorecards.player[cat] !== null);
  
  if (yatzyState.mode === 'bot') {
    const botFilled = cats.every(cat => yatzyState.scorecards.bot[cat] !== null);
    return playerFilled && botFilled;
  }
  return playerFilled;
}

function endYatzyGame() {
  const pTotal = getTotalScore(yatzyState.scorecards.player);
  let statusText = `game over! your total score: ${pTotal}.`;
  
  if (yatzyState.mode === 'bot') {
    const bTotal = getTotalScore(yatzyState.scorecards.bot);
    if (pTotal > bTotal) {
      statusText = `you won! ${pTotal} to ${bTotal}.`;
    } else if (bTotal > pTotal) {
      statusText = `bot won! ${bTotal} to ${pTotal}.`;
    } else {
      statusText = `it's a tie! both have ${pTotal} points.`;
    }
  }
  
  updatePlayerStatus(statusText);
  yatzyElements.btnRoll.style.display = "none";
  
  const controlContainer = document.querySelector(".yatzy-game-controls");
  let restartBtn = document.getElementById("yatzy-restart-game-btn");
  if (!restartBtn) {
    restartBtn = document.createElement("button");
    restartBtn.id = "yatzy-restart-game-btn";
    restartBtn.className = "yatzy-btn-primary";
    restartBtn.textContent = "play again";
    restartBtn.addEventListener("click", () => {
      restartBtn.style.display = "none";
      yatzyElements.btnRoll.style.display = "inline-block";
      yatzyElements.setupSection.style.display = "block";
      yatzyElements.gameArea.style.display = "none";
    });
    controlContainer.appendChild(restartBtn);
  } else {
    restartBtn.style.display = "inline-block";
  }
}
