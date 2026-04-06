// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDBtMm0bFTWo7craIuW6pxwWOVIHXYv78A",
    authDomain: "coupang-master-290fa.firebaseapp.com",
    databaseURL: "https://coupang-master-290fa-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "coupang-master-290fa",
    storageBucket: "coupang-master-290fa.firebasestorage.app"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const storage = firebase.storage();
