const firebase = require('firebase/app');
require('firebase/storage');
global.XMLHttpRequest = require("xhr2");

const firebaseConfig = {
    apiKey: "AIzaSyDKkr93ANx2TbmWhD1BQNEU4b_rEHEOkyk",
    projectId: "zero-medical-cs-260406",
    storageBucket: "zero-medical-cs-260406.firebasestorage.app",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const storage = firebase.storage();
const storageRef = storage.ref('uploads/test.txt');

console.log("Starting upload...");
const uploadTask = storageRef.putString("Hello World!");

uploadTask.on('state_changed', 
    (snapshot) => {
        let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
    }, 
    (error) => {
        console.error("UPLOAD ERROR OCCURRED:");
        console.error(error);
        process.exit(1);
    }, 
    () => {
        console.log("Upload success!");
        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
            console.log('File available at', downloadURL);
            process.exit(0);
        }).catch(err => {
            console.error("ERROR GETTING URL:");
            console.error(err);
            process.exit(1);
        });
    }
);
