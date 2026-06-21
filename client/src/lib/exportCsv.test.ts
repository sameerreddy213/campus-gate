import { describe, it, expect } from "vitest";
import { formatDate } from "./exportCsv";

describe("formatDate", () => {
  it("returns an empty string for empty / invalid input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formats a valid ISO date into a day/month/year + time string", () => {
    const out = formatDate("2026-06-20T09:05:00.000Z");
    // en-GB day-first format, includes the year and a 12h time with am/pm.
    expect(out).toContain("2026");
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(out.toLowerCase()).toMatch(/am|pm/);
  });
});
