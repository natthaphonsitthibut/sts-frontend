import { describe, expect, it } from "vitest";
import { resolveExclusivePicks } from "./exclusive-picks";

const guardians = [
  { code: "FATHER", isExclusive: false },
  { code: "MOTHER", isExclusive: false },
  { code: "NO_GUARDIAN", isExclusive: true },
];

describe("resolveExclusivePicks", () => {
  it("keeps several ordinary picks together", () => {
    expect(
      resolveExclusivePicks(["FATHER"], ["FATHER", "MOTHER"], guardians),
    ).toEqual(["FATHER", "MOTHER"]);
  });

  it("clears the others when the exclusive option is ticked", () => {
    expect(
      resolveExclusivePicks(
        ["FATHER", "MOTHER"],
        ["FATHER", "MOTHER", "NO_GUARDIAN"],
        guardians,
      ),
    ).toEqual(["NO_GUARDIAN"]);
  });

  it("drops the exclusive option when another is ticked after it", () => {
    expect(
      resolveExclusivePicks(
        ["NO_GUARDIAN"],
        ["NO_GUARDIAN", "MOTHER"],
        guardians,
      ),
    ).toEqual(["MOTHER"]);
  });

  it("lets a pick be removed and the field be cleared", () => {
    expect(
      resolveExclusivePicks(["FATHER", "MOTHER"], ["MOTHER"], guardians),
    ).toEqual(["MOTHER"]);
    expect(resolveExclusivePicks(["NO_GUARDIAN"], [], guardians)).toEqual([]);
  });
});
