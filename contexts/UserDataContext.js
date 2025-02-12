// contexts/UserDataContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const UserDataContext = createContext({
  currentUser: null,
  userData: null,
  loading: true,
});

export function UserDataProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize with a no-op unsubscribe function.
    let unsubscribeSnapshot = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            setUserData(docSnap.exists() ? docSnap.data() : null);
            setLoading(false);
          },
          (error) => {
            console.error("[UserDataContext] Error listening to user document:", error);
            setLoading(false);
          }
        );
      } else {
        // Unsubscribe the snapshot listener when there is no user.
        unsubscribeSnapshot();
        setUserData(null);
        setLoading(false);
      }
    });

    // Cleanup both the snapshot listener and the auth listener on unmount.
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
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserDataContext() {
  return useContext(UserDataContext);
}
