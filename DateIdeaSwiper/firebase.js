// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzY0IPFxnToLc4yfqOgDiuVVYB-_rRYn0",
  authDomain: "dateswiper-d6563.firebaseapp.com",
  projectId: "dateswiper-d6563",
  storageBucket: "dateswiper-d6563.firebasestorage.app",
  messagingSenderId: "638792901200",
  appId: "1:638792901200:web:c6acc1c03a3e14d76b2755",
  measurementId: "G-572BDV5JHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);