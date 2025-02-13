// contexts/SettingsContext.js
import { createContext, useContext, useState } from 'react';

const SettingsContext = createContext({
  version: 'nasb',
  isCustomSchedule: false,
  setVersion: () => {},
  setIsCustomSchedule: () => {},
});

export function SettingsProvider({ children }) {
  const [version, setVersion] = useState('nasb');
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);

  return (
    <SettingsContext.Provider value={{ version, isCustomSchedule, setVersion, setIsCustomSchedule }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export default SettingsContext;
