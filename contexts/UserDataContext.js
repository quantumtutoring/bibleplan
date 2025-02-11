// contexts/UserDataContext.js
import React, { createContext, useContext, useMemo } from 'react';
import useUserData from '../hooks/useUserData';

const UserDataContext = createContext({
  currentUser: null,
  userData: null,
  loading: true,
});

export function UserDataProvider({ children }) {
  const { currentUser, userData, loading } = useUserData();

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
