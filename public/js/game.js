// Global variables
let firstCardEl = undefined;
let secondCardEl = undefined;
let lockBoard = false;
let allPokemon = [];

// New game state variables
let clicksMade = 0;
let matchesFound = 0;
let currentTotalPairs = 0;
let gameActive = false;
let gameTimerId = null;
let timeLeft = 0;

// Power-up related variables
const CONSECUTIVE_MATCH_THRESHOLD = 2;
let consecutiveMatches = 0;
let powerUpAvailable = false;
const POWER_UP_REVEAL_DURATION = 1500;

// API and Utility Functions
async function fetchAllPokemon() {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1500');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    allPokemon = data.results;
    console.log("Fetched all Pokemon:", allPokemon.length);
  } catch (error) {
    console.error("Could not fetch Pokémon list:", error);
    allPokemon = [];
  }
}

async function fetchPokemonImage(pokemonUrl) {
  try {
    const response = await fetch(pokemonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for URL ${pokemonUrl}`);
    }
    const data = await response.json();
    if (data.sprites && data.sprites.other && data.sprites.other['official-artwork'] && data.sprites.other['official-artwork'].front_default) {
      return data.sprites.other['official-artwork'].front_default;
    } else if (data.sprites && data.sprites.front_default) {
      console.warn(`Official artwork not found for ${data.name}, using front_default sprite.`);
      return data.sprites.front_default;
    } else {
      console.error(`No usable image found for ${data.name} at ${pokemonUrl}.`);
      return null;
    }
  } catch (error) {
    console.error(`Could not fetch Pokémon details from ${pokemonUrl}:`, error);
    return null;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// UI Update Functions
function updateStatsDisplay() {
  $("#clicks-count").text(clicksMade);
  $("#pairs-matched").text(matchesFound);
  $("#total-game-pairs").text(currentTotalPairs);
  $("#pairs-left").text(currentTotalPairs - matchesFound);
  // Timer display will be handled by its own function
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  $("#timer").text(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
}

function showMessage(message, type = "info") {
    const messageArea = $("#message-area");
    const messageText = $("#message-text");
    messageText.text(message);
    messageArea.removeClass("hidden error-message win-message info-message game-over-message"); 

    if (type === "win") messageArea.addClass("win-message");
    else if (type === "error") messageArea.addClass("error-message");
    else if (type === "game-over") messageArea.addClass("game-over-message");
    else messageArea.addClass("info-message");
}

function hideMessage() {
    $("#message-area").addClass("hidden");
}

// Timer Functions
function startTimer() {
  stopTimer();
  const selectedDifficultyOpt = $("#difficulty-select").find("option:selected");
  timeLeft = parseInt(selectedDifficultyOpt.data("time")) || 60;
  
  updateTimerDisplay();

  gameTimerId = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      gameOverTimerUp();
    }
  }, 1000);
}

function stopTimer() {
  if (gameTimerId) {
    clearInterval(gameTimerId);
    gameTimerId = null;
  }
}

function gameOverTimerUp() {
  stopTimer();
  if (!gameActive && matchesFound === currentTotalPairs) {
    console.log("Timer ran out, but game was already won.");
    return;
  }
  gameActive = false;
  lockBoard = true;
  console.log("Game Over - Time ran out!");
  showMessage("Time's up! Game Over!", "game-over");
  // Ensure controls are re-enabled
  $("#reset-button").prop("disabled", false);
  $("#start-button").prop("disabled", false);
  $("#difficulty-select").prop("disabled", false);
}

// Game Logic Functions
function bindCardEvents() {
  $(".card").off("click");
  $(".card").on("click", function () {
    if (lockBoard || !gameActive) return;
    if ($(this).data("matched") === true) return;
    
    let clickedCardIsFirstCard = firstCardEl && firstCardEl[0] === $(this)[0];

    if (clickedCardIsFirstCard && !secondCardEl) {
        return; 
    }

    // Increment click count only if it's a new card being revealed
    // or the first card of a potential pair (if it wasn't already flipped as firstCardEl)
    if (!$(this).hasClass("flip")) {
        clicksMade++;
        updateStatsDisplay();
    }

    $(this).toggleClass("flip");

    if (!firstCardEl) {
      firstCardEl = $(this);
    } else if (!secondCardEl) {
      secondCardEl = $(this);
      lockBoard = true;
      checkForMatch();
    }
  });
}

function checkForMatch() {
  let firstCardImgSrc = firstCardEl.find(".front_face").attr("src");
  let secondCardImgSrc = secondCardEl.find(".front_face").attr("src");

  if (firstCardImgSrc === secondCardImgSrc) {
    console.log("match");
    matchesFound++;
    firstCardEl.data("matched", true);
    secondCardEl.data("matched", true);
    updateStatsDisplay();
    
    consecutiveMatches++;
    if (!powerUpAvailable && consecutiveMatches >= CONSECUTIVE_MATCH_THRESHOLD) {
      powerUpAvailable = true;
      $("#power-up-button").removeClass("hidden").prop("disabled", false);
      console.log("Power-up available!");
      // Optionally, provide feedback that power-up is earned, e.g., via showMessage
      // showMessage("Power-up earned: Reveal cards!", "info"); // This might be too intrusive
    }
    
    resetBoardStateAfterCheck();

    if (matchesFound === currentTotalPairs) {
      console.log("You win!");
      stopTimer();
      gameActive = false;
      lockBoard = true; 
      showMessage("Congratulations! You matched all Pokémon!", "win");
      $("#reset-button").prop("disabled", false);
      $("#start-button").prop("disabled", false);
      $("#difficulty-select").prop("disabled", false);
      $("#power-up-button").addClass("hidden").prop("disabled", true);
      powerUpAvailable = false;
      consecutiveMatches = 0;
    }
  } else {
    console.log("no match");
    consecutiveMatches = 0;
    
    setTimeout(() => {
      if(firstCardEl && !firstCardEl.data("matched")) firstCardEl.toggleClass("flip");
      if(secondCardEl && !secondCardEl.data("matched")) secondCardEl.toggleClass("flip");
      resetBoardStateAfterCheck();
    }, 1000);
  }
}

function resetBoardState() {
  firstCardEl = undefined;
  secondCardEl = undefined;
  lockBoard = false;
}

function resetBoardStateAfterCheck() {
  firstCardEl = undefined;
  secondCardEl = undefined;
  if (gameActive) {
    lockBoard = false;
  }
}

async function startGame() {
  console.log("Starting game...");
  gameActive = false; 
  lockBoard = true; 
  hideMessage();

  const selectedDifficultyOpt = $("#difficulty-select").find("option:selected");
  currentTotalPairs = parseInt(selectedDifficultyOpt.data("pairs")) || 3;
  
  // Add or remove class for specific grid modes
  $("#game_grid").removeClass("hard-mode-grid medium-mode-grid"); // Clear previous mode classes
  if (currentTotalPairs === 9) { // Assuming 9 pairs (18 cards) is for the 6x3 hard mode grid
    $("#game_grid").addClass("hard-mode-grid");
  } else if (currentTotalPairs === 6) { // Assuming 6 pairs (12 cards) is for the 4x3 medium mode grid
    $("#game_grid").addClass("medium-mode-grid");
  }
  // No specific class for other difficulties, they will use the default #game_grid styling
  
  clicksMade = 0;
  matchesFound = 0;
  resetBoardState();
  updateStatsDisplay();

  $("#game_grid").empty().removeClass("game-error game-loading game-loaded success");
  $("#game_grid").html("<p class='loading-message'>Catching Pokémon...</p>").addClass("game-loading");

  $("#start-button").prop("disabled", true);
  $("#difficulty-select").prop("disabled", true);
  $("#reset-button").prop("disabled", true);
  $("#power-up-button").addClass("hidden").prop("disabled", true);
  powerUpAvailable = false;
  consecutiveMatches = 0;

  // --- Pokémon Data Loading and Validation ---
  if (!allPokemon || allPokemon.length === 0) {
    console.log("Pokémon list not available or empty, attempting to fetch...");
    await fetchAllPokemon();
    if (!allPokemon || allPokemon.length === 0) {
        console.error("Failed to fetch Pokémon list. Cannot start game.");
        $("#game_grid").empty().html("<p class='error-message'>Could not load Pokémon data. Please check your internet connection and try again.</p>").addClass("game-error");
        $("#start-button").prop("disabled", false);
        $("#difficulty-select").prop("disabled", false);
        lockBoard = false;
        return;
    }
  }

  // --- Select Pokémon and Fetch Images for Pairs ---
  // Select random Pokémon
  const selectedPokemonDetails = [];
  const availablePokemon = [...allPokemon];
  shuffleArray(availablePokemon);

  for (let i = 0; i < currentTotalPairs; i++) {
    if (availablePokemon.length === 0) {
        console.error("Not enough unique Pokémon available in the fetched list for the required number of pairs.");
        $("#game_grid").empty().html("<p class='error-message'>Not enough unique Pokémon to start the game at this difficulty. Try a lower difficulty or refresh.</p>").addClass("game-error");
        $("#start-button").prop("disabled", false);
        $("#difficulty-select").prop("disabled", false);
        lockBoard = false;
        return;
    }
    const randomPokemon = availablePokemon.pop();
    const imageUrl = await fetchPokemonImage(randomPokemon.url);
    if (imageUrl) {
        selectedPokemonDetails.push({ name: randomPokemon.name, image: imageUrl });
    } else {
        console.warn(`Skipping ${randomPokemon.name} due to missing image. Trying to find another.`);
        i--;
        if (availablePokemon.length === 0 && selectedPokemonDetails.length < currentTotalPairs) {
            // This handles the edge case where we run out of Pokémon *while* trying to replace one with a missing image.
            console.error("Ran out of Pokémon to fetch images for. Not enough for game.");
            $("#game_grid").empty().html("<p class='error-message'>Could not fetch enough Pokémon images. Please try again or select a lower difficulty.</p>").addClass("game-error");
            $("#start-button").prop("disabled", false);
            $("#difficulty-select").prop("disabled", false);
            lockBoard = false;
            return;
        }
    }
  }
  
  if (selectedPokemonDetails.length < currentTotalPairs) {
    console.error("Could not gather enough Pokémon with images for the game.");
    $("#game_grid").empty().html("<p class='error-message'>Failed to load enough Pokémon images. Please try again.</p>").addClass("game-error");
    $("#start-button").prop("disabled", false);
    $("#difficulty-select").prop("disabled", false);
    lockBoard = false;
    return;
  }

  // --- Create and Shuffle Game Cards ---
  let gameCards = [];
  selectedPokemonDetails.forEach(pokemon => {
    gameCards.push({ id: pokemon.name, img: pokemon.image });
    gameCards.push({ id: pokemon.name, img: pokemon.image });
  });
  shuffleArray(gameCards);
  
  // --- Finalize UI, Activate Game, and Start Timer ---
  setupGameUI(gameCards);
  
  $("#game_grid").removeClass("game-loading").addClass("game-loaded");
  $("#reset-button").prop("disabled", false);
  gameActive = true;
  lockBoard = false;
  startTimer();
}

function setupGameUI(cards) {
  const gameGrid = $("#game_grid");
  gameGrid.empty();

  cards.forEach((cardData, index) => {
    const cardElement = $(
      `<div class="card" data-id="${cardData.id}" data-index="${index}">
        <img class="front_face" src="${cardData.img}" alt="${cardData.id}">
        <img class="back_face" src="/images/back.webp" alt="Pokémon Card Back">
      </div>`
    );
    gameGrid.append(cardElement);
  });
  bindCardEvents();
}

// Resets game state, UI, and stops timer.
function resetGameLogic() {
  console.log("Resetting game...");
  stopTimer();
  gameActive = false;
  lockBoard = true;
  
  clicksMade = 0;
  matchesFound = 0;
  // currentTotalPairs will be set by difficulty on next start
  timeLeft = 0;
  
  powerUpAvailable = false;
  consecutiveMatches = 0;
  $("#power-up-button").addClass("hidden").prop("disabled", true);

  resetBoardState();
  updateStatsDisplay();
  updateTimerDisplay();
  $("#timer").text("--:--");
  
  $("#game_grid").removeClass("hard-mode-grid medium-mode-grid"); // Ensure classes are removed on reset
  $("#game_grid").empty().html("<p class='game-placeholder-message'>Welcome to Pokémon Memory! Select difficulty and press Start.<br><br><strong>How to Play:</strong> Flip cards to find matching pairs of Pokémon. Match all pairs before the timer runs out!<br><br><strong>Power-Up:</strong> Match 2 pairs in a row to earn a Power-Up! Activate it to briefly reveal all non-matched cards.</p>").removeClass("game-error game-loading game-loaded success");
  hideMessage();

  // Re-enable controls
  $("#start-button").prop("disabled", false);
  $("#difficulty-select").prop("disabled", false);
  $("#reset-button").prop("disabled", false);
  lockBoard = false;
}

// Theme switching logic
function applyTheme(theme) {
  if (theme === 'dark') {
    $("body").addClass('dark-theme').removeClass('light-theme');
  } else {
    $("body").addClass('light-theme').removeClass('dark-theme');
  }
  localStorage.setItem('pokemonGameTheme', theme);
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem('pokemonGameTheme') || 'light';
  $("#theme-select").val(savedTheme);
  applyTheme(savedTheme);
}

// Power-Up Logic
function activateRevealPowerUp() {
  if (!powerUpAvailable || lockBoard || !gameActive) return;

  console.log("Activating Power-Up: Reveal!");
  powerUpAvailable = false;
  lockBoard = true;
  $("#power-up-button").addClass("hidden").prop("disabled", true);

  // Identify non-matched cards
  const nonMatchedCards = $(".card").filter(function() {
    return $(this).data("matched") !== true && !$(this).hasClass("flip");
  });

  // Flip them
  nonMatchedCards.addClass("flip power-up-reveal"); 

  // After a delay, flip them back
  setTimeout(() => {
    nonMatchedCards.removeClass("flip power-up-reveal");
    if (gameActive) lockBoard = false;
    console.log("Power-Up Reveal ended.");
    // Reset consecutive matches as power-up is used
    consecutiveMatches = 0; 
  }, POWER_UP_REVEAL_DURATION);
}

// Event Listeners and Initial Setup
$(document).ready(function () {
  fetchAllPokemon();
  loadSavedTheme();

  $("#start-button").on("click", startGame);
  $("#reset-button").on("click", resetGameLogic);
  
  $("#difficulty-select").on("change", function() {
    // Optional: reset game or simply change settings for next game start
    // For now, let's make it reset the game immediately if a game was active or has ended.
    // If just on welcome screen, it just changes the setting for the next "Start".
    if (gameActive || matchesFound > 0 || timeLeft <= 0 && gameTimerId) {
        console.log("Difficulty changed, resetting game.");
        resetGameLogic();
    }
    // Update total pairs display based on new selection for user feedback
    const selectedOpt = $(this).find("option:selected");
    $("#total-game-pairs").text(selectedOpt.data("pairs") || 0); 
  });

  $("#theme-select").on("change", function() {
    applyTheme($(this).val());
  });

  $("#power-up-button").on("click", activateRevealPowerUp);

  // Initial state for some UI elements
  resetGameLogic();
  updateStatsDisplay();
  const initialDifficulty = $("#difficulty-select option:selected");
  $("#total-game-pairs").text(initialDifficulty.data("pairs") || 0);
  $("#timer").text("--:--");
}); 