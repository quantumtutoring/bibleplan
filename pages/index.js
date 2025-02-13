/**
 * Index.js - Main Landing/Routing Page
 *
 * This page checks the authentication state and the saved Bible version
 * (from Firestore for signed‑in users or from localStorage for guests) via our centralized
 * UserDataContext. If a valid version is found, the user is redirected.
 * Otherwise, the default PlanComponent is rendered.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import PlanComponent from "../components/PlanComponent"; // Main planner component
import { useUserDataContext } from "../contexts/UserDataContext";
import useLocalStorage from "../hooks/useLocalStorage";

export default function Home() {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  
  // Get authentication and Firestore data from the centralized context.
  const { currentUser, userData, loading } = useUserDataContext();
  // Use our localStorage hook to abstract local storage operations.
  const { getItem } = useLocalStorage();

  useEffect(() => {
    // Wait until the centralized context has finished loading.
    if (loading) return;

    if (currentUser) {
      // --- Case 1: User is signed in ---
      // Try to get the version from Firestore; if not present, fall back to localStorage.
      const storedVersion = userData?.settings?.version || getItem("version");
      if (
        storedVersion === "nasb" ||
        storedVersion === "lsb" ||
        storedVersion === "esv"
      ) {
        router.push(`/${storedVersion}`);
      } else {
        // No valid version found; render the default planner.
        setShouldRender(true);
      }
    } else {
      // --- Case 2: User is not signed in ---
      // For guest users, check localStorage for a stored version.
      const localVersion = getItem("version");
      if (
        localVersion === "nasb" ||
        localVersion === "lsb" ||
        localVersion === "esv"
      ) {
        router.push(`/${localVersion}`);
      } else {
        // No valid version in localStorage; render the default planner.
        setShouldRender(true);
      }
    }
  }, [loading, currentUser, userData, router, getItem]);

  if (loading) return null;

  // Render the PlanComponent only when all checks have completed.
  return shouldRender ? <PlanComponent /> : null;
}
