// pages/index.js
/**
 * Index.js - Main Landing/Routing Page
 *
 * This file acts as the main entry point (homepage) for the Bible Reading Planner.
 * Its purpose is to determine where to route the user based on their authentication status
 * and their preferred Bible version.
 *
 * The overall flow is as follows:
 *
 * 1. On component mount, we set up a Firebase authentication listener via onAuthStateChanged.
 *
 * 2. If a user is signed in:
 *    - The app fetches the user's Firestore document to retrieve saved settings, 
 *      including their preferred Bible version.
 *    - If a valid version ("nasb", "lsb", or "esv") is found in Firestore,
 *      the user is immediately redirected to the corresponding route (e.g., /nasb).
 *    - If no valid version is found, the default PlanComponent is rendered.
 *
 * 3. If no user is signed in:
 *    - The app checks localStorage for a stored version value.
 *    - If a valid version exists in localStorage, the user is redirected accordingly.
 *    - Otherwise, the default PlanComponent is rendered.
 *
 * 4. While the authentication state and version checks are in progress,
 *    nothing is rendered. Once the check is complete and if no redirection occurs,
 *    the PlanComponent is rendered.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase"; // Firebase auth and Firestore DB
import PlanComponent from "../components/PlanComponent"; // Main planner component

export default function Home() {
  // -----------------------------------------------------------
  // 1. State and Router Initialization
  // -----------------------------------------------------------
  // - useRouter: Next.js hook to allow programmatic navigation.
  // - shouldRender: Flag indicating whether the PlanComponent should be rendered.
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  // -----------------------------------------------------------
  // 2. useEffect: Listen for Authentication State Changes
  // -----------------------------------------------------------
  // This effect runs once on component mount and sets up a Firebase auth listener.
  // Based on the authentication status and the retrieved Bible version,
  // the user is either redirected or allowed to see the PlanComponent.
  useEffect(() => {
    // Subscribe to Firebase auth state changes.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // -----------------------------------------------------------
        // Case 1: User is Signed In
        // -----------------------------------------------------------
        // If a user is signed in, fetch their Firestore document to get saved settings.
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();
          const storedVersion = userData?.settings?.version; // Get the saved version
          // If the version is one of our expected values, redirect immediately.
          if (
            storedVersion === "lsb" ||
            storedVersion === "esv" ||
            storedVersion === "nasb"
          ) {
            router.push(`/${storedVersion}`);
          } else {
            // No valid version in Firestore, so render the default PlanComponent.
            setShouldRender(true);
          }
        } catch (error) {
          // If an error occurs while fetching Firestore data, log the error and render the PlanComponent.
          console.error("Error fetching user version from Firestore:", error);
          setShouldRender(true);
        }
      } else {
        // -----------------------------------------------------------
        // Case 2: User is Not Signed In
        // -----------------------------------------------------------
        // For unsigned users, check localStorage for a stored version.
        const localVersion = localStorage.getItem("version");
        if (
          localVersion === "lsb" ||
          localVersion === "esv" ||
          localVersion === "nasb"
        ) {
          // If a valid version is found in localStorage, redirect to that route.
          router.push(`/${localVersion}`);
        } else {
          // If no valid version is found, render the default PlanComponent.
          setShouldRender(true);
        }
      }
    });

    // Clean up the auth listener on component unmount.
    return () => unsubscribe();
  }, [router]);

  // -----------------------------------------------------------
  // 3. Component Rendering
  // -----------------------------------------------------------
  // While waiting for the authentication/Firestore/localStorage checks,
  // nothing is rendered. Once the checks are complete (shouldRender becomes true),
  // the PlanComponent is rendered.
  return shouldRender ? <PlanComponent /> : null;
}
