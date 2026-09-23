import { WORDS, DEFINITIONS } from "./words.js?v=2";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get, onDisconnect } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnlc_IpDr7i-KtofmySVKr9lZKgNPLo10",
  authDomain: "sprankle-wordle.firebaseapp.com",
  projectId: "sprankle-wordle",
  storageBucket: "sprankle-wordle.firebasestorage.app",
  messagingSenderId: "1056342179798",
  appId: "1:1056342179798:web:56302c0dbf5ff09fbf6e77",
  databaseURL: "https://sprankle-wordle-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let isMultiplayer = false;
let roomCode = "";
let playerId = Math.random().toString(36).substring(2, 9);
let roomRef = null;
let playerRef = null;

const NUMBER_OF_GUESSES = 6;
let guessesRemaining = NUMBER_OF_GUESSES;
let currentGuess = [];
let nextLetter = 0;
let wordLength = 5;
let rightGuessString = "";
let currentWords = [];
let wordRarityIndex = 0;
let gameActive = false;

// Scoring & History
let playerPenalty = 0;
let totalGray = 0;
let totalYellow = 0;
let guessHistory = []; 

function resetGame() {
  if (!isMultiplayer) {
    wordLength = parseInt(document.getElementById("word-length").value);
    currentWords = WORDS[wordLength];
    wordRarityIndex = Math.floor(Math.random() * currentWords.length);
  } else {
    currentWords = WORDS[wordLength];
  }
  
  rightGuessString = currentWords[wordRarityIndex];
  console.log("Target:", rightGuessString); 

  guessesRemaining = NUMBER_OF_GUESSES;
  currentGuess = [];
  nextLetter = 0;
  playerPenalty = 0;
  totalGray = 0;
  totalYellow = 0;
  guessHistory = [];
  gameActive = true;

  document.getElementById("game-board").innerHTML = "";
  for (const elem of document.getElementsByClassName("keyboard-button")) {
    elem.style.backgroundColor = "";
  }
  
  let endScreen = document.getElementById("end-screen");
  endScreen.classList.add("hidden");
  endScreen.classList.remove("animate__fadeInRight");
  document.getElementById("game-area").classList.remove("hidden");
  document.getElementById("multiplayer-result").innerHTML = "";
  document.getElementById("final-boards-container").innerHTML = "";
  document.getElementById("win-lose-title").innerText = "";
  document.getElementById("lobby-status").innerText = "";
  
  let defEl = document.getElementById("end-def");
  defEl.classList.add("hidden");
  defEl.innerText = "";
  document.getElementById("show-def-btn").innerText = "Show Definition";

  initBoard();
}

function initBoard() {
  let board = document.getElementById("game-board");
  for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
    let row = document.createElement("div");
    row.className = "letter-row";
    for (let j = 0; j < wordLength; j++) {
      let box = document.createElement("div");
      box.className = "letter-box";
      row.appendChild(box);
    }
    board.appendChild(row);
  }
}

function shadeKeyBoard(letter, color) {
  for (const elem of document.getElementsByClassName("keyboard-button")) {
    if (elem.textContent === letter) {
      let oldColor = elem.style.backgroundColor;
      if (oldColor === "green") return;
      if (oldColor === "yellow" && color !== "green") return;
      elem.style.backgroundColor = color;
      break;
    }
  }
}

function deleteLetter() {
  let row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];
  let box = row.children[nextLetter - 1];
  box.textContent = "";
  box.classList.remove("filled-box");
  currentGuess.pop();
  nextLetter -= 1;
}

function buildMiniBoard(historyArray, titleText) {
    let container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    
    let title = document.createElement("h3");
    title.innerText = titleText;
    title.style.margin = "0 0 10px 0";
    container.appendChild(title);

    let board = document.createElement("div");
    board.style.display = "flex";
    board.style.flexDirection = "column";

    for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
        let row = document.createElement("div");
        row.className = "letter-row";
        
        let guess = historyArray[i];
        for (let j = 0; j < wordLength; j++) {
            let box = document.createElement("div");
            box.className = "letter-box";
            box.style.width = "2rem";
            box.style.height = "2rem";
            box.style.fontSize = "1.5rem";
            
            if (guess) {
                box.textContent = guess.word[j];
                box.style.backgroundColor = guess.colors[j];
                box.style.color = "white";
                box.style.border = "none";
            }
            row.appendChild(box);
        }
        board.appendChild(row);
    }
    container.appendChild(board);
    return container;
}

function endGame(won) {
  gameActive = false;
  let finalGuesses = won ? (6 - guessesRemaining) : 7; // Penalty for losing

  if (isMultiplayer && playerRef) {
    set(playerRef, {
      ready: true,
      finished: true,
      guesses: finalGuesses,
      penalty: playerPenalty,
      history: guessHistory,
      gray: totalGray,
      yellow: totalYellow
    });
  } else {
    // Single player win text
    document.getElementById("win-lose-title").innerText = won ? "You Won!" : "You Lost!";
    document.getElementById("win-lose-title").style.color = won ? "green" : "red";
    document.getElementById("final-boards-container").appendChild(buildMiniBoard(guessHistory, "Your Board"));
  }

  setTimeout(() => {
    document.getElementById("game-area").classList.add("hidden");
    let endScreen = document.getElementById("end-screen");
    endScreen.classList.remove("hidden");
    endScreen.classList.add("animate__animated", "animate__fadeIn");
    
    document.getElementById("end-word").innerText = rightGuessString.toUpperCase();
    
    let percent = Math.max(1, Math.round((wordRarityIndex / currentWords.length) * 100));
    let rarityStr = percent < 20 ? "Common" : (percent < 50 ? "Uncommon" : (percent < 80 ? "Rare" : "Legendary"));
    document.getElementById("end-rarity").innerText = `${rarityStr} word`;

    let localDef = DEFINITIONS[rightGuessString];
    if (localDef) {
        document.getElementById("end-def").innerText = `"${localDef}"`;
    } else {
        document.getElementById("end-def").innerText = "Definition not found.";
    }
  }, 1500);
}

document.getElementById("show-def-btn").addEventListener("click", () => {
    let defEl = document.getElementById("end-def");
    let btn = document.getElementById("show-def-btn");
    if (defEl.classList.contains("hidden")) {
        defEl.classList.remove("hidden");
        defEl.classList.add("animate__animated", "animate__fadeInDown");
        btn.innerText = "Hide Definition";
    } else {
        defEl.classList.add("hidden");
        defEl.classList.remove("animate__animated", "animate__fadeInDown");
        btn.innerText = "Show Definition";
    }
});

function checkGuess() {
  let row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];
  let guessString = "";
  let rightGuess = Array.from(rightGuessString);

  for (const val of currentGuess) guessString += val;

  if (guessString.length != wordLength) {
    toastr.error("Not enough letters!");
    return;
  }

  var letterColor = Array(wordLength).fill("gray");

  for (let i = 0; i < wordLength; i++) {
    if (rightGuess[i] == currentGuess[i]) {
      letterColor[i] = "green";
      rightGuess[i] = "#";
    }
  }

  for (let i = 0; i < wordLength; i++) {
    if (letterColor[i] == "green") continue;
    for (let j = 0; j < wordLength; j++) {
      if (rightGuess[j] == currentGuess[i]) {
        letterColor[i] = "yellow";
        rightGuess[j] = "#";
      }
    }
  }

  // Calculate Golf Penalty
  for (let i = 0; i < wordLength; i++) {
    if (letterColor[i] === "gray") { playerPenalty += 2; totalGray++; }
    if (letterColor[i] === "yellow") { playerPenalty += 1; totalYellow++; }
  }

  guessHistory.push({ word: guessString, colors: [...letterColor] });

  for (let i = 0; i < wordLength; i++) {
    let box = row.children[i];
    let delay = 250 * i;
    setTimeout(() => {
      animateCSS(box, "flipInX");
      box.style.backgroundColor = letterColor[i];
      box.style.color = "white"; // Make text readable on colors
      box.style.border = "none";
      shadeKeyBoard(guessString.charAt(i) + "", letterColor[i]);
    }, delay);
  }

  if (guessString === rightGuessString) {
    endGame(true);
  } else {
    guessesRemaining -= 1;
    currentGuess = [];
    nextLetter = 0;
    if (guessesRemaining === 0) endGame(false);
  }
}

function insertLetter(pressedKey) {
  if (nextLetter === wordLength) return;
  pressedKey = pressedKey.toLowerCase();
  let row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];
  let box = row.children[nextLetter];
  animateCSS(box, "pulse");
  box.textContent = pressedKey;
  box.classList.add("filled-box");
  currentGuess.push(pressedKey);
  nextLetter += 1;
}

const animateCSS = (element, animation, prefix = "animate__") =>
  new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = element;
    node.style.setProperty("--animate-duration", "0.3s");
    node.classList.add(`${prefix}animated`, animationName);
    function handleAnimationEnd(event) {
      event.stopPropagation();
      node.classList.remove(`${prefix}animated`, animationName);
      resolve("Animation ended");
    }
    node.addEventListener("animationend", handleAnimationEnd, { once: true });
  });

function handleInput(key) {
  if (guessesRemaining === 0 || !gameActive) return;
  let pressedKey = String(key);
  if (pressedKey === "Backspace" && nextLetter !== 0) {
    deleteLetter();
    return;
  }
  if (pressedKey === "Enter") {
    checkGuess();
    return;
  }
  let found = pressedKey.match(/[a-z]/gi);
  if (!found || found.length > 1) return;
  else insertLetter(pressedKey);
}

document.addEventListener("keyup", (e) => {
  handleInput(e.key);
});

document.getElementById("keyboard-cont").addEventListener("click", (e) => {
  if (!gameActive) return;
  const target = e.target;
  if (!target.classList.contains("keyboard-button")) return;
  let key = target.textContent;
  if (key === "Del") key = "Backspace";
  handleInput(key);
});

function switchScreen(hideId, showId) {
  let h = document.getElementById(hideId);
  h.classList.add("animate__fadeOutUp");
  setTimeout(() => {
    h.classList.add("hidden");
    h.classList.remove("animate__fadeOutUp", "animate__fadeInDown");
    let s = document.getElementById(showId);
    s.classList.remove("hidden", "animate__fadeOutDown");
    s.classList.add("animate__fadeInUp");
  }, 500);
}

document.getElementById("play-btn").addEventListener("click", () => {
  isMultiplayer = false;
  resetGame();
  switchScreen("home-screen", "game-wrapper");
});

document.getElementById("multiplayer-btn").addEventListener("click", () => {
  isMultiplayer = true;
  switchScreen("home-screen", "lobby-screen");
});

document.getElementById("play-again-btn").addEventListener("click", () => {
  if (isMultiplayer && playerRef) {
    set(playerRef, null); // Exit room
  }
  isMultiplayer = false;
  let game = document.getElementById("game-wrapper");
  game.classList.remove("animate__fadeInUp");
  game.classList.add("animate__fadeOutDown");
  setTimeout(() => {
    game.classList.add("hidden");
    let home = document.getElementById("home-screen");
    home.classList.remove("hidden", "animate__fadeOutUp");
    home.classList.add("animate__fadeInDown");
  }, 500);
});

document.getElementById("join-room-btn").addEventListener("click", async () => {
  roomCode = document.getElementById("room-code").value.toUpperCase();
  if (!roomCode) return toastr.error("Enter a room code!");

  document.getElementById("lobby-status").innerText = "Connecting...";
  roomRef = ref(db, 'rooms/' + roomCode);
  playerRef = ref(db, 'rooms/' + roomCode + '/players/' + playerId);
  onDisconnect(playerRef).remove();

  let snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    let wLength = parseInt(document.getElementById("word-length").value);
    let rIndex = Math.floor(Math.random() * WORDS[wLength].length);
    await set(roomRef, { wordLength: wLength, wordRarityIndex: rIndex });
  }

  await set(playerRef, { ready: true, finished: false, guesses: 0, penalty: 0, gray: 0, yellow: 0 });
  document.getElementById("lobby-status").innerText = "Waiting for opponent...";

  onValue(roomRef, (snap) => {
    let data = snap.val();
    if (!data || !data.players) return;
    let playersObj = data.players;
    let keys = Object.keys(playersObj);
    
    // Start game
    if (!gameActive && keys.length === 2 && document.getElementById("lobby-screen").classList.contains("animate__fadeInUp")) {
      wordLength = data.wordLength;
      wordRarityIndex = data.wordRarityIndex;
      toastr.success("Opponent joined!");
      resetGame();
      switchScreen("lobby-screen", "game-wrapper");
    }

    // End game results
    if (keys.length === 2) {
      let p1 = playersObj[keys[0]];
      let p2 = playersObj[keys[1]];

      if (p1.finished && p2.finished) {
        let me = playersObj[playerId];
        let opponentKey = keys.find(k => k !== playerId);
        let them = playersObj[opponentKey];

        let myScore = me.guesses * 100 + me.penalty; 
        let theirScore = them.guesses * 100 + them.penalty;
        
        let title = document.getElementById("win-lose-title");
        if (myScore < theirScore) {
          title.innerText = "You Won!";
          title.style.color = "green";
        } else if (myScore > theirScore) {
          title.innerText = "You Lost!";
          title.style.color = "red";
        } else {
          title.innerText = "It's a Tie!";
          title.style.color = "orange";
        }

        // Receipt Generation
        let receiptHtml = `
            <div style="font-size: 1.1rem; line-height: 1.6;">
                <strong>You:</strong><br>
                Number of guesses x ${me.guesses}<br>
                Penalty x ${me.penalty}<br>
                Grey letters x ${me.gray}<br>
                Yellow letters x ${me.yellow}<br><br>
                <strong>Opponent:</strong><br>
                Number of guesses x ${them.guesses}<br>
                Penalty x ${them.penalty}<br>
                Grey letters x ${them.gray}<br>
                Yellow letters x ${them.yellow}
            </div>
        `;
        document.getElementById("multiplayer-result").innerHTML = receiptHtml;

        // Boards Generation (Winner on Top)
        let boardContainer = document.getElementById("final-boards-container");
        boardContainer.innerHTML = ""; // Clear existing

        let myBoardEl = buildMiniBoard(me.history || [], "Your Board");
        let theirBoardEl = buildMiniBoard(them.history || [], "Opponent's Board");

        if (myScore <= theirScore) {
            boardContainer.appendChild(myBoardEl);
            boardContainer.appendChild(theirBoardEl);
        } else {
            boardContainer.appendChild(theirBoardEl);
            boardContainer.appendChild(myBoardEl);
        }
      } else {
        // Someone is finished, but not both
        let me = playersObj[playerId];
        if (me && me.finished) {
          let title = document.getElementById("win-lose-title");
          title.innerText = "Waiting...";
          title.style.color = "gray";
        }
      }
    }
  });
});
