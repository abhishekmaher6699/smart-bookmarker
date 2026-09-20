import { describe, expect, it } from "vitest";
import { validateUrl } from "../../../src/modules/captures/ingestion/url-validator.js";

describe("validateUrl", () => {
  it("should accept a valid HTTP URL", () => {
    const result = validateUrl("http://example.com");

    expect(result).toBeInstanceOf(URL);
    expect(result.href).toBe("http://example.com/");
  });

  it("should accept a valid HTTPS URL", () => {
    const result = validateUrl("https://example.com/path");

    expect(result).toBeInstanceOf(URL);
    expect(result.protocol).toBe("https:");
    expect(result.hostname).toBe("example.com");
    expect(result.pathname).toBe("/path");
  });

  it("should reject an invalid URL", () => {
    expect(() => validateUrl("not-a-url")).toThrow("Invalid url");
  });

  it("should reject FTP URLs", () => {
    expect(() => validateUrl("ftp://example.com/file.txt")).toThrow(
      "Only HTTP and HTTPS URLs are allowed",
    );
  });

  it("should reject javascript URLs", () => {
    expect(() => validateUrl("javascript:alert('hello')")).toThrow(
      "Only HTTP and HTTPS URLs are allowed",
    );
  });

  it("should reject other unsupported protocols", () => {
    expect(() => validateUrl("file:///etc/passwd")).toThrow(
      "Only HTTP and HTTPS URLs are allowed",
    );
  });
});
