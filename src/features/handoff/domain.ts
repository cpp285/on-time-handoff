import type { HandoffStatus } from "./types";

export function canEditHandoff(status: HandoffStatus) {
  return status === "needs_review";
}

export function canConfirmHandoff(status: HandoffStatus) {
  return status === "needs_review";
}

export function canReceiveHandoff(status: HandoffStatus) {
  return status === "confirmed";
}

export function isGenerationTerminal(status: string) {
  return status === "completed" || status === "partial_failed" || status === "failed";
}
