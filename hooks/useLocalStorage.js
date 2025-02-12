// hooks/useLocalStorage.js
import { useCallback } from 'react';

/**
 * useLocalStorage
 *
 * A custom hook that provides helper functions for interacting with localStorage.
 * This hook abstracts JSON parsing/stringifying, error handling, and provides a
 * consistent API for getting, setting, removing items, and clearing storage.
 *
 * Returns an object with the following functions:
 *  - getItem(key, defaultValue): Retrieves and parses the value for a given key.
 *  - setItem(key, value): Stringifies and stores the given value under the key.
 *  - removeItem(key): Removes the given key from localStorage.
 *  - clear(): Clears all localStorage.
 */
export default function useLocalStorage() {
  const getItem = useCallback((key, defaultValue = null) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  }, []);

  const setItem = useCallback((key, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, []);

  const removeItem = useCallback((key) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, []);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  }, []);

  return { getItem, setItem, removeItem, clear };
}
