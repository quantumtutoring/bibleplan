import { useRouter } from "next/router";
import PlanComponent from "../components/PlanComponent";
import { useListenFireStore } from "../contexts/ListenFireStore";

export default function Home() {


  return <PlanComponent forcedMode="default" />;
}
