// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDKkr93ANx2TbmWhD1BQNEU4b_rEHEOkyk",
    authDomain: "zero-medical-cs-260406.firebaseapp.com",
    databaseURL: "https://zero-medical-cs-260406-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zero-medical-cs-260406",
    storageBucket: "zero-medical-cs-260406.firebasestorage.app",
    messagingSenderId: "255166539730",
    appId: "1:255166539730:web:c5919a5ab5f04f39d44a0b"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const storage = firebase.storage();
