/* ================= FIREBASE IMPORTS ================= */
import { app, db } from "./firebase.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";



import {
  ref,
  set,
  update,
  get,
  runTransaction,
  push,
  onValue,
  remove,
  off,
  onChildAdded
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
window.Cropper = Cropper;

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistence set to LOCAL");
  })
  .catch((error) => {
    console.log("Persistence error:", error);
  });

/* ================= 🟢 GOOGLE LOGIN ONLY ================= */
export async function googleLogin(){
  try{
    await setPersistence(auth, browserLocalPersistence);
    await signInWithRedirect(auth, provider);
  }catch(err){
    showPopup(err.message);
  }
}

getRedirectResult(auth)
  .then(async (result) => {
    if (result && result.user) {
      const user = result.user;
      const userRef = ref(db, "users/" + user.uid);  
      const snap = await get(userRef);  

      if (!snap.exists()) {  
        // 🌟 पहिल्यांदाच Google ने लॉगिन झाल्यावर सर्व डेटा तयार करणे
        await set(userRef, {  
          username: user.displayName || "Player",  
          email: user.email || "", // 👈 Google चा अधिकृत ईमेल आपोआप सेट होईल
          photoURL: user.photoURL || "",
          dob: "",                 // Google अकाऊंटमध्ये DOB नंतर सेट करता येईल किंवा रिकामी राहील
          phone: "",
          wins: 0,  
          loss: 0,
          coins: 500,
          diamonds: 0,
          level: 1,
          xp: 0,
          totalXP: 0,
          attack: 10,
          defense: 10,
          strategy: 10,
          speed: 10,
          accuracy: 10,
          country: "🇮🇳 India",
          createdAt: new Date().toISOString()
        });  
      } else {
        // 🌟 आधीच अकाऊंट असेल पण ईमेल नसेल तर Google ईमेल अपडेट करणे
        const existingData = snap.val();
        if (!existingData.email && user.email) {
          await update(userRef, { email: user.email });
        }
      }

      const loginOverlay = document.getElementById("loginOverlay");
      if (loginOverlay) {
        loginOverlay.style.display = "none";
        loginOverlay.classList.add("hidden");
      }

      loadProfile();  
      if (typeof listenUserData === "function") {
        listenUserData();
      }
    }
  })
  .catch((error) => {
    console.log("Redirect Error:", error);
  });


/* ================= SPLASH & LOADER ================= */
const splash = document.getElementById("splash");
const loader = document.getElementById("loader");
let load = 0;
const profileBtn = document.getElementById("topProfileBtn");
const profilePage = document.getElementById("profilePopup");
const closeBtn = document.getElementById("closeProfileBtn");
const saveBtn = document.getElementById("saveProfileBtn");
const splashVideo = document.getElementById("splashVideo");

const isSplashShown = sessionStorage.getItem("splashShown");

if (isSplashShown) {
  if (splash) {
    splash.style.display = "none";
    splash.classList.add("hidden");
  }
  if (splashVideo) {
    try { splashVideo.pause(); } catch(e){}
  }
  
  setTimeout(() => {
    try { draw(); } catch(e){}
    loadProfile(); // 👈 ही नवीन ओळ ॲड करा
    const coinBox = document.getElementById("coinBox");
    if (coinBox && auth.currentUser) {
      coinBox.style.display = "flex";
    }
  }, 100);


} else {
  if (splashVideo) {
    splashVideo.muted = true;
    splashVideo.loop = false;
    splashVideo.playsInline = true;
    splashVideo.play().catch(()=>{});
  }

  const intv = setInterval(() => {
    load += 1.1;
    if (loader) loader.style.width = load + "%";

    if (load >= 100) {
      clearInterval(intv);

      if (splashVideo) {  
        try {
          splashVideo.pause();  
          splashVideo.currentTime = 0;
        } catch(e){}  
      }  
          
      if (splash) splash.classList.add("hidden");  
      setTimeout(() => {  
        if (splash) splash.style.display = "none";  
        draw();
            
        const coinBox = document.getElementById("coinBox");  
        if (auth.currentUser && coinBox) {  
          coinBox.style.display = "flex";  
        }

        sessionStorage.setItem("splashShown", "true");
      }, 400);  
    }
  }, 60);
}


// ================= 🟢 AUTH STATE & INSTANT PROFILE SYNC =================
// ================= 🟢 AUTH STATE & LOGIN CHECK =================
// ================= 🟢 AUTH STATE & INSTANT PROFILE SYNC =================
onAuthStateChanged(auth, async (user) => {
  const loginOverlay = document.getElementById("loginOverlay");
  
  if (user) {
    console.log("User logged in:", user.uid, user.email);
    
    if (loginOverlay) {
      loginOverlay.style.display = "none";
      loginOverlay.classList.add("hidden");
    }  
    
    try {
      const userRef = ref(db, "users/" + user.uid);
      const snap = await get(userRef);
      
      if (snap.exists()) {
        const data = snap.val();
        
        // 🌟 Google चा ईमेल डेटाबेसमध्ये त्वरित sync करणे
        if (user.email && data.email !== user.email) {
          await update(userRef, { email: user.email });
        }

        const flag = (data.country || "🇮🇳").split(" ")[0];
        const username = data.username || user.displayName || "Player";
        
        const tn = document.getElementById("topUsername");
        const pn = document.getElementById("profileName");
        const pft = document.getElementById("profileFlagTop");
        const pf = document.getElementById("profileFlag");

        if (tn) tn.innerText = username;
        if (pn) pn.innerText = username;
        if (pft) pft.innerText = flag;
        if (pf) pf.innerText = flag;
      } else {
        // जर युझरची पहिलीच एन्ट्री असेल
        await set(userRef, {
          username: user.displayName || "Player",
          email: user.email || "",
          photoURL: user.photoURL || "",
          wins: 0,
          loss: 0,
          coins: 500,
          diamonds: 0,
          level: 1,
          xp: 0,
          totalXP: 0,
          country: "🇮🇳 India",
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.log("Instant profile sync error:", err);
    }

    loadProfile();
    setTimeout(() => { 
      loadProfile(); 
      listenUserData(); 
    }, 300);
    
    listenIncomingChallengesInGame();
    setTimeout(() => { checkDirectFriendChallenge(); }, 500);
  } else {
    if (loginOverlay) {
      loginOverlay.style.display = "flex";
      loginOverlay.classList.remove("hidden");
    }
  }
});



if(closeBtn){
  closeBtn.addEventListener("click", () => {
    profilePage.style.display = "none";
  });
}

if(profileBtn){
  profileBtn.addEventListener("click", function(){
    profilePage.style.display = "flex";
    loadProfile();
  });
}

/* ================= SOUND ================= */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();
let soundOn = true;

function playSound(f) {
  if (!soundOn) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = f;
  g.gain.value = 0.15;
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.1);
}

/* ================= GAME VARS ================= */
let vsPlayer = false;
let playerSide = "white";
let turn = "white";
let selected = null;
let botThinking = false;
let history = [];
let gameOver = false;
let level = 1;
let xp = 0;
let totalXP = 0;
let spiderChartInstance = null;

let coins = Number(localStorage.getItem("coins"));
if (isNaN(coins) || coins === null) {
  coins = 500;
  localStorage.setItem("coins", coins);
}
if (document.getElementById("coins")) {
  document.getElementById("coins").innerText = coins;
}

// ================= ONLINE SYSTEM =================
let onlineMode = false;
let currentRoomId = null;
let myColor = null;
let matchShown = false;
let iExited = false;
let localStream = null;
let peerConnection = null;
let playerRole = null;
const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

/* ================= COMPLETE CHESS RULES ENGINE ================= */
const WHITE = "white";
const BLACK = "black";

const startBoard = [
  "♜","♞","♝","♛","♚","♝","♞","♜",
  "♟","♟","♟","♟","♟","♟","♟","♟",
  "","","","","","","","",
  "","","","","","","","",
  "","","","","","","","",
  "","","","","","","","",
  "♙","♙","♙","♙","♙","♙","♙","♙",
  "♖","♘","♗","♕","♔","♗","♘","♖"
];

let pieces = [...startBoard];

let gameState = {
  castlingRights: {
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true
  },
  enPassant: null,
  halfmoveClock: 0,
  positionHistory: []
};

function isWhite(piece) {
  return "♙♖♘♗♕♔".includes(piece);
}

function isBlack(piece) {
  return "♟♜♞♝♛♚".includes(piece);
}

function getColor(piece) {
  if (!piece) return null;
  if (isWhite(piece)) return WHITE;
  if (isBlack(piece)) return BLACK;
  return null;
}

function oppositeColor(color) {
  return color === WHITE ? BLACK : WHITE;
}

function row(index) {
  return Math.floor(index / 8);
}

function col(index) {
  return index % 8;
}

function index(r, c) {
  return r * 8 + c;
}

function isPathClear(board, from, to) {
  const fr = row(from);
  const fc = col(from);
  const tr = row(to);
  const tc = col(to);

  const dr = Math.sign(tr - fr);
  const dc = Math.sign(tc - fc);

  let r = fr + dr;
  let c = fc + dc;

  while (r !== tr || c !== tc) {
    if (board[index(r, c)]) return false;
    r += dr;
    c += dc;
  }
  return true;
}

function canPieceMove(board, from, to, state = gameState) {
  if (from === to) return false;
  const piece = board[from];
  if (!piece) return false;

  const target = board[to];
  const color = getColor(piece);
  const targetColor = getColor(target);

  if (targetColor === color) return false;

  const fr = row(from), fc = col(from);
  const tr = row(to), tc = col(to);
  const dr = tr - fr, dc = tc - fc;

  // PAWN
  if (piece === "♙") {
    if (dc === 0 && dr === -1 && !target) return true;
    if (dc === 0 && dr === -2 && fr === 6 && !target && !board[from - 8]) return true;
    if (Math.abs(dc) === 1 && dr === -1 && target && isBlack(target)) return true;
    if (Math.abs(dc) === 1 && dr === -1 && !target && state.enPassant === to) return true;
    return false;
  }

  if (piece === "♟") {
    if (dc === 0 && dr === 1 && !target) return true;
    if (dc === 0 && dr === 2 && fr === 1 && !target && !board[from + 8]) return true;
    if (Math.abs(dc) === 1 && dr === 1 && target && isWhite(target)) return true;
    if (Math.abs(dc) === 1 && dr === 1 && !target && state.enPassant === to) return true;
    return false;
  }

  // KNIGHT
  if ("♘♞".includes(piece)) {
    return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  }

  // BISHOP
  if ("♗♝".includes(piece)) {
    return Math.abs(dr) === Math.abs(dc) && isPathClear(board, from, to);
  }

  // ROOK
  if ("♖♜".includes(piece)) {
    return (dr === 0 || dc === 0) && isPathClear(board, from, to);
  }

  // QUEEN
  if ("♕♛".includes(piece)) {
    return ((dr === 0 || dc === 0) || Math.abs(dr) === Math.abs(dc)) && isPathClear(board, from, to);
  }

  // KING
  if ("♔♚".includes(piece)) {
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
    if (dr === 0 && Math.abs(dc) === 2) {
      return canCastle(board, color, from, to, state);
    }
    return false;
  }

  return false;
}

function canCastle(board, color, from, to, state = gameState) {
  const rights = state.castlingRights || {};

  if (color === WHITE) {
    if (from === 60 && to === 62 && rights.whiteKingSide) {
      if (board[61] || board[62] || board[63] !== "♖") return false;
      return true;
    }
    if (from === 60 && to === 58 && rights.whiteQueenSide) {
      if (board[59] || board[58] || board[57] || board[56] !== "♖") return false;
      return true;
    }
  }

  if (color === BLACK) {
    if (from === 4 && to === 6 && rights.blackKingSide) {
      if (board[5] || board[6] || board[7] !== "♜") return false;
      return true;
    }
    if (from === 4 && to === 2 && rights.blackQueenSide) {
      if (board[3] || board[2] || board[1] || board[0] !== "♜") return false;
      return true;
    }
  }

  return false;
}

function isSquareAttacked(board, square, byColor, state = gameState) {
  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || getColor(piece) !== byColor) continue;

    if (piece === "♙") {
      if (row(square) === row(from) - 1 && Math.abs(col(square) - col(from)) === 1) return true;
      continue;
    }
    if (piece === "♟") {
      if (row(square) === row(from) + 1 && Math.abs(col(square) - col(from)) === 1) return true;
      continue;
    }

    if (canPieceMove(board, from, square, state)) return true;
  }
  return false;
}

function findKing(board, color) {
  return board.indexOf(color === WHITE ? "♔" : "♚");
}

function isCheck(board, color, state = gameState) {
  const kingPos = findKing(board, color);
  if (kingPos === -1) return true;
  return isSquareAttacked(board, kingPos, oppositeColor(color), state);
}

function applyMove(board, from, to, state = gameState) {
  const newBoard = [...board];
  const piece = newBoard[from];

  newBoard[to] = piece;
  newBoard[from] = "";

  if (piece === "♙" && state.enPassant === to && !board[to] && col(from) !== col(to)) {
    newBoard[to + 8] = "";
  }
  if (piece === "♟" && state.enPassant === to && !board[to] && col(from) !== col(to)) {
    newBoard[to - 8] = "";
  }

  return newBoard;
}

function isLegalMove(board, from, to, color, state = gameState) {
  const piece = board[from];
  if (!piece || getColor(piece) !== color) return false;
  if (!canPieceMove(board, from, to, state)) return false;

  if ("♔♚".includes(piece) && Math.abs(col(to) - col(from)) === 2) {
    if (isCheck(board, color, state)) return false;
    const direction = col(to) > col(from) ? 1 : -1;
    if (isSquareAttacked(board, from + direction, oppositeColor(color), state)) return false;
  }

  const testBoard = applyMove(board, from, to, state);
  return !isCheck(testBoard, color, state);
}

function getLegalMoves(board, color, state = gameState) {
  const moves = [];
  for (let from = 0; from < 64; from++) {
    if (!board[from] || getColor(board[from]) !== color) continue;
    for (let to = 0; to < 64; to++) {
      if (isLegalMove(board, from, to, color, state)) moves.push({ from, to });
    }
  }
  return moves;
}

function isCheckmate(board, color, state = gameState) {
  if (!isCheck(board, color, state)) return false;
  return getLegalMoves(board, color, state).length === 0;
}

function isStalemate(board, color, state = gameState) {
  if (isCheck(board, color, state)) return false;
  return getLegalMoves(board, color, state).length === 0;
}

function makeMove(board, from, to, color, state = gameState, promotion = "queen") {
  if (!isLegalMove(board, from, to, color, state)) {
    return { success: false, reason: "Illegal move" };
  }

  const newBoard = applyMove(board, from, to, state);
  const piece = board[from];

  if (piece === "♔" && from === 60) {
    if (to === 62) { newBoard[61] = "♖"; newBoard[63] = ""; }
    if (to === 58) { newBoard[59] = "♖"; newBoard[56] = ""; }
  }
  if (piece === "♚" && from === 4) {
    if (to === 6) { newBoard[5] = "♜"; newBoard[7] = ""; }
    if (to === 2) { newBoard[3] = "♜"; newBoard[0] = ""; }
  }

  let promoted = false;
  if ((piece === "♙" && row(to) === 0) || (piece === "♟" && row(to) === 7)) {
    newBoard[to] = color === WHITE ? "♕" : "♛";
    promoted = true;
  }

  let newEnPassant = null;
  if (piece === "♙" && row(from) === 6 && row(to) === 4) newEnPassant = from - 8;
  if (piece === "♟" && row(from) === 1 && row(to) === 3) newEnPassant = from + 8;

  const rights = { ...(state.castlingRights || {}) };
  if (piece === "♔") { rights.whiteKingSide = false; rights.whiteQueenSide = false; }
  if (piece === "♚") { rights.blackKingSide = false; rights.blackQueenSide = false; }
  if (from === 63 || to === 63) rights.whiteKingSide = false;
  if (from === 56 || to === 56) rights.whiteQueenSide = false;
  if (from === 7 || to === 7) rights.blackKingSide = false;
  if (from === 0 || to === 0) rights.blackQueenSide = false;

  let halfmoveClock = state.halfmoveClock || 0;
  if (piece === "♙" || piece === "♟" || board[to]) halfmoveClock = 0;
  else halfmoveClock++;

  const nextTurn = oppositeColor(color);
  const nextState = {
    ...state,
    castlingRights: rights,
    enPassant: newEnPassant,
    halfmoveClock
  };

  let result = "continue";
  if (isCheckmate(newBoard, nextTurn, nextState)) result = "checkmate";
  else if (isStalemate(newBoard, nextTurn, nextState)) result = "stalemate";

  return {
    success: true,
    board: newBoard,
    from, to, piece,
    promotion: promoted,
    nextTurn,
    gameState: nextState,
    result
  };
}

/* ================= DRAW ================= */
function draw() {
  const board = document.getElementById("board");
  if (!board) return;

  board.innerHTML = "";

  if (onlineMode) {
    if (myColor === "black") board.classList.add("flip");
    else board.classList.remove("flip");
  } else {
    if (playerSide === "black") board.classList.add("flip");
    else board.classList.remove("flip");
  }

  for (let i = 0; i < 64; i++) {
    const s = document.createElement("div");
    s.className = "square " + (((i + (i >> 3)) % 2) ? "dark" : "light");
    s.style.position = "relative";

    if (pieces[i]) {  
      const p = document.createElement("div");  
      p.className = "piece " + (isWhite(pieces[i]) ? "whitePiece" : "blackPiece");  
      p.textContent = pieces[i];  
      s.appendChild(p);  
    }  

    if (selected === i) {  
      s.style.boxShadow = "0 0 14px #00f inset";  
    }  

    if (selected !== null) {  
      if (isLegalMove(pieces, selected, i, turn, gameState)) {
        const dot = document.createElement("div");  
        dot.className = "moveDot";  
        s.appendChild(dot);  
      }
    }  

    if (pieces[i] === (turn === "white" ? "♔" : "♚") && isCheck(pieces, turn, gameState)) {  
      s.classList.add("checkKing");  
    }  

    s.onclick = () => click(i);  
    board.appendChild(s);
  }
}

/* ================= CLICK ================= */
function click(i) {
  if (onlineMode && turn !== myColor) return;
  if (botThinking) return;

  audioCtx.resume();
  if (!vsPlayer && turn !== playerSide) return;

  if (selected !== null) {
    if (isLegalMove(pieces, selected, i, turn, gameState)) {
      move(selected, i);
    }
    selected = null;
    draw();
    return;
  }

  if (pieces[i] && getColor(pieces[i]) === turn) {
    selected = i;
    playSound(200);
    draw();
  }
}

/* ================= MOVE ================= */
function move(f, t) {
  if (gameOver) return;

  const moveRes = makeMove(pieces, f, t, turn, gameState);
  if (!moveRes.success) return;

  history.push({ f, t, board: [...pieces], state: { ...gameState }, turn });

  pieces = moveRes.board;
  turn = moveRes.nextTurn;
  gameState = moveRes.gameState;

  finishMove(moveRes);
}

function finishMove(moveRes) {
  selected = null;

  if (onlineMode) {
    const wH = (currentRoomData && currentRoomData.whiteHearts !== undefined) ? currentRoomData.whiteHearts : 3;
    const bH = (currentRoomData && currentRoomData.blackHearts !== undefined) ? currentRoomData.blackHearts : 3;

    update(ref(db, "onlineRooms/" + currentRoomId), {
      board: [...pieces],
      turn: turn,
      gameState: gameState,
      whiteHearts: wH,
      blackHearts: bH,
      turnStart: Date.now()
    });
  }

  draw();

  if (moveRes && moveRes.result === "checkmate") {
    gameOver = true;
    setTimeout(() => {
      showPopup("CHECKMATE! " + (turn === "white" ? "Black" : "White") + " wins");
    }, 50);
    return;
  } else if (moveRes && moveRes.result === "stalemate") {
    gameOver = true;
    setTimeout(() => {
      showPopup("STALEMATE! Game Draw");
    }, 50);
    return;
  }

  if (!onlineMode && !vsPlayer && turn !== playerSide && !botThinking) {
    setTimeout(botMove, 250);
  }
}

/* ================= BOT ================= */
// ================= 🤖 POWERFUL SMART BOT =================
function botMove() {
  if (botThinking || gameOver) return;
  botThinking = true;

  setTimeout(() => {
    const legalMoves = getLegalMoves(pieces, turn, gameState);

    if (legalMoves.length > 0) {
      let bestMove = legalMoves[0];
      let maxScore = -99999;

      for (const m of legalMoves) {
        const targetPiece = pieces[m.to];
        let score = 0;

        // 1. Capture Bonus: Opponent cha piece marayla khup high priority
        if (targetPiece) {
          score += getPieceWeight(targetPiece) * 15;
        }

        // 2. Center Control Bonus: Board chya center madhe move karnyala preference
        const targetCol = m.to % 8;
        const targetRow = Math.floor(m.to / 8);
        if (targetCol >= 2 && targetCol <= 5 && targetRow >= 2 && targetRow <= 5) {
          score += 10;
        }

        // 3. Pawn advance bonus (Forward movement sathi)
        const piece = pieces[m.from];
        if (piece === "♟" || piece === "♙") {
          score += turn === "black" ? targetRow : (7 - targetRow);
        }

        // Thoda random factor jevha score sarakha asel
        score += Math.random() * 5;

        if (score > maxScore) {
          maxScore = score;
          bestMove = m;
        }
      }

      move(bestMove.from, bestMove.to);
    }
    botThinking = false;
  }, 250);
}

function getPieceWeight(p) {
  if ("♕♛".includes(p)) return 900;
  if ("♖♜".includes(p)) return 500;
  if ("♗♝".includes(p)) return 330;
  if ("♘♞".includes(p)) return 320;
  if ("♙♟".includes(p)) return 100;
  if ("♔♚".includes(p)) return 10000;
  return 0;
}

/* ================= RESTART ================= */
window.restart = () => {
  pieces = [...startBoard];
  gameState = {
    castlingRights: { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true },
    enPassant: null,
    halfmoveClock: 0,
    positionHistory: []
  };
  history = [];
  selected = null;
  botThinking = false;
  gameOver = false;
  turn = playerSide;
  draw();
};

window.undoMove = function () {
  if (!history.length || botThinking) return;
  const h = history.pop();
  pieces = h.board;
  gameState = h.state;
  turn = h.turn;
  selected = null;
  draw();
};

window.toggleMode = function () {
  vsPlayer = !vsPlayer;
  document.getElementById("modeBtn").innerText = vsPlayer ? "P 2 P" : "👤 Player vs Bot";
  restart();
};

window.toggleSound = function (btn) {
  soundOn = !soundOn;
  if (soundOn) {
    btn.innerHTML = "🔊 Sound";
  } else {
    btn.innerHTML = "🔇 Sound";
  }
};

window.toggleSide = function () {
  playerSide = playerSide === "white" ? "black" : "white";
  document.getElementById("sideBtn").innerText = playerSide === "white" ? "⚪ White" : "⚫ Black";
  restart();
};

window.openSettings = function () { document.getElementById("settings").classList.add("active"); };
window.closeSettings = function () { document.getElementById("settings").classList.remove("active"); };
window.closePopup = function () { document.getElementById("popup").classList.remove("show"); };

function showPopup(text) {
  const popup = document.getElementById("popup");
  const popupText = document.getElementById("popupText");

  if (popup && popupText) {
    popupText.innerText = text;
    popup.classList.add("show");
    setTimeout(() => { popup.classList.remove("show"); }, 2000);
  }
}

let themeIndex = 1;
const totalThemes = 16;
window.changeTheme = function () {
  document.body.classList.remove("theme" + themeIndex);
  themeIndex++;
  if (themeIndex > totalThemes) themeIndex = 1;
  document.body.classList.add("theme" + themeIndex);
  draw();
};

// ================= PLAY ONLINE =================
// ================= PLAY ONLINE (FEE DEDUCTED SAFELY ONCE) =================
// ================= PLAY ONLINE WITH DYNAMIC ENTRY FEE SYSTEM =================
const playOnlineBtn = document.getElementById("playOnlineBtn");
const onlinePopup  = document.getElementById("onlinePopup");
const connectText  = document.getElementById("connectStatus");
const cancelBtn    = document.getElementById("cancelOnline");
const diamonds = parseInt(localStorage.getItem("diamonds")) || 0;

let selectedEntryFee = 50; // बायडिफॉल्ट फी ५०

// १. जेव्हा प्लेअर 'Play Online' बटण दाबेल, तेव्हा फी निवडीचा पॉपअप उघडेल
if (playOnlineBtn) {
  playOnlineBtn.onclick = () => {
    const user = auth.currentUser;
    if (!user) {
      showPopup("Login first");
      return;
    }

    if (onlineMode) {
      exitRoom();
      return;
    }

    // 🔥 एन्ट्री फी निवडण्याचा पॉपअप ओपन करणे
    const feePopup = document.getElementById("entryFeePopup");
    if (feePopup) {
      feePopup.style.display = "flex";
      feePopup.classList.add("show");
    } else {
      // समजा HTML मध्ये popup नसेल तर थेट ५० फी पकडून सर्च करणे चालू होईल
      startOnlineSearch(50);
    }
  };
}

// २. फी पॉपअप बंद करणे
window.closeEntryFeePopup = function() {
  const feePopup = document.getElementById("entryFeePopup");
  if (feePopup) {
    feePopup.style.display = "none";
    feePopup.classList.remove("show");
  }
};

// ३. प्लेअरने विशिष्ट फी निवडली की मॅच सर्चिंग चालू होणे
window.selectEntryFee = async function(feeAmount) {
  selectedEntryFee = feeAmount;
  closeEntryFeePopup();

  const user = auth.currentUser;
  
  // युझरकडे तेवढे कॉइन्स आहेत का तपासा
  if (coins < selectedEntryFee) {
    showPopup(`❌ Need ${selectedEntryFee} coins to play this match!`);
    return;
  }

  startOnlineSearch(selectedEntryFee);
};

// ४. ओपोनंट शोधण्याचे आणि अचूक फी मॅच करण्याचे मुख्य लॉजिक
// ================= 🪙 START ONLINE SEARCH (DYNAMIC ENTRY FEE & RANK SYNC) =================
async function startOnlineSearch(fee) {
  const user = auth.currentUser;
  onlinePopup.classList.add("show");
  connectText.innerText = `🔎 Searching for opponent (${fee} Coins Entry)...`;

  const snapUser = await get(ref(db, "users/" + user.uid));
  let username = "Player";
  let countryFlag = "🇮🇳";
  let myLiveRank = "Bronze";

  if (snapUser.exists()) {
    const data = snapUser.val();
    username = data.username || "Player";
    if (data.country) countryFlag = data.country.split(" ")[0]; 
    
    // 🔥 युझरची लेव्हल आणि रँक फायरबेसवरून थेट काढणे जेणेकरून ओपोनंटला आणि स्वतःला अचूक रँक दिसेल
    const calculatedRank = getRank(data.level || 1);
    myLiveRank = calculatedRank;
  }

  const roomsRef = ref(db, "onlineRooms");
  const snap = await get(roomsRef);
  let joined = false;

  if (snap.exists()) {
    const rooms = snap.val();

    for (let id in rooms) {  
      const room = rooms[id];  
      // 🔥 रूमचा स्टेटस waiting असावा, एन्ट्री फी समान असावी आणि ओपोनंट वेगळा असावा
      if (room.status === "waiting" && Number(room.entryFee) === Number(fee) && room.white.uid !== user.uid && room.black == null) {  
        currentRoomId = id;  
        myColor = "black";  

        await update(ref(db, "onlineRooms/" + id), {
          black: {
            uid: user.uid,
            name: username,
            coins: coins,
            diamonds: diamonds,
            flag: countryFlag,
            rank: myLiveRank, // 👈 अचूक लाईव्ह रँक सेव्ह करणे
            pic: document.getElementById("profilePic") ? document.getElementById("profilePic").src : "default.png"
          },
          status: "playing",
          turnStart: Date.now()
        });

        joined = true;  
        break;  
      }  
    }
  }

  // जर रूम नसेल, तर स्वतःची नवीन रूम तयार करून थांबणे
  if (!joined) {
    const newRoom = push(roomsRef);
    currentRoomId = newRoom.key;  
    myColor = "white";  

    await set(newRoom, {
      white: {
        uid: user.uid,
        name: username,
        coins: coins,
        diamonds: diamonds,
        flag: countryFlag,
        rank: myLiveRank, // 👈 अचूक लाईव्ह रँक सेव्ह करणे
        pic: document.getElementById("profilePic") ? document.getElementById("profilePic").src : "default.png"
      },
      black: null,
      entryFee: fee,
      turn: "white",
      board: startBoard,
      whiteTime: 30,
      blackTime: 30,
      whiteHearts: 3,
      blackHearts: 3,
      status: "waiting"
    });
  }

  listenRoom();
  setTimeout(() => {
    if (currentRoomId) listenChat();
  }, 1000);
}


// ================= 📡 LISTEN ROOM (WITH PROPER RANK SYNC & MATCH FLOW) =================
// ================= 📡 LISTEN ROOM (WITH VIDEO CALL LISTENER INTEGRATED) =================
let lastSyncedTurnStart = null;

function listenRoom() {
  if (!currentRoomId) return;
  const roomRef = ref(db, "onlineRooms/" + currentRoomId);

  onValue(roomRef, async (snap) => {
    if (!snap.exists()) {
      if (!iExited && matchShown) {
        let matchFee = (currentRoomData && currentRoomData.entryFee) ? Number(currentRoomData.entryFee) : 50;
        let winCoins = matchFee * 2;

        showPopup(`🏆 Opponent disconnected!\nYou win the match! (+${winCoins} Coins)`);
        await onWin();
        addCoins(winCoins);
        addXP(50);
        exitRoom(false);
      }
      return;
    }

    const room = snap.val();
    currentRoomData = room;

    if (room.status === "playing" && !matchShown) {
      if (typeof friendWaitingInterval !== "undefined" && friendWaitingInterval) {
        clearInterval(friendWaitingInterval);
        friendWaitingInterval = null;
      }
      const friendWait = document.getElementById("friendWaitingPopup");
      if (friendWait) {
        friendWait.classList.remove("show");
        friendWait.style.display = "none";
      }

      const bNav = document.querySelector(".bottom-nav");
      if (bNav) bNav.style.display = "none";

      let currentEntryFee = room.entryFee ? Number(room.entryFee) : 50;
      addCoins(-currentEntryFee);

      iExited = false;
      matchShown = true;
      onlineMode = true;
      vsPlayer = true;
      botThinking = false;

      if (onlinePopup) onlinePopup.classList.remove("show");
      if (playOnlineBtn) playOnlineBtn.innerText = "❌ Exit";
      const offControls = document.getElementById("offlineControls");
      if (offControls) offControls.style.display = "none";
      playerRole = myColor === "white" ? "host" : "guest";

      const header = document.getElementById("matchHeader");
      if (header) header.style.display = "flex";

        const actionBar = document.getElementById("onlineActionBar");
if (actionBar) {
  actionBar.style.setProperty("display", "flex", "important");
}



      let isMyColorWhite = (myColor === "white");
      let opponent = isMyColorWhite ? room.black : room.white;
      let me = isMyColorWhite ? room.white : room.black;

      // 👤 ओपोनंटची माहिती सेट करणे
      if (opponent) {
        const on = document.getElementById("matchOpponentName");
        const of = document.getElementById("matchOpponentFlag");
        const op = document.getElementById("matchOpponentPic");
        const oc = document.getElementById("matchOpponentCoins");
        const od = document.getElementById("matchOpponentDiamonds");
        const or = document.getElementById("matchOpponentRank");

        if (on) {
          let oppName = opponent.name || "Opponent";
          if (oppName.length > 8) oppName = oppName.substring(0, 8) + "...";
          on.innerText = oppName;
        }

        if (of) of.innerText = opponent.flag || "🌍";
        if (op) op.src = opponent.pic || "default.png";
        if (oc) oc.innerText = opponent.coins || 0;
        if (od) od.innerText = opponent.diamonds || 0;
        if (or) or.innerText = opponent.rank || "Bronze";

        const addFriendBtn = document.getElementById("addMatchFriendBtn");
        if (addFriendBtn && auth.currentUser && opponent.uid) {
          get(ref(db, `friends/${auth.currentUser.uid}/${opponent.uid}`)).then((friendSnap) => {
            if (friendSnap.exists() && friendSnap.val() === true) {
              addFriendBtn.style.display = "none";
            } else {
              addFriendBtn.style.display = "flex";
            }
          }).catch(() => {
            addFriendBtn.style.display = "flex";
          });
        }
      }

      // 👤 स्वतःची माहिती आणि अचूक लाईव्ह रँक मॅच हेडरमध्ये सेट करणे
      if (me) {
        const myRankElem = document.getElementById("matchMyRank");
        if (myRankElem) {
          myRankElem.innerText = me.rank || "Bronze";
        }
      }

      const mp = document.getElementById("matchMyPic");
      const mf = document.getElementById("matchMyFlag");
      const pp = document.getElementById("profilePic");
      const pf = document.getElementById("profileFlag");

      if (mp && pp) mp.src = pp.src;
      if (mf && pf) mf.innerText = pf.innerText;

      const wH = room.whiteHearts !== undefined ? room.whiteHearts : 3;
      const bH = room.blackHearts !== undefined ? room.blackHearts : 3;
      if (myColor === "white") updateHeartsUI(wH, bH);
      else updateHeartsUI(bH, wH);

      pieces = [...room.board];
      turn = room.turn;
      gameState = room.gameState || gameState;
      selected = null;
      draw();

      lastSyncedTurnStart = room.turnStart;
      
      // 🔥 इथे आधी startVoiceChat() होते, त्याऐवजी आता थेट व्हिडिओ कॉलचे कॉलिंग/रिंगिंग लिसनर सुरू होईल
      if (typeof listenVideoCall === "function") {
        listenVideoCall();
      }

      startTimer(turn === myColor);
    }

    if (room.board && onlineMode && room.status === "playing") {
      const oldTurn = turn;
      const newTurn = room.turn;
      const newBoard = JSON.stringify(room.board);
      const oldBoard = JSON.stringify(pieces);

      const wH = room.whiteHearts !== undefined ? room.whiteHearts : 3;
      const bH = room.blackHearts !== undefined ? room.blackHearts : 3;
      if (myColor === "white") updateHeartsUI(wH, bH);
      else updateHeartsUI(bH, wH);

      if (newBoard !== oldBoard) {
        pieces = [...room.board];
        gameState = room.gameState || gameState;
        selected = null;
        draw();
      }

      if (oldTurn !== newTurn || lastSyncedTurnStart !== room.turnStart || !activeInterval) {
        turn = newTurn;
        lastSyncedTurnStart = room.turnStart;
        selected = null;
        draw();
        startTimer(turn === myColor);
      }
    }

    if (room.status === "ended" && matchShown && !iExited) {
      iExited = true;
      const currentUid = auth.currentUser?.uid;
      const loserUid = room.resignedBy;

      let matchFee = room.entryFee ? Number(room.entryFee) : 50;
      let winCoins = matchFee * 2;

      if (loserUid && currentUid) {
        if (loserUid === currentUid) {
          showPopup("🏳️ DEFEAT!\nYou Lost the Match");
          await onLoss();
        } else {
          showPopup(`🏆 VICTORY!\nYou Won the Match (+${winCoins} Coins)`);
          await onWin();
          addCoins(winCoins);
          addXP(50);
          await remove(roomRef);
        }
      }

      exitRoom(false);
    }
  });
}





if (cancelBtn) {
  cancelBtn.onclick = async () => {
    onlinePopup.classList.remove("show");

    if (currentRoomId) {
      const roomRef = ref(db, "onlineRooms/" + currentRoomId);  
      await remove(roomRef);
      
      currentRoomId = null;  
      matchShown = false;
      onlineMode = false;
    }
  };
}




function openProfile(){
  document.getElementById("profilePopup").style.display="flex";
  document.getElementById("coinBox").style.display = "none";
  listenUserData();
}

window.closeProfile = function () {
  document.getElementById("profilePopup").style.display = "none";
  document.getElementById("coinBox").style.display = "flex";
};

/* ================= EDIT PROFILE CONTROLS ================= */
/* ================= EDIT PROFILE CONTROLS ================= */
window.openEditProfile = function () {
  const modal = document.getElementById("editModal");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }

  const user = auth.currentUser;
  const emailField = document.getElementById("editEmail");
  const dobField = document.getElementById("editDob");

  // 🔒 १. Email फील्ड ताबडतोब लॉक करणे
  if (emailField) {
    emailField.disabled = true;
    emailField.readOnly = true;
    emailField.style.opacity = "0.55";
    emailField.style.cursor = "not-allowed";
    emailField.style.pointerEvents = "none";
    emailField.style.background = "#080c14";
    
    // जर युझर Google किंवा ईमेलने लॉगिन असेल तर थेट auth मधून तात्काळ ईमेल भरणे
    if (user && user.email) {
      emailField.value = user.email;
    }
  }

  if (user) {
    get(ref(db, "users/" + user.uid)).then(async (snap) => {
      let data = snap.exists() ? snap.val() : {};

      // 🌟 जर डेटाबेसमध्ये ईमेल नसेल पण Google खात्यात असेल, तर डेटाबेसमध्ये सेव्ह करा
      if (!data.email && user.email) {
        await update(ref(db, "users/" + user.uid), { email: user.email });
        data.email = user.email;
      }

      // 👤 नाव
      if (document.getElementById("editUsername")) {
        document.getElementById("editUsername").value = data.username || user.displayName || "Player";
      }
      // 🌍 देश
      if (document.getElementById("editCountry")) {
        document.getElementById("editCountry").value = data.country || "🇮🇳 India";
      }
      // 📞 फोन
      if (document.getElementById("editPhone")) {
        document.getElementById("editPhone").value = data.phone || "";
      }

      // 🔒 फायनल ईमेल व्हॅल्यू सेट करणे (Database -> Auth -> Blank)
      if (emailField) {
        emailField.value = data.email || user.email || "";
      }

      // 🔒 DOB लॉक ठेवणे
      if (dobField) {
        dobField.value = data.dob || "";
        if (data.dob) {
          dobField.disabled = true;
          dobField.style.opacity = "0.55";
          dobField.style.cursor = "not-allowed";
          dobField.style.pointerEvents = "none";
          dobField.style.background = "#080c14";
        } else {
          dobField.disabled = false;
          dobField.style.opacity = "1";
          dobField.style.cursor = "pointer";
          dobField.style.pointerEvents = "auto";
        }
      }
    }).catch((err) => {
      console.log("Profile fetch error:", err);
      if (emailField && user && user.email) {
        emailField.value = user.email;
      }
    });
  }
};



window.closeEditProfile = function () {
  const modal = document.getElementById("editModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
};

window.saveProfile = async function () {
  const user = auth.currentUser;
  if (!user) {
    showPopup("Login first!");
    return;
  }

  const username = document.getElementById("editUsername")?.value.trim() || "Player";
  const country = document.getElementById("editCountry")?.value || "🇮🇳 India";
  const phone = document.getElementById("editPhone")?.value || "";
  const dobInput = document.getElementById("editDob");
  const flag = country.split(" ")[0];

  const updateData = {
    username: username,
    country: country,
    phone: phone
  };

  // जर युझरने पहिल्यांदाच DOB भरली असेल (आणि आधी लॉक नसेल) तरच ती एकदा सेव्ह होईल
  if (dobInput && !dobInput.disabled && dobInput.value) {
    updateData.dob = dobInput.value;
  }

  try {
    // ईमेल कधीही पाठवला जाणार नाही, तो १००% सुरक्षित राहील
    await update(ref(db, "users/" + user.uid), updateData);

    const pf = document.getElementById("profileFlag");
    const pft = document.getElementById("profileFlagTop");
    const pn = document.getElementById("profileName");
    const tn = document.getElementById("topUsername");

    if (pf) pf.innerText = flag;
    if (pft) pft.innerText = flag;
    if (pn) pn.innerText = username;
    if (tn) tn.innerText = username;

    showPopup("Profile Updated Successfully! ✅");
    window.closeEditProfile();
  } catch (err) {
    console.error("Save Profile Error:", err);
    showPopup("❌ Error: " + err.message);
  }
};


/* ================= LOAD PROFILE ================= */

/* ================= LOAD PROFILE (FIXED RANK BADGE SYNC) ================= */
window.loadProfile = function () {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = ref(db, "users/" + user.uid);
  off(userRef); // जुने लिसनर्स क्लिअर करणे

  onValue(userRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.val();
    const flag = (data.country || "").split(" ")[0];

    const pf = document.getElementById("profileFlag");
    const pft = document.getElementById("profileFlagTop");
    const pn = document.getElementById("profileName");
    const tn = document.getElementById("topUsername");
    const wc = document.getElementById("winsCount");
    const lc = document.getElementById("lossCount");
    const coinText = document.getElementById("coins");
    const diamondText = document.getElementById("diamonds");

    if (pf) pf.innerText = flag;
    if (pft) pft.innerText = flag;
    if (pn) pn.innerText = data.username || "Player";
    if (tn) tn.innerText = data.username || "Player";
    if (wc) wc.innerText = data.wins || 0;
    if (lc) lc.innerText = data.loss || 0;

    // 🪙 कॉइन्स व डायमंड्स सिंक करणे
    let userCoins = (data.coins !== undefined && data.coins !== null) ? data.coins : 500;
    coins = userCoins;
    localStorage.setItem("coins", coins);
    if (coinText) coinText.innerText = coins;

    let userDiamonds = (data.diamonds !== undefined && data.diamonds !== null) ? data.diamonds : 0;
    if (diamondText) diamondText.innerText = userDiamonds;
    localStorage.setItem("diamonds", userDiamonds);

    // 📈 लेव्हल आणि XP डेटा सेट करणे
    level = data.level || 1;
    xp = data.xp || 0;
    totalXP = data.totalXP || 0;

    // 🔥 सर्वात महत्त्वाची ओळ: डेटा मिळताच युझरचा रँक आणि बॅज लगेच अपडेट करणे
    if (typeof updateXPUI === "function") {
      updateXPUI();
    }
  });
};



function addCoins(amount){
  coins += amount;
  localStorage.setItem("coins", coins);
  
  const coinText = document.getElementById("coins");
  if(coinText) coinText.innerText = coins;

  const user = auth.currentUser;
  if(user) update(ref(db, "users/" + user.uid), { coins: coins });
}

function addLoss(){
  const user = auth.currentUser;
  if (!user) return;
  runTransaction(ref(db, "users/" + user.uid + "/loss"), (l) => (l || 0) + 1);
}

window.loginWithGoogle = async function() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error(error); alert(error.message);
  }
};



window.openLogin = function () { document.getElementById("loginOverlay").style.display = "flex"; };
window.closeLogin = function () { document.getElementById("loginOverlay").style.display = "none"; };

const googleBtn = document.getElementById("googleLoginBtn");
if (googleBtn) googleBtn.onclick = loginWithGoogle;

/* ================= PROFILE CROPPER CONTROLS ================= */
/* ================= PROFILE CROPPER CONTROLS & INSTANT LOAD ================= */
/* ================= PROFILE CROPPER CONTROLS & INSTANT LOAD ================= */
window.addEventListener("DOMContentLoaded", () => {
  // 🟢 गेम सुरू होताच फायरबेसवरून लेटेस्ट युझर डेटा थेट लोड करणे
  const user = auth.currentUser;
  if (user) {
    const userRef = ref(db, "users/" + user.uid);
    get(userRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const flag = (data.country || "🇮🇳").split(" ")[0];
        const username = data.username || "Player";
        
        // UI वर लगेच नाव आणि फ्लॅग सेट करणे
        const tn = document.getElementById("topUsername");
        const pn = document.getElementById("profileName");
        const pft = document.getElementById("profileFlagTop");
        const pf = document.getElementById("profileFlag");

        if (tn) tn.innerText = username;
        if (pn) pn.innerText = username;
        if (pft) pft.innerText = flag;
        if (pf) pf.innerText = flag;
      }
    }).catch(err => console.log("Instant load error:", err));
  }

  // 👇 इथे हा कंस बंद करणे अत्यंत महत्त्वाचे आहे!
  const topProfileBtn = document.getElementById("topProfileBtn");
  const profileInput = document.getElementById("profileInput");
  const cropModal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  const cropSave = document.getElementById("cropSave");
  const cropCancel = document.getElementById("cropCancel");
  const profilePic = document.getElementById("profilePic");

  let cropper = null;

  if (topProfileBtn) {
    topProfileBtn.addEventListener("click", () => { profileInput.click(); });
  }

  if (profileInput) {
    profileInput.addEventListener("change", () => {
      const file = profileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropModal.style.display = "flex";

        setTimeout(() => {
          if (cropper) cropper.destroy();
          cropper = new Cropper(cropImage, {
            aspectRatio: 1, viewMode: 1, dragMode: "move", autoCropArea: 1,
            responsive: true, background: false, zoomable: true,
            cropBoxResizable: true, cropBoxMovable: true
          });
        }, 200);
      };
      reader.readAsDataURL(file);
    });
  }

  if (cropSave) {
    cropSave.addEventListener("click", async () => {
      if (!cropper) return;
      const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
      const croppedImage = canvas.toDataURL("image/png");

      profilePic.src = croppedImage;
      localStorage.setItem("profilePic", croppedImage);

      const user = auth.currentUser;
      if (user) {
        await update(ref(db, "users/" + user.uid), { photoURL: croppedImage });
      }

      cropModal.style.display = "none";
      cropper.destroy(); cropper = null; profileInput.value = "";
    });
  }

  if (cropCancel) {
    cropCancel.addEventListener("click", () => {
      cropModal.style.display = "none";
      if (cropper) { cropper.destroy(); cropper = null; }
    });
  }

  const savedPic = localStorage.getItem("profilePic");
  if (savedPic && profilePic) profilePic.src = savedPic;
}); // 👈 हा मुख्य DOMContentLoaded चा कंस आता इथे अचूकपणे बंद झाला आहे!


// ================= 📡 FIREBASE ROOM LISTENER (FIXED DYNAMIC ENTRY FEE & REWARDS) =================


window.exitOnlineMatch = async function () {
  if (!onlineMode || !currentRoomId) return;

  const confirmExit = confirm("Are you sure you want to leave the match?\n(You will lose the match) ⚠️");
  if (confirmExit) {
    showPopup("You resigned the match 🏳️");
    await exitRoom(true);
  }
};

window.openTheme = function(){ document.getElementById("themePopup").style.display = "flex"; };
window.closeTheme = function(){ document.getElementById("themePopup").style.display = "none"; };
window.setTheme = function(themeName){ document.body.className = themeName; closeTheme(); };

function getRank(level){
  const points = level * 50;
  let rank = "Bronze";
  for(let i=0;i<ranks.length;i++){
    if(points >= ranks[i].min) rank = ranks[i].name;
  }
  return rank;
}

function addXP(amount){
  totalXP += amount;
  xp += amount;
  while(xp >= getXPRequired(level) && level < 100){
    xp -= getXPRequired(level);
    level++;
    showPopup("🎉 LEVEL UP!\nRank: " + getRank(level));
  }
  if(level >= 100){ level = 100; xp = getXPRequired(level); }
  saveXPData();
  updateXPUI();
}

window.onload = function(){
  updateXPUI();
  listenUserData();
};

function updateXPUI() {
  const xpBar = document.getElementById("xpBar");
  const levelText = document.getElementById("playerLevel");
  const rankText = document.getElementById("playerRank");
  const xpText = document.getElementById("xpText");
  const rankBadge = document.getElementById("rankBadge");

  let currentRank = getRank(level);
  let required = getXPRequired(level);

  if (xpBar) {
    let percent = (xp / required) * 100;
    xpBar.style.width = percent + "%";
  }
  if (xpText) xpText.innerText = xp + " / " + required + " XP";
  if (levelText) levelText.innerText = level;
  if (rankText) rankText.innerText = currentRank;

  if (rankBadge) {
    rankBadge.className = "";

    if (currentRank.includes("Conqueror")) {
      rankBadge.src = "conqueror.png";
      rankBadge.classList.add("conqueror-rank");
    } else if (currentRank.includes("Crown")) {
      rankBadge.src = "crown.png";
      rankBadge.classList.add("crown-rank");
    } else if (currentRank.includes("Diamond")) {
      rankBadge.src = "diamond.png";
      rankBadge.classList.add("diamond-rank");
    } else if (currentRank.includes("Platinum")) {
      rankBadge.src = "platinum.png";
      rankBadge.classList.add("platinum");
    } else if (currentRank.includes("Gold")) {
      rankBadge.src = "gold.png";
      rankBadge.classList.add("gold-rank");
    } else if (currentRank.includes("Silver")) {
      rankBadge.src = "silver.png";
      rankBadge.classList.add("silver-rank");
    } else {
      rankBadge.src = "bronze.png";
      rankBadge.classList.add("bronze");
    }
  }

  updateTopProfileTheme(currentRank);
}

function saveXPData(){
  const user = auth.currentUser;
  if (!user) return;
  update(ref(db, "users/" + user.uid), { level: level, xp: xp, totalXP: totalXP });
}

function updateSkillBars(data){
  if(!document.getElementById("attackBar")) return;

  const attack = data.attack || 0;
  const defense = data.defense || 0;
  const strategy = data.strategy || 0;
  const speed = data.speed || 0;
  const accuracy = data.accuracy || 0;

  document.getElementById("attackBar").style.width = attack + "%";
  document.getElementById("defenseBar").style.width = defense + "%";
  document.getElementById("strategyBar").style.width = strategy + "%";
  document.getElementById("speedBar").style.width = speed + "%";
  document.getElementById("accuracyBar").style.width = accuracy + "%";

  document.getElementById("attackText").innerText = attack + "%";
  document.getElementById("defenseText").innerText = defense + "%";
  document.getElementById("strategyText").innerText = strategy + "%";
  document.getElementById("speedText").innerText = speed + "%";
  document.getElementById("accuracyText").innerText = accuracy + "%";
}

const ranks = [
  {name:"Bronze",min:0}, {name:"Silver",min:200}, {name:"Gold",min:400},
  {name:"Platinum",min:700}, {name:"Diamond",min:1000}, {name:"Crown",min:1400},
  {name:"Conqueror 👑",min:1800}
];

/* ================= ⏱️ REALTIME DUAL-SYNC TIMER & HEARTS ================= */
let activeInterval = null;
let currentRoomData = null;
let timerSpeedMultiplier = 1; // 1x, 2x, 3x


function startTimer(isMyTurn) {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  const myCircle = document.getElementById("myTimerCircle");
  const oppCircle = document.getElementById("opponentTimerCircle");
  const myText = document.getElementById("myTimerText");
  const oppText = document.getElementById("opponentTimerText");

  const currentCircle = isMyTurn ? myCircle : oppCircle;
  const currentText = isMyTurn ? myText : oppText;
  const otherCircle = isMyTurn ? oppCircle : myCircle;
  const otherText = isMyTurn ? oppText : myText;

  if (otherCircle) {
    otherCircle.style.strokeDashoffset = 0;
    otherCircle.style.stroke = "lime";
  }
  if (otherText) otherText.innerText = "30";

  activeInterval = setInterval(async () => {
    if (!onlineMode || !currentRoomId || !currentRoomData) {
      clearInterval(activeInterval);
      activeInterval = null;
      return;
    }

    if (currentRoomData.status !== "playing") {
      clearInterval(activeInterval);
      activeInterval = null;
      return;
    }

    const startTime = currentRoomData.turnStart || Date.now();
    
    const elapsed = Math.floor(((Date.now() - startTime) / 1000) * timerSpeedMultiplier);
    let timeLeft = 30 - elapsed;

    if (timeLeft < 0) timeLeft = 0;
    const percent = (timeLeft / 30) * 100;

    if (currentCircle) currentCircle.style.strokeDashoffset = 100 - percent;
    
    if (currentText) {
      if (currentText.innerText != timeLeft && timeLeft > 0) {
        // 🔥 इथे timerSoundOn व्हेरिएबल चेक केला आहे (जर साऊंड चालू असेल तरच वाजेन)
        if (typeof timerSoundOn === 'undefined' || timerSoundOn) {
          if (timeLeft <= 5) {
            // 5 seconds chya aat: Full fast (High frequency)
            playSound(900);
          } else if (timeLeft <= 15) {
            // 15 te 6 seconds: Fast
            playSound(750);
          } else {
            // 30 te 16 seconds: Normal
            playSound(550);
          }
        }
      }
      currentText.innerText = timeLeft;
    }

    if (currentCircle) {
      if (timeLeft <= 10) currentCircle.style.stroke = "red";
      else if (timeLeft <= 20) currentCircle.style.stroke = "yellow";
      else currentCircle.style.stroke = "lime";
    }

    if (timeLeft <= 0) {
      clearInterval(activeInterval);
      activeInterval = null;

      const activeTurn = currentRoomData.turn;
      const heartKey = activeTurn === "white" ? "whiteHearts" : "blackHearts";
      const currentHearts = currentRoomData[heartKey] !== undefined ? currentRoomData[heartKey] : 3;
      const newHearts = currentHearts - 1;

      if (newHearts <= 0) {
        const loserUserObj = activeTurn === "white" ? currentRoomData.white : currentRoomData.black;
        const loserUid = loserUserObj ? loserUserObj.uid : "unknown";

        await update(ref(db, "onlineRooms/" + currentRoomId), {
          [heartKey]: 0,
          status: "ended",
          resignedBy: loserUid
        });
      } else {
        const nextTurn = oppositeColor(activeTurn);
        await update(ref(db, "onlineRooms/" + currentRoomId), {
          [heartKey]: newHearts,
          turn: nextTurn,
          turnStart: Date.now()
        });
      }
    }
  }, 1000);
}

function listenUserData(){
  const user = auth.currentUser;
  if (!user) return;
  const userRef = ref(db, "users/" + user.uid);
  off(userRef);
  onValue(userRef, (snap) => {
    const data = snap.val() || {};
    updateSkillBars(data);
    if(document.getElementById("winsCount")) document.getElementById("winsCount").innerText = Number(data.wins) || 0;
    if(document.getElementById("lossCount")) document.getElementById("lossCount").innerText = Number(data.loss) || 0;
  });
}

window.openCoinShop = function () {
  const shop = document.getElementById("coinShop");
  if (shop) {
    shop.style.display = "flex";
    shop.classList.add("show");
  }
};

window.closeCoinShop = function () {
  const shop = document.getElementById("coinShop");
  if (shop) {
    shop.classList.remove("show");
    shop.style.display = "none";
  }
};

// १. कॉइन्स आणि १०% डायमंड्स मोजणारे फंक्शन
function getRewardsByAmount(amount) {
  const plans = { 
    100: 1000, 
    200: 2200, 
    500: 6000, 
    1000: 13000, 
    2000: 27000, 
    3000: 50000, 
    5000: 70000, 
    10000: 150000, 
    25000: 400000, 
    50000: 1000000 
  };

  const coins = plans[amount] || 0;
  // 🔥 कॉइन्सच्या बरोबर १०% डायमंड्स (उदा. १००० कॉइन्सवर १०० डायमंड्स)
  const diamonds = Math.floor(coins * 0.10);

  return { coins, diamonds };
}

// २. अपडेटेड buyCoins फंक्शन
function buyCoins(amount) {
  const user = auth.currentUser;
  if (!user) {
    showPopup("Please login first!");
    return;
  }

  const options = {
    key: "rzp_test_SVXB7MQKD0eLfd",
    amount: amount * 100,
    currency: "INR",
    name: "PP GAMES",
    description: "Buy Coins & Diamonds Pack",
    handler: async function (response) {
      alert("Payment Successful ✅");

      const userRef = ref(db, "users/" + user.uid);
      const snap = await get(userRef);

      if (snap.exists()) {
        let data = snap.val();
        let reward = getRewardsByAmount(amount);

        let newCoins = (data.coins || 0) + reward.coins;
        let newDiamonds = (data.diamonds || 0) + reward.diamonds;

        // Firebase मध्ये दोन्ही अपडेट करणे
        await update(userRef, { 
          coins: newCoins,
          diamonds: newDiamonds 
        });

        // UI आणि LocalStorage लगेच अपडेट
        coins = newCoins;
        localStorage.setItem("coins", coins);
        localStorage.setItem("diamonds", newDiamonds);

        const coinEl = document.getElementById("coins");
        const diaEl = document.getElementById("diamonds");
        if (coinEl) coinEl.innerText = newCoins;
        if (diaEl) diaEl.innerText = newDiamonds;

        showPopup(`🎉 +${reward.coins} 🪙 & +${reward.diamonds} 💎 यशस्वीरीत्या मिळाले!`);
      }
    },
    modal: {
      ondismiss: function () {
        console.log("Payment Modal Dismissed/Cancelled");
      }
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response){
      showPopup("Payment Cancelled / Failed");
    });
    rzp.open();
  } catch (err) {
    console.log("Razorpay error:", err);
    showPopup("Unable to open payment method. Try again.");
  }
}

window.buyCoins = buyCoins;





document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const chatBox = document.getElementById("matchChat");

  window.toggleChat = function () {
    if (!chatBox) return;
    chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
  };

  function handleSend() {
    const msg = chatInput.value.trim();
    if (!msg || !currentRoomId) return;
    sendMessage(msg);
    chatInput.value = "";
  }

  if (sendBtn) sendBtn.addEventListener("click", handleSend);
  if (chatInput) chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });
});

function sendMessage(text) {
  if (!currentRoomId || !auth.currentUser) return;
  push(ref(db, "chats/" + currentRoomId), {
    sender: auth.currentUser.uid,
    text: text,
    time: Date.now()
  });
}

function listenChat() {
  if(!currentRoomId) return;
  const chatRef = ref(db, "chats/" + currentRoomId);
  const chatMessages = document.getElementById("chatMessages");
  off(chatRef);

  onChildAdded(chatRef, (snap) => {
    const data = snap.val();
    const div = document.createElement("div");

    if(data.sender === auth.currentUser.uid){
      div.className = "myMsg"; div.style.textAlign = "right";
    } else {
      div.className = "opponentMsg"; div.style.textAlign = "left";
    }

    div.innerText = data.text;
    if (chatMessages) {
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    showLiveBubble(data.text, data.sender === auth.currentUser.uid);
  });
}

function showLiveBubble(text, isMe) {
  const container = document.getElementById(isMe ? "myLiveBubbleContainer" : "oppLiveBubbleContainer");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.style.background = isMe 
    ? "linear-gradient(135deg, #00c8ff, #0072ff)"
    : "linear-gradient(135deg, #2a2a2a, #111111)";
  bubble.style.color = "#fff";
  bubble.style.padding = "8px 14px";
  bubble.style.borderRadius = isMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px";
  bubble.style.marginTop = "6px";
  bubble.style.maxWidth = "160px";
  bubble.style.fontSize = "13px";
  bubble.style.fontWeight = "bold";
  bubble.style.wordBreak = "break-word";
  bubble.style.boxShadow = isMe ? "0 0 10px rgba(0, 200, 255, 0.5)" : "0 0 10px rgba(0, 0, 0, 0.7)";
  bubble.style.border = isMe ? "1px solid #00c8ff" : "1px solid #444";
  bubble.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  bubble.style.opacity = "1";
  bubble.innerText = text;

  container.appendChild(bubble);

  setTimeout(() => {
    bubble.style.opacity = "0";
    bubble.style.transform = "translateY(-10px)";
    setTimeout(() => bubble.remove(), 400);
  }, 2500);
}

window.closeChat = function () {
  const chat = document.getElementById("matchChat");
  if (chat) chat.style.display = "none";
};

const closeShop = document.getElementById("closeShopBtn");
if (closeShop) closeShop.onclick = function () { document.getElementById("coinShop").style.display = "none"; };

function getXPRequired(level){ return 100 + (level * 50); }

async function onWin(){
  const user = auth.currentUser;
  if(!user) return;
  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);
  let data = snap.val() || {};

  await update(userRef, {
    wins: (data.wins || 0) + 1,
    attack: Math.min((data.attack || 0) + 3, 100),
    defense: Math.min((data.defense || 0) + 3, 100),
    strategy: Math.min((data.strategy || 0) + 3, 100),
    speed: Math.min((data.speed || 0) + 3, 100),
    accuracy: Math.min((data.accuracy || 0) + 3, 100)
  });
  updateSkillBars(data);
}

async function onLoss(){
  const user = auth.currentUser;
  if(!user) return;
  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);
  let data = snap.val() || {};

  await update(userRef, {
    loss: (data.loss || 0) + 1,
    attack: Math.max((data.attack || 0) - 5, 0),
    defense: Math.max((data.defense || 0) - 5, 0),
    strategy: Math.max((data.strategy || 0) - 5, 0),
    speed: Math.max((data.speed || 0) - 5, 0),
    accuracy: Math.max((data.accuracy || 0) - 5, 0)
  });
  updateSkillBars(data);
}



/* ================= 🎙️📹 WEBRTC VOICE & VIDEO CHAT SYSTEM ================= */
let webrtcListeners = [];
let isVideoCallActive = false;


/* ================= 📞 REALTIME VIDEO CALL & FULLY SYNCED WEBRTC ================= */
let callState = "idle"; // idle, calling, incoming, connected

// 1. Video Call Button Click (Send Call Request)
// 1. Video Call Button Click (Send Call Request Without Deducting Diamonds)
const videoCallBtn = document.getElementById("videoCallBtn");
if (videoCallBtn) {
  videoCallBtn.onclick = async () => {
    if (!currentRoomId || !auth.currentUser) return;

    const opponentUid = myColor === "white" ? currentRoomData?.black?.uid : currentRoomData?.white?.uid;
    if (!opponentUid) {
      showPopup("❌ Opponent not found in room!");
      return;
    }

    if (callState === "idle") {
      const roomRef = ref(db, `onlineRooms/${currentRoomId}`);
      const rSnap = await get(roomRef);
      const rData = rSnap.exists() ? rSnap.val() : {};

      // या रूमसाठी आधीच पेड झाले आहे का ते तपासा
      const alreadyPaid = (myColor === "white" && rData.callerPaid) || (myColor === "black" && rData.receiverPaid);

      if (!alreadyPaid) {
        // फक्त शिल्लक तपासा
        const mySnap = await get(ref(db, "users/" + auth.currentUser.uid));
        const myDiamonds = mySnap.exists() ? (mySnap.val().diamonds || 0) : 0;

        if (myDiamonds < 10) {
          showPopup("❌ कॉल करण्यासाठी तुमच्याकडे किमान 10 💎 डायमंड्स असावे लागतील!");
          return;
        }

        showPopup("📞 Calling opponent... (Accept झाल्यावरच 10 💎 कट होतील)");
      } else {
        showPopup("📞 Reconnecting video call... (Free) 🔄");
      }

      callState = "calling";
      videoCallBtn.style.background = "#ff9900";

      await set(ref(db, `videoCalls/${currentRoomId}`), {
        from: auth.currentUser.uid,
        status: "ringing",
        time: Date.now()
      });
    } else if (callState === "connected") {
      endVideoCall();
    }
  };
}




// 2. Listen for Incoming Calls & Acceptance
// 2. Listen for Incoming Calls & Acceptance (Deduct only on connect)
function listenVideoCall() {
  if (!currentRoomId) return;
  const callRef = ref(db, `videoCalls/${currentRoomId}`);

  onValue(callRef, async (snap) => {
    if (!snap.exists()) {
      if (callState === "connected" || callState === "calling") {
        endVideoCall();
      }
      return;
    }

    const callData = snap.val();
    const myUid = auth.currentUser?.uid;

    // 🔴 केस १: इनकमिंग कॉल (समोरच्याने कॉल केला असता)
    if (callData.status === "ringing" && callData.from !== myUid && callState === "idle") {
      callState = "incoming";

      const roomRef = ref(db, `onlineRooms/${currentRoomId}`);
      const rSnap = await get(roomRef);
      const rData = rSnap.exists() ? rSnap.val() : {};

      const myPaidKey = myColor === "white" ? "callerPaid" : "receiverPaid";
      const alreadyPaid = rData[myPaidKey] === true;

      if (!alreadyPaid) {
        const mySnap = await get(ref(db, "users/" + myUid));
        const receiverDiamonds = mySnap.exists() ? (mySnap.val().diamonds || 0) : 0;

        if (receiverDiamonds < 10) {
          alert("📹 समोरच्याचा कॉल आला आहे, पण कॉल उचलण्यासाठी तुमच्याकडे 10 💎 डायमंड्स नाहीत!");
          await remove(callRef);
          callState = "idle";
          return;
        }

        const acceptCall = confirm("📹 Incoming Video Call!\n\nहा कॉल उचलल्यास 10 💎 डायमंड्स कट होतील. कॉल स्वीकारायचा का?");
        if (acceptCall) {
          const deducted = await deductDiamonds(10);
          if (deducted) {
            await update(roomRef, { [myPaidKey]: true });
            showPopup("✅ Call Accepted! (-10 💎)");
            await update(callRef, { status: "accepted" });
            startActiveVideoCall(false);
          } else {
            showPopup("❌ पुरेसे डायमंड्स नाहीत!");
            await remove(callRef);
            callState = "idle";
          }
        } else {
          await remove(callRef);
          callState = "idle";
          showPopup("❌ Call Rejected");
        }
      } else {
        const acceptCall = confirm("📹 Incoming Video Call (Reconnecting)! Accept?");
        if (acceptCall) {
          showPopup("✅ Call Connected! (Free)");
          await update(callRef, { status: "accepted" });
          startActiveVideoCall(false);
        } else {
          await remove(callRef);
          callState = "idle";
        }
      }

    // 🟢 केस २: कॉलरच्या बाजूने (समोरच्याने कॉल स्वीकारल्यावर प्रत्यक्ष डायमंड्स कट करणे)
    } else if (callData.status === "accepted" && callState === "calling") {
      const roomRef = ref(db, `onlineRooms/${currentRoomId}`);
      const rSnap = await get(roomRef);
      const rData = rSnap.exists() ? rSnap.val() : {};

      const callerPaidKey = myColor === "white" ? "callerPaid" : "receiverPaid";
      const alreadyPaid = rData[callerPaidKey] === true;

      // जर या मॅचमध्ये कॉलरने आधी फी दिली नसेल तर आता कॉल कनेक्ट झाल्यावर कट करा
      if (!alreadyPaid) {
        const deducted = await deductDiamonds(10);
        if (deducted) {
          await update(roomRef, { [callerPaidKey]: true });
          showPopup("✅ Opponent Accepted! (-10 💎)");
        }
      }

      startActiveVideoCall(true);
    }
  });
}





// 4. WebRTC Connection Setup (Fixed Offer/Answer Sync)
function initPeerConnection(isCaller = false) {
  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection = new RTCPeerConnection(servers);

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // 🔥 Catch Remote Stream
  peerConnection.ontrack = (event) => {
    console.log("📥 Remote stream received successfully!", event.streams);
    const remoteBigVideo = document.getElementById("remoteBigVideo");
    if (remoteBigVideo && event.streams[0]) {
      remoteBigVideo.srcObject = event.streams[0];
      remoteBigVideo.play().catch((e) => console.log("Remote video play error:", e));
    }
  };

  const role = playerRole || (myColor === "white" ? "host" : "guest");
  const remoteRole = role === "host" ? "guest" : "host";

  // ICE Candidates
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate && currentRoomId) {
      await push(
        ref(db, `onlineRooms/${currentRoomId}/webrtc/${role}Candidates`),
        event.candidate.toJSON()
      );
    }
  };

  const remoteCandRef = ref(db, `onlineRooms/${currentRoomId}/webrtc/${remoteRole}Candidates`);
  webrtcListeners.push(remoteCandRef);

  onChildAdded(remoteCandRef, async (snap) => {
    if (snap.exists() && peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(snap.val()));
      } catch (e) {
        console.log("Ice candidate error:", e);
      }
    }
  });

  const offerRef = ref(db, `onlineRooms/${currentRoomId}/webrtc/offer`);
  const answerRef = ref(db, `onlineRooms/${currentRoomId}/webrtc/answer`);
  webrtcListeners.push(offerRef, answerRef);

  if (isCaller) {
    peerConnection.createOffer().then(async (offer) => {
      await peerConnection.setLocalDescription(offer);
      await set(offerRef, { type: offer.type, sdp: offer.sdp });
    });

    onValue(answerRef, async (snap) => {
      const answer = snap.val();
      if (answer && peerConnection && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
  } else {
    onValue(offerRef, async (snap) => {
      const offer = snap.val();
      if (offer && peerConnection && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await set(answerRef, { type: answer.type, sdp: answer.sdp });
      }
    });
  }

  const vBtn = document.getElementById("videoCallBtn");
  if (vBtn) {
    vBtn.style.background = "#00ff88";
    vBtn.style.color = "#000";
  }
}



  async function startActiveVideoCall(isCaller = false) {
  callState = "connected";
  showPopup("✅ Video Call Connected!");

  // 🔥 व्हिडिओ कॉल चालू असताना वरचा प्रोफाइल बार लपवणे (Space मिळण्यासाठी)
  const topProfile = document.getElementById("topProfileBtn");
  if (topProfile) {
    topProfile.style.setProperty("display", "none", "important");
  }

  // लाईव्ह व्हिडिओ बॉक्सेस दाखवणे
  const videoGrid = document.getElementById("liveVideoContainer");
  if (videoGrid) {
    videoGrid.style.setProperty("display", "flex", "important");
  }

  // Resign च्या बाजूला End Call बटण दाखवणे
  const exitCallBtn = document.getElementById("exitCallBtn");
  if (exitCallBtn) {
    exitCallBtn.style.setProperty("display", "inline-block", "important");
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    
    const myBigVideo = document.getElementById("myBigVideo");
    if (myBigVideo) {
      myBigVideo.srcObject = localStream;
      myBigVideo.play().catch(() => {});
    }

    initPeerConnection(isCaller);
  } catch (err) {
    console.log("Camera access error:", err);
    showPopup("❌ Camera permission denied!");
  }
}


window.endVideoCall = async function() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  if (peerConnection) {
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.close();
    peerConnection = null;
  }

  const myBigVideo = document.getElementById("myBigVideo");
  const remoteBigVideo = document.getElementById("remoteBigVideo");
  if (myBigVideo) myBigVideo.srcObject = null;
  if (remoteBigVideo) remoteBigVideo.srcObject = null;

  callState = "idle";

  // 🔥 कॉल संपल्यावर वरचा प्रोफाइल बार परत आणणे
  const topProfile = document.getElementById("topProfileBtn");
  if (topProfile) {
    topProfile.style.setProperty("display", "flex", "important");
  }

  // मॅच हेडर परत आणणे
  const matchHeader = document.getElementById("matchHeader");
  if (matchHeader) matchHeader.style.display = "flex";

  // लाईव्ह व्हिडिओ बॉक्सेस लपवणे
  const videoGrid = document.getElementById("liveVideoContainer");
  if (videoGrid) {
    videoGrid.style.setProperty("display", "none", "important");
  }

  const exitCallBtn = document.getElementById("exitCallBtn");
  if (exitCallBtn) exitCallBtn.style.display = "none";

  const vBtn = document.getElementById("videoCallBtn");
  if (vBtn) {
    vBtn.style.background = "rgba(12, 18, 28, 0.95)";
    vBtn.style.color = "#fff";
  }

  if (currentRoomId) {
    await remove(ref(db, `videoCalls/${currentRoomId}`));
    await remove(ref(db, `onlineRooms/${currentRoomId}/webrtc`));
  }

  showPopup("📴 Call Ended");
}


// ================= 🚪 EXIT ROOM & CLEAN UP =================
async function exitRoom(removeRoom = true) {
  endVideoCall();

  // 🔥 होम पेजवर जाताना रेझाइन बार (Action Bar) पूर्णपणे लपवणे
  const actionBar = document.getElementById("onlineActionBar");
if (actionBar) {
  actionBar.style.setProperty("display", "none", "important");
}


  const videoGrid = document.getElementById("liveVideoContainer");
  if (videoGrid) {
    videoGrid.style.setProperty("display", "none", "important");
  }

  if (currentRoomId) {
    const roomRef = ref(db, "onlineRooms/" + currentRoomId);
    off(roomRef);

    if (removeRoom) {
      iExited = true;
      if (matchShown) {
        await update(roomRef, { 
          status: "ended", 
          resignedBy: auth.currentUser ? auth.currentUser.uid : "player" 
        });
        await onLoss();
      } else {
        await remove(roomRef);
      }
    }
  }

  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  const matchHeader = document.getElementById("matchHeader");
  if (matchHeader) matchHeader.style.display = "none";

  const chatBox = document.getElementById("matchChat");
  if (chatBox) chatBox.style.display = "none";

  const chatMessages = document.getElementById("chatMessages");
  if (chatMessages) chatMessages.innerHTML = "";

  const onlinePopup = document.getElementById("onlinePopup");
  if (onlinePopup) onlinePopup.classList.remove("show");

  const offlineControls = document.getElementById("offlineControls");
  if (offlineControls) offlineControls.style.display = "flex";

  const onlineBtn = document.getElementById("playOnlineBtn");
  if (onlineBtn) onlineBtn.innerText = "🌐 Play Online";

  const modeBtn = document.getElementById("modeBtn");
  if (modeBtn) modeBtn.innerText = "👤 Player vs Bot";

  const coinBox = document.getElementById("coinBox");
  if (coinBox) coinBox.style.display = "flex";

  const bNav = document.querySelector(".bottom-nav");
  if (bNav) bNav.style.display = "flex";

  onlineMode = false; 
  matchShown = false; 
  currentRoomId = null; 
  currentRoomData = null;
  lastSyncedTurnStart = null;
  myColor = null;
  vsPlayer = false; 
  botThinking = false;
  playerSide = "white";

  restart();
}





function stopMediaStream(updateUI = true) {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  webrtcListeners.forEach((r) => off(r));
  webrtcListeners = [];
}



// ================= DYNAMIC LEADERBOARD SYSTEM (NAME TRUNCATED) =================
window.openLeaderboard = async function () {
  const modal = document.getElementById("leaderboardPopup");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
  await fetchLeaderboardData();
};

window.closeLeaderboard = function () {
  const modal = document.getElementById("leaderboardPopup");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
};

function getRankBadgeDetails(playerLevel) {
  const rName = getRank(playerLevel || 1);
  if (rName.includes("Conqueror")) {
    return { img: "conqueror.png", cls: "conqueror-rank" };
  } else if (rName === "Crown") {
    return { img: "crown.png", cls: "crown-rank" };
  } else if (rName === "Diamond") {
    return { img: "diamond.png", cls: "diamond-rank" };
  } else if (rName === "Platinum") {
    return { img: "platinum.png", cls: "platinum" };
  } else if (rName === "Gold") {
    return { img: "gold.png", cls: "gold-rank" };
  } else if (rName === "Silver") {
    return { img: "silver.png", cls: "silver-rank" };
  } else {
    return { img: "bronze.png", cls: "bronze" };
  }
}

// ================= DYNAMIC LEADERBOARD SYSTEM (18 CHARS LIMIT) =================
async function fetchLeaderboardData() {
  const listEl = document.getElementById("leaderboardList");
  const currentUid = auth.currentUser ? auth.currentUser.uid : null;

  try {
    const usersSnap = await get(ref(db, "users"));
    if (!usersSnap.exists()) {
      if (listEl) listEl.innerHTML = '<div class="lb-loading">No players found</div>';
      return;
    }

    const usersData = usersSnap.val();
    let players = [];

    for (let uid in usersData) {
      const u = usersData[uid];
      players.push({
        uid: uid,
        name: u.username || "Player",
        flag: (u.country || "🇮🇳").split(" ")[0],
        wins: Number(u.wins) || 0,
        coins: Number(u.coins) || 0,
        level: Number(u.level) || 1,
        photoURL: u.photoURL || null
      });
    }

    players.sort((a, b) => b.wins - a.wins || b.coins - a.coins);

    updatePodium(players[0], 1);
    updatePodium(players[1], 2);
    updatePodium(players[2], 3);

    if (listEl) {
      listEl.innerHTML = "";

      players.forEach((player, index) => {
        const rank = index + 1;
        const isMe = player.uid === currentUid;
        const badge = getRankBadgeDetails(player.level);

        // ✂️ लीडरबोर्ड लिस्टसाठी नाव जास्तीत जास्त १८ अक्षरांपर्यंत दिसेल
        let displayName = player.name;
        if (displayName.length > 18) {
          displayName = displayName.substring(0, 18) + "...";
        }

        const row = document.createElement("div");
        row.className = "lb-item" + (isMe ? " is-me" : "");

        row.innerHTML = `
          <div class="lb-item-left" style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
            <span class="lb-rank">#${rank}</span>
            <img class="lb-rank-badge ${badge.cls}" src="${badge.img}" alt="Rank">
            <span class="lb-user-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
              ${player.flag} ${displayName} ${isMe ? "(You)" : ""}
            </span>
          </div>
          <span class="lb-score">🏆 ${player.wins} W</span>
        `;

        listEl.appendChild(row);
      });
    }

  } catch (err) {
    console.error("Leaderboard Error:", err);
    if (listEl) listEl.innerHTML = '<div class="lb-loading">Error loading data</div>';
  }
}

function updatePodium(player, rank) {
  const nameEl = document.getElementById(`p${rank}Name`);
  const scoreEl = document.getElementById(`p${rank}Score`);
  const picEl = document.getElementById(`p${rank}Pic`);

  if (!player) {
    if (nameEl) nameEl.innerText = "---";
    if (scoreEl) scoreEl.innerText = "0 Wins";
    return;
  }

  // ✂️ पॉडियमवरील नावासाठी देखील १८ अक्षरांचे लिमिट
  let podiumName = player.name || "Player";
  if (podiumName.length > 18) {
    podiumName = podiumName.substring(0, 18) + "...";
  }

  if (nameEl) nameEl.innerText = `${player.flag} ${podiumName}`;
  if (scoreEl) scoreEl.innerText = `${player.wins} Wins`;
  if (picEl) {
    if (player.photoURL) {
      picEl.innerHTML = `<img src="${player.photoURL}">`;
    } else {
      picEl.innerText = "👤";
    }
  }
}



function updateHeartsUI(myHeartsCount, oppHeartsCount) {
  const myBox = document.getElementById("myHearts");
  const oppBox = document.getElementById("opponentHearts");

  if (myBox) {
    let myHtml = "";
    for (let i = 1; i <= 3; i++) {
      myHtml += `<span class="heart ${i > myHeartsCount ? 'lost' : ''}">❤️</span>`;
    }
    myBox.innerHTML = myHtml;
  }

  if (oppBox) {
    let oppHtml = "";
    for (let i = 1; i <= 3; i++) {
      oppHtml += `<span class="heart ${i > oppHeartsCount ? 'lost' : ''}">❤️</span>`;
    }
    oppBox.innerHTML = oppHtml;
  }
}

async function finishMatch(isWinner) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);
  if (!snap.exists()) return;

  const data = snap.val();
  
  if (isWinner) {
    await update(userRef, {
      wins: (data.wins || 0) + 1,
      coins: (data.coins || 0) + 100,
      xp: (data.xp || 0) + 50
    });
    showPopup("🎉 VICTORY! +100 Coins & +50 XP");
  } else {
    const newCoins = Math.max((data.coins || 0) - 50, 0);
    await update(userRef, {
      loss: (data.loss || 0) + 1,
      coins: newCoins,
      xp: Math.max((data.xp || 0) - 20, 0)
    });
    showPopup("🏳️ DEFEAT! -50 Coins penalty");
  }
  
  updateXPUI(); 
}



window.addCurrentOpponentAsFriend = async function() {
  if (!onlineMode || !currentRoomData || !auth.currentUser) return;

  const opponent = myColor === "white" ? currentRoomData.black : currentRoomData.white;
  if (!opponent || !opponent.uid) {
    showPopup("Opponent not found!");
    return;
  }

  const mySnap = await get(ref(db, "users/" + auth.currentUser.uid));
  const myData = mySnap.val() || {};

  await set(ref(db, `friendRequests/${opponent.uid}/${auth.currentUser.uid}`), {
    fromUid: auth.currentUser.uid,
    fromName: myData.username || "Player",
    fromId: myData.playerId || "---",
    time: Date.now()
  });

  showPopup("Friend request sent to opponent! 👥✅");
};

let friendWaitingInterval = null;

window.cancelFriendWaiting = async function() {
  if (friendWaitingInterval) {
    clearInterval(friendWaitingInterval);
    friendWaitingInterval = null;
  }
  const waitingPopup = document.getElementById("friendWaitingPopup");
  if (waitingPopup) waitingPopup.classList.remove("show");

  // 🔥 ओपोनंटच्या युआयवरून देखील चॅलेंज रिमूव्ह करण्यासाठी किंवा रूम क्लिन करण्यासाठी
  if (currentRoomId) {
    const roomRef = ref(db, "onlineRooms/" + currentRoomId);
    
    // रूममध्ये 'cancelled' स्टेटस टाकणे किंवा थेट डिलीट करणे
    await remove(roomRef);
    currentRoomId = null;
  }

  showPopup("Challenge Cancelled ❌");
  exitRoom(false);
};


async function checkDirectFriendChallenge() {
  const directRoomId = sessionStorage.getItem("directRoomId");
  const directColor = sessionStorage.getItem("directColor");

  if (!directRoomId || !auth.currentUser) return;

  // 🔥 सेशन्स लगेच साफ करणे जेणेकरून नंतर जुनी रूम पकडणार नाही
  sessionStorage.removeItem("directRoomId");
  sessionStorage.removeItem("directColor");

  const user = auth.currentUser;
  const snapUser = await get(ref(db, "users/" + user.uid));
  let username = "Player";
  let countryFlag = "🇮🇳";

  if (snapUser.exists()) {
    const data = snapUser.val();
    username = data.username || "Player";
    if (data.country) countryFlag = data.country.split(" ")[0];
  }

  currentRoomId = directRoomId;
  myColor = directColor || "white";
  const roomRef = ref(db, "onlineRooms/" + currentRoomId);

  // 1️⃣ जर तू चॅलेंज पाठवणारा (White) असशील तर waiting पॉपअप आणि 20 सेकंदाचा टायमर चालू करणे
  if (myColor === "white") {
    const waitingPopup = document.getElementById("friendWaitingPopup");
    const timerText = document.getElementById("friendWaitingTimer");
    if (waitingPopup) waitingPopup.classList.add("show");

    let secLeft = 20;
    if (timerText) timerText.innerText = secLeft + "s";

    if (friendWaitingInterval) clearInterval(friendWaitingInterval);
    friendWaitingInterval = setInterval(async () => {
      secLeft--;
      if (timerText) timerText.innerText = secLeft + "s";

      // लाईव्ह चेक करणे की मित्राने ऍक्सेप्ट केले का
      const rSnap = await get(roomRef);
      if (rSnap.exists()) {
        const rData = rSnap.val();
        if (rData.status === "playing") {
          clearInterval(friendWaitingInterval);
          friendWaitingInterval = null;
          if (waitingPopup) waitingPopup.classList.remove("show");
          return;
        }
      }

      // जर २० सेकंद संपले आणि मित्राने ऍक्सेप्ट नाही केले तर रूम डिलीट करणे
      if (secLeft <= 0) {
        clearInterval(friendWaitingInterval);
        friendWaitingInterval = null;
        if (waitingPopup) waitingPopup.classList.remove("show");

        if (currentRoomId) {
          await remove(roomRef);
          currentRoomId = null;
        }
        showPopup("⏳ Friend did not respond! Challenge closed.");
        exitRoom(false);
      }
    }, 1000);

  } else {
    // 2️⃣ जर तू चॅलेंज स्वीकारणारा (Black) असशील तर रूममध्ये स्वतःला अपडेट करून खेळ चालू करणे
    const myPlayerData = {
      uid: user.uid,
      name: username,
      coins: Number(localStorage.getItem("coins")) || 500,
      diamonds: Number(localStorage.getItem("diamonds")) || 0,
      flag: countryFlag,
      rank: document.getElementById("playerRank")?.innerText || "Bronze",
      pic: document.getElementById("profilePic")?.src || "default.png"
    };

    await update(roomRef, {
      black: myPlayerData,
      status: "playing",
      turnStart: Date.now()
    });
  }

  listenRoom();
  setTimeout(() => {
    if (currentRoomId) listenChat();
  }, 1000);
}


function listenIncomingChallengesInGame() {
  if (!auth.currentUser) return;
  
  onValue(ref(db, `gameChallenges/${auth.currentUser.uid}`), (snap) => {
    const modal = document.getElementById("friendInviteModal");
    const nameEl = document.getElementById("inviteChallengerName");
    const acceptBtn = document.getElementById("acceptInviteBtn");
    const rejectBtn = document.getElementById("rejectInviteBtn");

    if (snap.exists()) {
      const challenges = snap.val();
      for (let chUid in challenges) {
        const c = challenges[chUid];

        if (nameEl) nameEl.innerText = c.challengerName || "Friend";
        if (modal) modal.style.display = "flex";

        if (acceptBtn) {
          acceptBtn.onclick = async () => {
            // 🔥 पहिली खात्री करा की रूम अजून अस्तित्वात आहे का (कॅन्सल तर नाही केली ना?)
            const roomCheckSnap = await get(ref(db, "onlineRooms/" + c.roomId));
            if (!roomCheckSnap.exists()) {
              if (modal) modal.style.display = "none";
              showPopup("❌ Challenge was cancelled by challenger!");
              await remove(ref(db, `gameChallenges/${auth.currentUser.uid}/${chUid}`));
              return;
            }

            if (modal) modal.style.display = "none";
            sessionStorage.setItem("directRoomId", c.roomId);
            sessionStorage.setItem("directColor", "black");
            await remove(ref(db, `gameChallenges/${auth.currentUser.uid}/${chUid}`));
            checkDirectFriendChallenge();
          };
        }

        if (rejectBtn) {
          rejectBtn.onclick = async () => {
            if (modal) modal.style.display = "none";
            await remove(ref(db, "onlineRooms/" + c.roomId));
            await remove(ref(db, `gameChallenges/${auth.currentUser.uid}/${chUid}`));
          };
        }

        setTimeout(async () => {
          if (modal && modal.style.display === "flex") {
            modal.style.display = "none";
            await remove(ref(db, "onlineRooms/" + c.roomId));
            await remove(ref(db, `gameChallenges/${auth.currentUser.uid}/${chUid}`));
          }
        }, 18000);

        break;
      }
    } else {
      if (modal) modal.style.display = "none";
    }
  });
}


function updateTopProfileTheme(rankName) {
  const topProf = document.getElementById("topProfileBtn");
  if (!topProf) return;

  topProf.classList.remove("rank-bronze", "rank-silver", "rank-gold", "rank-diamond", "rank-platinum", "rank-crown", "rank-conqueror");

  const rankLower = (rankName || "bronze").toLowerCase();
  
  if (rankLower.includes("silver")) {
    topProf.classList.add("rank-silver");
  } else if (rankLower.includes("platinum")) {
    topProf.classList.add("rank-platinum");
  } else if (rankLower.includes("gold")) {
    topProf.classList.add("rank-gold");
  } else if (rankLower.includes("diamond")) {
    topProf.classList.add("rank-diamond");
  } else if (rankLower.includes("crown")) {
    topProf.classList.add("rank-crown");
  } else if (rankLower.includes("conqueror")) {
    topProf.classList.add("rank-conqueror");
  } else {
    topProf.classList.add("rank-bronze");
  }
}



// 🎁 Rewards पेजवर जाण्यासाठी हे फंक्शन असा बदल:
window.openRewardsPage = function() {
  const user = auth.currentUser;
  
  if (!user || user.isAnonymous) {
    showPopup("⚠️ Please login with Google to access Rewards!");
    return;
  }
  
  // 🔥 .href ऐवजी .replace वापरल्याने हिस्ट्री साचत नाही आणि एका क्लिकमध्ये बॅक येता येते
  window.location.replace('reward.html');
};

// 👥 Friends पेजवर जाण्यासाठी हे फंक्शन असा बदल:
window.openFriendsPage = function() {
  const user = auth.currentUser;
  
  if (!user || user.isAnonymous) {
    showPopup("⚠️ Please login with Google to access Friends!");
    return;
  }
  
  window.location.replace('friends.html');
};

window.toggleTestSpeed = function() {
  if (timerSpeedMultiplier === 1) {
    timerSpeedMultiplier = 2;
  } else if (timerSpeedMultiplier === 2) {
    timerSpeedMultiplier = 3;
  } else {
    timerSpeedMultiplier = 1;
  }
  
  const btn = document.getElementById("testSpeedBtn");
  if (btn) {
    btn.innerText = `⏱️ Speed: ${timerSpeedMultiplier}x`;
  }
  showPopup(`Timer Speed changed to ${timerSpeedMultiplier}x ⚡`);
};
window.openRoyalPassPage = function() {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    showPopup("⚠️ Please login with Google to access Royal Pass!");
    return;
  }
  window.location.replace('royalpass.html');
};
// 👤 Guest Login Function (Email/Google vina direct login)
// 👤 १. स्वतंत्र गेस्ट लॉगिन (Google खात्याशी काहीही संबंध नाही)
export async function guestLogin() {
  try {
    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

    // १. जर युझर आधीच गेस्ट म्हणून लॉगिन असेल तर थेट स्क्रीन बंद करा
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      document.getElementById("loginOverlay")?.classList.add("hidden");
      document.getElementById("loginOverlay").style.display = "none";
      showPopup("👤 Logged in as Guest!");
      return;
    }

    // २. नवीन/अनामिक गेस्ट सेशन सुरू करणे
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    const userRef = ref(db, "users/" + user.uid);
    const snap = await get(userRef);

    // ३. जर हा गेस्ट युझर डेटाबेसमध्ये नसेल, तरच त्याची फ्रेश प्रोफाइल बनवा
    if (!snap.exists()) {
      await set(userRef, {
        username: "Guest_" + Math.floor(1000 + Math.random() * 9000),
        accountType: "guest",      // 🔥 ओळखण्यासाठी स्वतंत्र फ्लॅग
        email: "",
        photoURL: "",
        wins: 0,
        loss: 0,
        coins: 500,
        diamonds: 0,
        level: 1,
        xp: 0,
        totalXP: 0,
        attack: 10,
        defense: 10,
        strategy: 10,
        speed: 10,
        accuracy: 10,
        country: "🇮🇳 India"
      });
    }

    // UI अपडेट करणे
    const loginOverlay = document.getElementById("loginOverlay");
    if (loginOverlay) {
      loginOverlay.style.display = "none";
      loginOverlay.classList.add("hidden");
    }

    loadProfile();
    if (typeof listenUserData === "function") {
      listenUserData();
    }
    showPopup("👤 Playing as Guest!");
  } catch (err) {
    console.log("Guest Login Error:", err);
    showPopup("❌ Guest login error: " + err.message);
  }
}
window.guestLogin = guestLogin;

// 🚪 २. लॉगआउट फंक्शन (दोघांसाठी स्वतंत्र क्लिअरन्स)
window.logoutUser = async function(){
  const isGuest = auth.currentUser?.isAnonymous;

  await signOut(auth);
  
  if (isGuest) {
    showPopup("Guest Session Closed 👤");
  } else {
    showPopup("Google Account Logged Out 🔴");
  }

  // लॉगआउट झाल्यावर पुन्हा लॉगिन स्क्रीन समोर आणणे
  const loginOverlay = document.getElementById("loginOverlay");
  if (loginOverlay) {
    loginOverlay.style.display = "flex";
    loginOverlay.classList.remove("hidden");
  }
};

async function deductDiamonds(amount) {
  const user = auth.currentUser;
  if (!user) return false;

  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);

  if (snap.exists()) {
    let currentDiamonds = snap.val().diamonds || 0;
    if (currentDiamonds < amount) {
      return false; // पुरेसे डायमंड्स नाहीत
    }

    let updatedDiamonds = currentDiamonds - amount;
    await update(userRef, { diamonds: updatedDiamonds });

    // UI आणि लोकल स्टोरेज अपडेट
    localStorage.setItem("diamonds", updatedDiamonds);
    const dText = document.getElementById("diamonds");
    if (dText) dText.innerText = updatedDiamonds;

    return true;
  }
  return false;
}

// 🧪 Developer / Testing Button: Add Diamonds Function
window.addTestDiamonds = async function(amount = 50) {
  const user = auth.currentUser;
  if (!user) {
    showPopup("⚠️ कृपया आधी लॉगिन करा!");
    return;
  }

  try {
    const userRef = ref(db, "users/" + user.uid);
    const snap = await get(userRef);

    if (snap.exists()) {
      const currentDiamonds = snap.val().diamonds || 0;
      const newDiamonds = currentDiamonds + amount;

      // 🔥 Firebase डेटाबेस अपडेट करणे
      await update(userRef, { diamonds: newDiamonds });

      // 🔥 Local Storage आणि UI लगेच अपडेट करणे
      localStorage.setItem("diamonds", newDiamonds);

      const dText = document.getElementById("diamonds");
      if (dText) dText.innerText = newDiamonds;

      showPopup(`💎 +${amount} Diamonds यशस्वीरीत्या ॲड झाले! (Total: ${newDiamonds})`);
    }
  } catch (err) {
    console.error("Diamonds Add Error:", err);
    showPopup("❌ डायमंड्स वाढवताना त्रुटी आली!");
  }
};
// 🧩 Puzzles पेजवर जाण्यासाठी फंक्शन
window.openPuzzlesPage = function() {
  const user = auth.currentUser;
  
  if (!user) {
    showPopup("⚠️ कृपया पझल्स खेळण्यासाठी आधी लॉगिन करा!");
    return;
  }
  
  // .replace वापरल्याने बॅक येताना हिस्ट्री अडकत नाही
  window.location.replace('puzzles.html');
};
/* ================= 📝 CREATE NEW ACCOUNT MODAL & REGISTRATION ================= */

// १. मोडल उघडणे (Global Window Scope)
window.openRegisterPopup = function () {
  const modal = document.getElementById("registerModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
  }
};

// २. मोडल बंद करणे
window.closeRegisterPopup = function () {
  const modal = document.getElementById("registerModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
  }
};

// ३. फॉर्म सबमिट लॉजिक
const regForm = document.getElementById("registerForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const btnRegSubmit = document.getElementById("btnRegSubmit");

    if (!name || !email || !password) {
      showPopup("⚠️ Please fill all fields!");
      return;
    }

    if (btnRegSubmit) {
      btnRegSubmit.innerText = "Creating Profile... ⏳";
      btnRegSubmit.disabled = true;
    }

    try {
      // Firebase Auth मध्ये नवीन युझर तयार करणे
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Display Name सेट करणे
      await updateProfile(user, { displayName: name });

      // Firebase Realtime Database मध्ये प्रोफाईल सेव्ह करणे
      const userRef = ref(db, "users/" + user.uid);
      await set(userRef, {
        username: name,
        email: email,
        photoURL: "",
        wins: 0,
        loss: 0,
        coins: 500,
        diamonds: 0,
        level: 1,
        xp: 0,
        totalXP: 0,
        attack: 10,
        defense: 10,
        strategy: 10,
        speed: 10,
        accuracy: 10,
        country: "🇮🇳 India",
        createdAt: new Date().toISOString()
      });

      localStorage.setItem("coins", 500);
      localStorage.setItem("diamonds", 0);

      showPopup("🎉 Account Created! Welcome " + name);

      // मोडल आणि लॉगिन स्क्रीन बंद करणे
      window.closeRegisterPopup();
      const loginOverlay = document.getElementById("loginOverlay");
      if (loginOverlay) {
        loginOverlay.style.setProperty("display", "none", "important");
        loginOverlay.classList.add("hidden");
      }

      regForm.reset();
      loadProfile();

    } catch (err) {
      console.error("Registration Error:", err);
      showPopup("❌ " + err.message);
    } finally {
      if (btnRegSubmit) {
        btnRegSubmit.innerText = "Create Profile";
        btnRegSubmit.disabled = false;
      }
    }
  });
}
/* ================= ✉️ EMAIL LOGIN SYSTEM (GLOBAL SCOPE) ================= */
/* ================= ✉️ EMAIL LOGIN SYSTEM (GLOBAL SCOPE) ================= */

// १. पॉपअप उघडणे
window.openEmailLoginModal = function() {
  const modal = document.getElementById("emailLoginModal");
  if (modal) {
    modal.style.setProperty("display", "flex", "important");
  }
};

// २. पॉपअप बंद करणे
window.closeEmailLoginModal = function() {
  const modal = document.getElementById("emailLoginModal");
  if (modal) {
    modal.style.setProperty("display", "none", "important");
  }
};

// ३. ईमेल आणि पासवर्डने लॉगिन करणे
window.handleEmailLogin = async function() {
  const email = document.getElementById("loginUserEmail")?.value.trim();
  const password = document.getElementById("loginUserPassword")?.value;
  const btnSubmit = document.getElementById("btnEmailLoginSubmit");

  if (!email || !password) {
    showPopup("⚠️ ईमेल आणि Password दोन्ही आवश्यक आहेत!");
    return;
  }

  if (btnSubmit) {
    btnSubmit.innerText = "Logging in... ⏳";
    btnSubmit.disabled = true;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    showPopup("🎉 Welcome back, " + (user.displayName || "Player") + "!");

    window.closeEmailLoginModal();
    const loginOverlay = document.getElementById("loginOverlay");
    if (loginOverlay) {
      loginOverlay.style.setProperty("display", "none", "important");
      loginOverlay.classList.add("hidden");
    }

    loadProfile();

  } catch (err) {
  console.error("Login Error:", err);
  alert("Error code: " + err.code); // 👈 he takun check kar


    
    // 🔥 इथे आपण थेट पॉपअप दाखवत आहोत
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      showPopup("❌ ईमेल किंवा पासवर्ड चुकीचा आहे!");
    } else if (err.code === "auth/user-not-found") {
      showPopup("❌ हे खाते अस्तित्वात नाही, आधी Create Account करा!");
    } else {
      showPopup("❌ " + err.message);
    }
  } finally {
    if (btnSubmit) {
      btnSubmit.innerText = "Login";
      btnSubmit.disabled = false;
    }
  }
};
// 🔥 Timer Sound sathi global status variable
let timerSoundOn = true;

// 🔊 Sound Toggle Function
window.toggleTimerSound = function() {
  timerSoundOn = !timerSoundOn;
  const soundBtn = document.getElementById("soundToggleBtn");
  
  if (soundBtn) {
    if (timerSoundOn) {
      soundBtn.innerHTML = "🔊";
      soundBtn.classList.remove("muted");
      showPopup("🔊 Timer Sound ON");
    } else {
      soundBtn.innerHTML = "🔇";
      soundBtn.classList.add("muted");
      showPopup("🔇 Timer Sound OFF");
    }
  }
};
/* ================= 🎵 BACKGROUND MUSIC SYSTEM ================= */

// १. ऑडिओ ऑब्जेक्ट तयार करणे
const bgAudio = new Audio('A_calculated_silence.mp3');
bgAudio.loop = true;      // साऊंड सतत (Loop मध्ये) वाजण्यासाठी
bgAudio.volume = 0.4;     // आवाजाची लेव्हल (40%)

let bgMusicOn = true;     // बायडिफॉल्ट म्युझिक चालू राहील

// २. सेटिंग्जमधील बटणावरून ऑन/ऑफ करण्यासाठी फंक्शन
window.toggleBgMusic = function() {
  bgMusicOn = !bgMusicOn;
  const btn = document.getElementById("bgMusicToggleBtn");

  if (bgMusicOn) {
    if (btn) btn.innerText = "🎵 BG Music: ON";
    bgAudio.play().catch(e => console.log("Audio play error:", e));
    showPopup("🎵 Background Music ON");
  } else {
    if (btn) btn.innerText = "🔇 BG Music: OFF";
    bgAudio.pause();
    showPopup("🔇 Background Music OFF");
  }
};

// ३. ब्राउझरच्या ऑटoplay पॉलिसीनुसार युझरने स्क्रीनवर क्लिक केल्यावर म्युझिक सुरू करणे
document.addEventListener("click", () => {
  if (bgMusicOn && bgAudio.paused) {
    bgAudio.play().catch(e => console.log("Autoplay blocked:", e));
  }
}, { once: true });

// ४. 📱 गेम मिनिमाइज, टॅब बदलल्यास किंवा स्क्रीन ऑफ झाल्यावर म्युझिक आपोआप बंद/सुरू होणे
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // 📴 गेम बॅकग्राउंडला गेल्यावर किंवा मिनिमाइज झाल्यावर म्युझिक थांबेल
    if (bgAudio && !bgAudio.paused) {
      bgAudio.pause();
    }
  } else {
    // 🎵 युझर परत गेमवर आल्यावर म्युझिक चालू असेल तर पुन्हा सुरू होईल
    if (bgAudio && bgAudio.paused && bgMusicOn) {
      bgAudio.play().catch(e => console.log("Resume audio error:", e));
    }
  }
});


/* ================= 🌌 FLOATING CHESS PIECES BACKGROUND EFFECT ================= */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Container banavne
  const bgContainer = document.createElement("div");
  bgContainer.className = "space-bg-container";
  document.body.appendChild(bgContainer);

  // 2. Chess symbols che icons
  const chessSymbols = ["♟", "♞", "♝", "♜", "♛", "♚", "♙", "♘", "♗", "♖", "♕", "♔"];
  const totalPieces = 20; // Kithi pieces ekatch udayla pahijet

  for (let i = 0; i < totalPieces; i++) {
    const item = document.createElement("div");
    item.className = "floating-item";
    
    // Random chess piece select karne
    item.innerText = chessSymbols[Math.floor(Math.random() * chessSymbols.length)];
    
    // Random horizontal position (Left alignment)
    item.style.left = Math.random() * 100 + "vw";
    
    // Random animation speed (10 seconds te 25 seconds)
    const duration = Math.random() * 15 + 10;
    item.style.animationDuration = duration + "s";
    
    // Random delay jevhe animation start hoil
    const delay = Math.random() * 10;
    item.style.animationDelay = delay + "s";
    
    // Random size
    const size = Math.random() * 20 + 20; // 20px te 40px
    item.style.fontSize = size + "px";

    bgContainer.appendChild(item);
  }
});
