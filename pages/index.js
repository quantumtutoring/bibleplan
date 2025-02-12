// pages/index.js
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
      // Check the Firestore document for the saved Bible version.
      const storedVersion = userData?.settings?.version;
      if (
        storedVersion === "nasb" ||
        storedVersion === "lsb" ||
        storedVersion === "esv"
      ) {
        router.push(`/${storedVersion}`);
      } else {
        // No valid version found in Firestore; render the default planner.
        setShouldRender(true);
      }
    } else {
      // --- Case 2: User is not signed in ---
      // For guest users, check localStorage (via our hook) for a stored version.
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

  // Optionally, you can render a loader while waiting.
  if (loading) return null;

  // Render the PlanComponent only when all checks have completed.
  return shouldRender ? <PlanComponent /> : null;
}
