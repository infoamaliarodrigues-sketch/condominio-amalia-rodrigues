import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCNe5lRLT6FSukX_CNYSaWfUhKp0ctrHoU",
  authDomain: "condominio-amalia-rodrigues.firebaseapp.com",
  projectId: "condominio-amalia-rodrigues",
  storageBucket: "condominio-amalia-rodrigues.firebasestorage.app",
  messagingSenderId: "860693486141",
  appId: "1:860693486141:web:3ef96731ad4cb88652a854",
  measurementId: "G-51J0Q0S43N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
