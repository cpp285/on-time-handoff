import { ExtractionWorkspace } from "@/features/extraction/components/extraction-workspace";
import { getDemoWorkspaceCharts } from "@/features/extraction/demo-source";

export default function HandoffPage() {
  return <ExtractionWorkspace initialCharts={getDemoWorkspaceCharts()} experience="handoff" />;
}
