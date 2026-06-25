import { validateHatchOrder } from "../utils/validation";

// Pure function — no database required.

describe("validateHatchOrder", () => {
  it("returns null when hatch date is after start date", () => {
    expect(validateHatchOrder("2026-01-01", "2026-01-22")).toBeNull();
  });

  it("returns null when hatch date equals start date", () => {
    expect(validateHatchOrder("2026-01-01", "2026-01-01")).toBeNull();
  });

  it("returns an error when hatch date is before start date", () => {
    const result = validateHatchOrder("2026-02-01", "2026-01-01");
    expect(result).not.toBeNull();
    expect(result?.message).toMatch(/before startDate/);
  });

  it("ignores invalid dates (leaves them to schema validation)", () => {
    expect(validateHatchOrder("not-a-date", "2026-01-01")).toBeNull();
    expect(validateHatchOrder("2026-01-01", "not-a-date")).toBeNull();
    expect(validateHatchOrder(undefined, undefined)).toBeNull();
  });

  it("accepts Date objects as well as strings", () => {
    expect(validateHatchOrder(new Date("2026-01-01"), new Date("2026-01-10"))).toBeNull();
    expect(validateHatchOrder(new Date("2026-01-10"), new Date("2026-01-01"))).not.toBeNull();
  });
});
