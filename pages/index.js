// pages/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import PlanComponent from "../components/PlanComponent";

export default function Home() {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Listen for auth state changes.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // If user is signed in, fetch their Firestore document.
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();
          const storedVersion = userData?.settings?.version;
          // If the version is one of our expected values, redirect immediately.
          if (storedVersion === "lsb" || storedVersion === "esv" || storedVersion === "nasb") {
            router.push(`/${storedVersion}`);
          } else {
            // If there’s no valid version, render the PlanComponent.
            setShouldRender(true);
          }
        } catch (error) {
          console.error("Error fetching user version from Firestore:", error);
          setShouldRender(true);
        }
      } else {
        // If not signed in, simply render the page.
        setShouldRender(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // While waiting for authentication/Firestore, nothing is rendered.
  return shouldRender ? <PlanComponent /> : null;
}
