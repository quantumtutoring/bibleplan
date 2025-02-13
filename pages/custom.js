/**
 * pages/custom.js
 *
 * Always shows Custom Mode when visiting "/custom".
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import PlanComponent from "../components/PlanComponent";
import { useListenFireStore } from "../contexts/ListenFireStore";

export default function CustomPage() {
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  // Auth and Firestore loading
  const { currentUser, loading } = useListenFireStore();

  useEffect(() => {
    if (loading) return;
    setShouldRender(true);
  }, [loading]);

  if (loading) return null;

  // Pass a prop to force custom mode
  return shouldRender ? <PlanComponent forcedMode="custom" /> : null;
}
