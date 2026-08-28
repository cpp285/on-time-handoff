import { ExtractionWorkspace } from "@/features/extraction/components/extraction-workspace";
import { getDemoWorkspaceCharts } from "@/features/extraction/demo-source";

export default function Home() {
  return <ExtractionWorkspace initialCharts={getDemoWorkspaceCharts()} />;
}
