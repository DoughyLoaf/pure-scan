import { describe, it, expect } from "vitest";
import { inferCategory } from "@/lib/alternatives-database";

describe("inferCategory popcorn fix", () => {
  it("SkinnyPop → popcorn", () => expect(inferCategory("SkinnyPop Popcorn", "SkinnyPop")).toBe("popcorn"));
  it("Smartfood → popcorn", () => expect(inferCategory("Smartfood White Cheddar", "Smartfood")).toBe("popcorn"));
  it("Boom Chicka Pop → popcorn", () => expect(inferCategory("Boom Chicka Pop Sea Salt", "Angie's")).toBe("popcorn"));
  it("Lesser Evil → popcorn", () => expect(inferCategory("Organic Popcorn", "Lesser Evil")).toBe("popcorn"));
  it("Kettle Corn → popcorn", () => expect(inferCategory("Kettle Corn", "")).toBe("popcorn"));
  it("generic pop → soda", () => expect(inferCategory("Pop", "")).toBe("soda"));
  it("Coca Cola → soda", () => expect(inferCategory("Coca Cola", "")).toBe("soda"));
  it("Pringles → chips", () => expect(inferCategory("Pringles Original", "Pringles")).toBe("chips"));
});
