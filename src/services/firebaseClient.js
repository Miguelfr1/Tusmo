import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBUW6ongZ1rd3n4zb6klANKzcNgGNplwus",
  authDomain: "tusmo-41270.firebaseapp.com",
  projectId: "tusmo-41270",
  storageBucket: "tusmo-41270.firebasestorage.app",
  messagingSenderId: "782610344402",
  appId: "1:782610344402:web:924aa70d31854c3019c00b",
};

let servicesPromise;

export function loadMultiplayerServices() {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);
      if (!auth.currentUser) await signInAnonymously(auth);
      return {
        auth,
        db,
        doc,
        getDoc,
        onAuthStateChanged,
        onSnapshot,
        setDoc,
        updateDoc,
      };
    })().catch((error) => {
      servicesPromise = undefined;
      throw error;
    });
  }
  return servicesPromise;
}
