/**
 * pages/index.js
 *
 * Always shows Default Mode when visiting "/".
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import PlanComponent from "../components/PlanComponent";
import { useListenFireStore } from "../contexts/ListenFireStore";

export default function Home() {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  // Auth and Firestore loading state
  const { currentUser, loading } = useListenFireStore();

  useEffect(() => {
    if (loading) return;
    setShouldRender(true);
  }, [loading]);

  if (loading) return null;

  // Pass a prop (e.g. forcedMode="default") to PlanComponent
  return shouldRender ? <PlanComponent forcedMode="default" /> : null;
}
