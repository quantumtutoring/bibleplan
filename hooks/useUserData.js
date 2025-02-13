// hooks/useUserData.js
import { useState, useEffect, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

export default function useUserData() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeSnapshotRef = useRef(null);
  const lastDataRef = useRef(null);

  useEffect(() => {
    console.log("[useUserData] Setting up auth listener");
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("[useUserData] Auth state changed:", user);
      setCurrentUser(user);

      // Unsubscribe from any existing Firestore listener.
      if (unsubscribeSnapshotRef.current) {
        console.log("[useUserData] Unsubscribing from previous Firestore listener");
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }

      if (user) {
        console.log(`[useUserData] User signed in: ${user.uid}. Setting up Firestore listener.`);
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeSnapshotRef.current = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            const newData = docSnapshot.exists() ? docSnapshot.data() : null;
            // Compare newData with the last known data.
            if (JSON.stringify(newData) !== JSON.stringify(lastDataRef.current)) {
              console.log("[useUserData] Firestore snapshot received:", newData);
              lastDataRef.current = newData;
              setUserData(newData);
            }
            setLoading(false);
          },
          (error) => {
            console.error("[useUserData] Error in Firestore onSnapshot:", error);
            setLoading(false);
          },
          { includeMetadataChanges: false }
        );
      } else {
        console.log("[useUserData] No user signed in. Clearing userData.");
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      console.log("[useUserData] Cleaning up auth and Firestore listeners");
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
      }
      unsubscribeAuth();
    };
  }, []);

  return { currentUser, userData, loading };
}
