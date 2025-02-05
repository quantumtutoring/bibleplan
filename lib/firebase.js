// lib/firebase.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAyrnrL9jPCVrrJ8D2Uf5xbvWNnw6Dtx40",
  authDomain: "biblereadingplan-8cc51.firebaseapp.com",
  projectId: "biblereadingplan-8cc51",
  storageBucket: "biblereadingplan-8cc51.firebasestorage.app",
  messagingSenderId: "29621423913",
  appId: "1:29621423913:web:2f72642305073d8645b138",
  measurementId: "G-QML05S68KS"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

export { firebase, auth, db };
