// pages/custom.js
import { useState, useEffect } from 'react';
import PlanComponent from '../components/PlanComponent';
import useLocalStorage from '../hooks/useLocalStorage';

export default function CustomPage() {
  const { setItem } = useLocalStorage();

  // We'll track when we've set 'isCustomSchedule' so we know when to show PlanComponent.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Set isCustomSchedule to true
    setItem('isCustomSchedule', true);
    // Now that we've set localStorage, let the component render
    setReady(true);
  }, [setItem]);

  // If we're not ready yet (haven't updated localStorage), return null or a loader
  if (!ready) return null; // or <div>Loading...</div>

  // Once ready, PlanComponent will mount and see isCustomSchedule === true in localStorage
  return <PlanComponent />;
}
