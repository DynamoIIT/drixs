// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA9Yoe4HnpFnewQPmhj40D1oBspto8p1M0",
    authDomain: "bro-chatz-d2e5a.firebaseapp.com",
    projectId: "bro-chatz-d2e5a",
    storageBucket: "bro-chatz-d2e5a.firebasestorage.app",
    messagingSenderId: "910114727663",
    appId: "1:910114727663:web:39b9e8444dfaed392edd1a",
    measurementId: "G-J22GTKMHZK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot };
