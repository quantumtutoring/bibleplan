import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

// Module-level counter for reads.
let readCount = 0;

const ListenFireStore = createContext({
  currentUser: null,
  userData: null,
  loading: true,
});

export function UserDataProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            readCount++;
            const timeStamp = new Date().toISOString();
            console.log(`[${timeStamp}] Read #${readCount}: Received snapshot for user ${user.uid}`, docSnap.data());
            setUserData(docSnap.exists() ? docSnap.data() : null);
            setLoading(false);
            console.log(`[${timeStamp}] Running total reads: ${readCount}`);
          },
          (error) => {
            console.error(`[${new Date().toISOString()}] Error listening to user document:`, error);
            setLoading(false);
          }
        );
      } else {
        unsubscribeSnapshot();
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  const contextValue = useMemo(
    () => ({ currentUser, userData, loading }),
    [currentUser, userData, loading]
  );

  return (
    <ListenFireStore.Provider value={contextValue}>
      {children}
    </ListenFireStore.Provider>
  );
}

export function useListenFireStore() {
  return useContext(ListenFireStore);
}

export { readCount };
