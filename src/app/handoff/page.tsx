import { ExtractionWorkspace } from "@/features/extraction/components/extraction-workspace";
import { getDemoWorkspaceCharts } from "@/features/extraction/demo-source";

export default async function HandoffPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <ExtractionWorkspace
      initialCharts={getDemoWorkspaceCharts()}
      experience="handoff"
      autoImport={params.import === "1"}
    />
  );
}
