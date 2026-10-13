/**
 * The Price is Right - Senior Breakfast App Logic
 * Handles Bidding Mechanics, Shift Animations, Tabs, and Drive Sync.
 */

const STORAGE_KEY_GAS_URL = "pir_gas_web_app_url";

let gameState = {
  roundNumber: 1,
  currentPrize: { name: "Senior Breakfast VIP Reserved Table", actualPrice: 85 },
  activeContestants: [
    { id: "c1", name: "Contestant 1", bid: null, isWinner: false, overbid: false },
    { id: "c2", name: "Contestant 2", bid: null, isWinner: false, overbid: false },
    { id: "c3", name: "Contestant 3", bid: null, isWinner: false, overbid: false },
    { id: "c4", name: "Contestant 4", bid: null, isWinner: false, overbid: false }
  ],
  rosterQueue: [
    "Alex Smith", "Jordan Lee", "Taylor Davis", "Morgan Reed", "Chris Evans"
  ],
  winnerId: null
};

// --- DOM References ---
const podiumsTrack = document.getElementById("podiums-track");
const prizeDescInput = document.getElementById("prize-description");
const arpInput = document.getElementById("actual-retail-price");
const roundIndicator = document.getElementById("round-indicator");
const announcementBanner = document.getElementById("announcement-banner");
const btnTabulate = document.getElementById("btn-tabulate");
const btnAdvance = document.getElementById("btn-advance");
const btnRevealArp = document.getElementById("btn-reveal-arp");
const btnResetQuad = document.getElementById("btn-reset-quad");
const onDeckList = document.getElementById("on-deck-list");
const btnAddStudent = document.getElementById("btn-add-student");
const driveModal = document.getElementById("drive-modal");
const gasUrlInput = document.getElementById("gas-url-input");
const btnSyncSettings = document.getElementById("btn-sync-settings");
const btnSaveGasUrl = document.getElementById("btn-save-gas-url");
const btnCloseModal = document.getElementById("btn-close-modal");
const syncDot = document.getElementById("sync-status");

// --- Initialization ---
window.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  loadGasUrl();
  renderPodiums();
  renderOnDeck();
  syncFromDrive();
});

// --- Tab Navigation ---
function setupNavigation() {
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const viewId = tab.getAttribute("data-view");
      document.getElementById(viewId).classList.add("active");
    });
  });
}

// --- Render Contestants' Row ---
function renderPodiums() {
  podiumsTrack.innerHTML = "";
  
  gameState.activeContestants.forEach((c, index) => {
    const card = document.createElement("div");
    card.className = `podium-card ${c.isWinner ? "winner" : ""} ${c.overbid ? "overbid" : ""}`;
    card.id = `podium-${c.id}`;

    const formattedBid = c.bid !== null ? `$${c.bid}` : "----";

    card.innerHTML = `
      <div class="podium-header">
        <span class="podium-number">#${index + 1}</span>
        <input type="text" class="podium-name-input" value="${c.name}" data-idx="${index}" placeholder="Name">
      </div>
      <div class="eggcrate-display">
        <div class="bid-readout">${formattedBid}</div>
      </div>
      <div class="podium-input-area">
        <input type="number" class="podium-bid-input" placeholder="Bid" value="${c.bid !== null ? c.bid : ''}" data-idx="${index}">
      </div>
    `;
    podiumsTrack.appendChild(card);
  });

  // Attach live editing listeners
  document.querySelectorAll(".podium-name-input").forEach(input => {
    input.addEventListener("change", (e) => {
      const idx = e.target.getAttribute("data-idx");
      gameState.activeContestants[idx].name = e.target.value;
      saveToDrive();
    });
  });

  document.querySelectorAll(".podium-bid-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.getAttribute("data-idx");
      const val = parseInt(e.target.value, 10);
      gameState.activeContestants[idx].bid = isNaN(val) ? null : val;
      const readout = e.target.closest(".podium-card").querySelector(".bid-readout");
      readout.textContent = isNaN(val) ? "----" : `$${val}`;
    });
  });

  roundIndicator.textContent = gameState.roundNumber;
  prizeDescInput.value = gameState.currentPrize.name;
}

function renderOnDeck() {
  onDeckList.innerHTML = "";
  gameState.rosterQueue.forEach(name => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = name;
    onDeckList.appendChild(chip);
  });
}

// --- Bidding Logic (The Price is Right Rules) ---
btnTabulate.addEventListener("click", () => {
  const actualPrice = parseInt(arpInput.value, 10);
  if (isNaN(actualPrice) || actualPrice <= 0) {
    alert("Please enter a valid Actual Retail Price before tabulating!");
    arpInput.focus();
    return;
  }

  let highestEligibleBid = -1;
  let winnerIndex = -1;
  let allOver = true;

  // Evaluate closest without going over
  gameState.activeContestants.forEach((c, i) => {
    c.isWinner = false;
    c.overbid = false;

    if (c.bid !== null) {
      if (c.bid > actualPrice) {
        c.overbid = true;
      } else {
        allOver = false;
        if (c.bid > highestEligibleBid) {
          highestEligibleBid = c.bid;
          winnerIndex = i;
        }
      }
    }
  });

  if (allOver) {
    announcementBanner.textContent = "★ OVERBID! ALL CONTESTANTS BID OVER THE ACTUAL PRICE! ERASE AND RE-BID! ★";
    btnAdvance.disabled = true;
    gameState.winnerId = null;
  } else if (winnerIndex !== -1) {
    gameState.activeContestants[winnerIndex].isWinner = true;
    gameState.winnerId = gameState.activeContestants[winnerIndex].id;
    const winner = gameState.activeContestants[winnerIndex];
    announcementBanner.textContent = `★ WINNER: ${winner.name.toUpperCase()} WITH A BID OF $${winner.bid}! (ACTUAL: $${actualPrice}) ★`;
    btnAdvance.disabled = false;
  }

  renderPodiums();
});

btnRevealArp.addEventListener("click", () => {
  if (arpInput.type === "password") {
    arpInput.type = "number";
    btnRevealArp.textContent = "Hide ARP";
  } else {
    arpInput.type = "password";
    btnRevealArp.textContent = "Reveal ARP";
  }
});

// --- Winner Transition & Right-to-Left Sliding Animation ---
btnAdvance.addEventListener("click", () => {
  if (!gameState.winnerId) return;

  const winnerIdx = gameState.activeContestants.findIndex(c => c.id === gameState.winnerId);
  if (winnerIdx === -1) return;

  const winnerCard = document.getElementById(`podium-${gameState.winnerId}`);
  
  // 1. Exit animation for the winner
  if (winnerCard) {
    winnerCard.classList.add("winning-exit");
  }

  setTimeout(() => {
    // 2. Remove the winning contestant
    gameState.activeContestants.splice(winnerIdx, 1);

    // 3. Slide remaining contestants left and pop the next one from the roster queue onto spot 4 (right)
    const nextName = gameState.rosterQueue.shift() || `New Contestant`;
    const newContestant = {
      id: "c_" + Date.now(),
      name: nextName,
      bid: null,
      isWinner: false,
      overbid: false
    };
    gameState.activeContestants.push(newContestant);

    // Reset bids for remaining contestants
    gameState.activeContestants.forEach(c => {
      c.bid = null;
      c.isWinner = false;
      c.overbid = false;
    });

    gameState.roundNumber += 1;
    gameState.winnerId = null;
    btnAdvance.disabled = true;
    arpInput.value = "";
    announcementBanner.textContent = `WELCOME TO THE ROW, ${nextName.toUpperCase()}! PLACE BIDS FOR ROUND ${gameState.roundNumber}.`;

    renderPodiums();
    renderOnDeck();

    // Add CSS enter slide on the new incoming 4th spot
    const newCards = document.querySelectorAll(".podium-card");
    if (newCards.length > 0) {
      newCards[newCards.length - 1].classList.add("entering");
    }

    saveToDrive();
  }, 500);
});

// --- Fresh 4 Contestants Reset (e.g., After Round 3) ---
btnResetQuad.addEventListener("click", () => {
  const confirmReset = confirm("Reset Contestants' Row with 4 fresh contestants from the roster queue?");
  if (!confirmReset) return;

  gameState.activeContestants = [];
  for (let i = 0; i < 4; i++) {
    const nextName = gameState.rosterQueue.shift() || `Player ${i + 1}`;
    gameState.activeContestants.push({
      id: "c_" + Date.now() + "_" + i,
      name: nextName,
      bid: null,
      isWinner: false,
      overbid: false
    });
  }

  gameState.winnerId = null;
  btnAdvance.disabled = true;
  arpInput.value = "";
  announcementBanner.textContent = "★ NEW CONTESTANTS' ROW READY FOR ROUND 4! COME ON DOWN! ★";

  renderPodiums();
  renderOnDeck();
  saveToDrive();
});

// --- Contestant Queue Management ---
btnAddStudent.addEventListener("click", () => {
  const name = prompt("Enter student name for roster queue:");
  if (name && name.trim()) {
    gameState.rosterQueue.push(name.trim());
    renderOnDeck();
    saveToDrive();
  }
});

// --- Google Drive Apps Script Synchronization ---
function loadGasUrl() {
  const url = localStorage.getItem(STORAGE_KEY_GAS_URL) || "";
  gasUrlInput.value = url;
}

btnSyncSettings.addEventListener("click", () => driveModal.showModal());
btnCloseModal.addEventListener("click", () => driveModal.close());

btnSaveGasUrl.addEventListener("click", () => {
  const url = gasUrlInput.value.trim();
  localStorage.setItem(STORAGE_KEY_GAS_URL, url);
  driveModal.close();
  syncFromDrive();
});

async function saveToDrive() {
  const url = localStorage.getItem(STORAGE_KEY_GAS_URL);
  if (!url) return;

  syncDot.classList.remove("synced");
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", state: gameState })
    });
    syncDot.classList.add("synced");
  } catch (err) {
    console.error("Failed to save to Google Drive:", err);
  }
}

async function syncFromDrive() {
  const url = localStorage.getItem(STORAGE_KEY_GAS_URL);
  if (!url) return;

  syncDot.classList.remove("synced");
  try {
    const res = await fetch(`${url}?action=load`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.activeContestants) {
        gameState = data;
        renderPodiums();
        renderOnDeck();
      }
      syncDot.classList.add("synced");
    }
  } catch (err) {
    console.warn("Drive state not yet initialized or network offline. Working from local state.");
  }
}
