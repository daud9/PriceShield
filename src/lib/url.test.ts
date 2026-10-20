import { describe, expect, it } from "vitest";
import { validateProductUrl } from "./url";

describe("validateProductUrl", () => {
  it("accepts public https product links", () => {
    const r = validateProductUrl("https://www.example.com/item/123");
    expect(r.ok).toBe(true);
  });

  it("rejects unsupported schemes", () => {
    expect(validateProductUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateProductUrl("data:text/html,hello").ok).toBe(false);
    expect(validateProductUrl("http://example.com/item").ok).toBe(false);
  });

  it("rejects malformed input and empty input", () => {
    expect(validateProductUrl("not a link").ok).toBe(false);
    expect(validateProductUrl("   ").ok).toBe(false);
  });

  it("rejects private and local hosts", () => {
    expect(validateProductUrl("https://localhost:3000/x").ok).toBe(false);
    expect(validateProductUrl("https://192.168.1.10/x").ok).toBe(false);
    expect(validateProductUrl("https://127.0.0.1/x").ok).toBe(false);
  });

  it("rejects links with embedded credentials", () => {
    expect(validateProductUrl("https://user:pass@example.com/x").ok).toBe(false);
  });
});
