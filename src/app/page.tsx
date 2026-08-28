import { connection } from "next/server";

import { HandoffWorkspace } from "@/features/handoff/components/handoff-workspace";
import { getBoard } from "@/lib/server/handoff-repository";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string | string[] }>;
}) {
  await connection();
  const board = getBoard();
  const params = await searchParams;
  const initialPatientId = Array.isArray(params.patient)
    ? params.patient[0]
    : params.patient;

  return (
    <HandoffWorkspace
      initialBoard={board}
      initialPatientId={initialPatientId}
    />
  );
}
