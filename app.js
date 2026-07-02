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
  else {
    // Fallback to menu
    window.location.hash = "#menu";
  }
}

async function loadSecretMessages(isInitial = false) {
  const container = document.getElementById("secret-chat-history");
  if (!container) return;
  
  // Nur beim ersten Laden oder falls leer den Ladehinweis anzeigen
  if (isInitial || container.children.length === 0 || container.innerHTML.includes("Lade Chatverlauf")) {
    container.innerHTML = '<p style="color: var(--gray-text);">Lade Chatverlauf...</p>';
  }
  
  let messages = [];
  
  // Versuche zuerst, die Nachrichten vom lokalen API-Server zu laden
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const response = await fetch("http://localhost:5005/api/messages", { signal: controller.signal });
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
        if (isInitial) container.innerHTML = '<p style="color: var(--hover-color);">Keine Nachrichten gefunden.</p>';
        return;
      }
    } catch (err) {
      if (isInitial) container.innerHTML = '<p style="color: var(--hover-color);">Fehler beim Laden der Nachrichten.</p>';
      return;
    }
  }
  
  // Nur rendern, wenn sich die Anzahl der Nachrichten geändert hat (kein Flackern)
  if (messages.length === lastMessageCount) {
    return;
  }
  lastMessageCount = messages.length;
  
  if (messages.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-text);">Keine Nachrichten vorhanden.</p>';
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
