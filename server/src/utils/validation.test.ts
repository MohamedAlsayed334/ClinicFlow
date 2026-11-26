import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  isValidPhone,
  normalizeName,
  isValidName,
  normalizeEmail,
  isValidEmail,
  isValidPassword,
} from "./validation.js";

describe("phone validation", () => {
  it("normalizes Arabic-Indic digits, spaces, and dashes", () => {
    expect(normalizePhone("٠١٠ ١٢٣٤-٥٦٧٨")).toBe("01012345678");
    expect(normalizePhone("011-2345 6789")).toBe("01123456789");
  });

  it("accepts valid Egyptian mobile prefixes 010, 011, 012, 015", () => {
    expect(isValidPhone("01012345678")).toBe(true);
    expect(isValidPhone("01112345678")).toBe(true);
    expect(isValidPhone("01212345678")).toBe(true);
    expect(isValidPhone("01512345678")).toBe(true);
    expect(isValidPhone("٠١٠١٢٣٤٥٦٧٨")).toBe(true);
  });

  it("rejects invalid prefixes and wrong lengths", () => {
    expect(isValidPhone("01312345678")).toBe(false);
    expect(isValidPhone("01612345678")).toBe(false);
    expect(isValidPhone("02012345678")).toBe(false);
    expect(isValidPhone("0101234567")).toBe(false);
    expect(isValidPhone("010123456789")).toBe(false);
    expect(isValidPhone("abcdefghijk")).toBe(false);
  });
});

describe("name, email, and password validation", () => {
  it("validates and normalizes names", () => {
    expect(normalizeName("  أحمد علي  ")).toBe("أحمد علي");
    expect(isValidName("علي")).toBe(true);
    expect(isValidName("  أب  ")).toBe(false);
    expect(isValidName("أ".repeat(61))).toBe(false);
  });

  it("validates and normalizes emails", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });

  it("validates passwords of at least 8 characters", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("1234567")).toBe(false);
  });
});
