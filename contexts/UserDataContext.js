// contexts/UserDataContext.js
import React, { createContext, useContext } from 'react';
import useUserData from '../hooks/useUserData';

// Create a context with default values.
const UserDataContext = createContext({
  currentUser: null,
  userData: null,
  loading: true,
});

// Provider component that wraps its children with the UserDataContext.
export function UserDataProvider({ children }) {
  const { currentUser, userData, loading } = useUserData();

  return (
    <UserDataContext.Provider value={{ currentUser, userData, loading }}>
      {children}
    </UserDataContext.Provider>
  );
}

// Custom hook to use the UserDataContext in any component.
export function useUserDataContext() {
  return useContext(UserDataContext);
}
