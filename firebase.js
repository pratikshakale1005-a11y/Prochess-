// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRj7FC3pUc57Pwm0l3MKcbAzXOluYl4D8",
  authDomain: "prochess-5e9d5.firebaseapp.com",
  databaseURL: "https://prochess-5e9d5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "prochess-5e9d5",
  storageBucket: "prochess-5e9d5.firebasestorage.app",
  messagingSenderId: "834036863923",
  appId: "1:834036863923:web:1f0fe5cd1527773208b1c6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

console.log("✅ Firebase Realtime DB & Auth connected");

// 🔥 1. Firebase Server Time Offset Tracker
let serverTimeOffset = 0;
const offsetRef = ref(db, ".info/serverTimeOffset");
onValue(offsetRef, (snap) => {
  serverTimeOffset = snap.val() || 0;
});

// Real Server Timestamp milane ke liye function
export function getRealServerTime() {
  return Date.now() + serverTimeOffset;
}

// 🔥 2. 5-Digit Unique ID Generator Function (e.g. 48291)
function generatePlayerID() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// User Auth State Listener
// User Auth State Listener
// firebase.js
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // जर युझर Anonymous (Guest) असेल, तर त्याचा आधीचा playerId तपासा
    if (user.isAnonymous) {
      let savedGuestId = localStorage.getItem("my_permanent_guest_id");
      const userRef = ref(db, 'users/' + user.uid);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        const guestIdToUse = savedGuestId || generatePlayerID();
        localStorage.setItem("my_permanent_guest_id", guestIdToUse);

        await update(userRef, {
          playerId: guestIdToUse,
          coins: 500,           
          diamonds: 0,          
          createdAt: getRealServerTime(),
          accountType: "guest"
        });
      }

      const idElem = document.getElementById('playerId');
      if (idElem) idElem.innerText = savedGuestId || (snapshot.val()?.playerId);
      return;
    }

    // Google User साठी आधीचाच कोड चालू राहील
    const userRef = ref(db, 'users/' + user.uid);
    try {
      const snapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val().playerId) {
        const existingId = snapshot.val().playerId;
        const idElem = document.getElementById('playerId');
        if (idElem) idElem.innerText = existingId;
      } else {
        const newId = generatePlayerID();
        await update(userRef, {
          playerId: newId,
          coins: 500,           
          diamonds: 0,          
          createdAt: getRealServerTime(),
          accountType: "google"
        });

        const idElem = document.getElementById('playerId');
        if (idElem) idElem.innerText = newId;
      }
    } catch (error) {
      console.error("Error with player ID: ", error);
    }
  }
});

