// hooks/useUserData.js
import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

export default function useUserData() {
  // Holds the Firebase auth user.
  const [currentUser, setCurrentUser] = useState(null);
  // Holds the Firestore document data for the user.
  const [userData, setUserData] = useState(null);
  // Indicates whether data is still being fetched.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll store the Firestore snapshot unsubscribe function here.
    let unsubscribeSnapshot = null;

    console.log("[useUserData] Setting up auth listener");
    // Set up the Firebase Authentication listener.
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("[useUserData] Auth state changed:", user);
      setCurrentUser(user);

      // If there's an existing Firestore snapshot listener, unsubscribe from it.
      if (unsubscribeSnapshot) {
        console.log("[useUserData] Unsubscribing from previous Firestore listener");
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        console.log(`[useUserData] User signed in: ${user.uid}. Setting up Firestore listener.`);
        // Get a reference to the user's document.
        const userDocRef = doc(db, "users", user.uid);
        // Attach a Firestore snapshot listener.
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            console.log("[useUserData] Firestore snapshot received:", docSnapshot.data());
            if (docSnapshot.exists()) {
              setUserData(docSnapshot.data());
            } else {
              console.log(`[useUserData] No document found for user ${user.uid}`);
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("[useUserData] Error in Firestore onSnapshot:", error);
            setLoading(false);
          },
          { includeMetadataChanges: false } // Disable metadata-only events.
        );
      } else {
        console.log("[useUserData] No user signed in. Clearing userData.");
        setUserData(null);
        setLoading(false);
      }
    });

    // Cleanup: Unsubscribe from both the Firestore snapshot listener and the auth listener.
    return () => {
      console.log("[useUserData] Cleaning up auth listener and Firestore listener");
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, []);

  return { currentUser, userData, loading };
}
