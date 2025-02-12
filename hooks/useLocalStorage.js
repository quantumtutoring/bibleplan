// hooks/useLocalStorage.js
import { useCallback } from 'react';

export default function useLocalStorage() {
  const getItem = useCallback((key, defaultValue = null) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error parsing localStorage key "${key}":`, error);
      // Fallback: return the raw stored value if JSON parsing fails.
      const raw = window.localStorage.getItem(key);
      return raw !== null ? raw : defaultValue;
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
