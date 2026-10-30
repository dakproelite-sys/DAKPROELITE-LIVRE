import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDR7INHKaazaqZt-xIcjk10JFiy58uXKO8",
  authDomain: "dakproelite.firebaseapp.com",
  databaseURL: "https://dakproelite-default-rtdb.firebaseio.com",
  projectId: "dakproelite",
  storageBucket: "dakproelite.firebasestorage.app",
  messagingSenderId: "580591769206",
  appId: "1:580591769206:web:abf1674616ca02b1087157"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
