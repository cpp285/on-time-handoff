import { describe, expect, it } from "vitest";

import {
  canConfirmHandoff,
  canEditHandoff,
  canReceiveHandoff,
  isGenerationTerminal,
} from "../domain";

describe("handoff state rules", () => {
  it("only allows editing and confirmation while the draft needs review", () => {
    expect(canEditHandoff("needs_review")).toBe(true);
    expect(canConfirmHandoff("needs_review")).toBe(true);
    expect(canEditHandoff("confirmed")).toBe(false);
    expect(canConfirmHandoff("handed_over")).toBe(false);
  });

  it("only allows receiving a confirmed handoff", () => {
    expect(canReceiveHandoff("confirmed")).toBe(true);
    expect(canReceiveHandoff("needs_review")).toBe(false);
    expect(canReceiveHandoff("handed_over")).toBe(false);
  });

  it("recognizes every terminal generation status", () => {
    expect(isGenerationTerminal("completed")).toBe(true);
    expect(isGenerationTerminal("partial_failed")).toBe(true);
    expect(isGenerationTerminal("failed")).toBe(true);
    expect(isGenerationTerminal("running")).toBe(false);
  });
});
