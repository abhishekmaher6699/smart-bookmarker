import { describe, expect, it } from "vitest";
import {
  detectTypeFromContentType,
  detectTypeFromUrl,
  detectTypeFromMetadata,
  detectType,
} from "../../../src/modules/captures/ingestion/type-detector.js";

describe("detectTypeFromContentType", () => {
  it("should detect PDF", () => {
    expect(detectTypeFromContentType("application/pdf")).toBe("pdf");
  });

  it("should detect images", () => {
    expect(detectTypeFromContentType("image/png")).toBe("image");

    expect(detectTypeFromContentType("image/jpeg")).toBe("image");
  });

  it("should detect videos", () => {
    expect(detectTypeFromContentType("video/mp4")).toBe("video");
  });

  it("should handle content types with parameters", () => {
    expect(detectTypeFromContentType("application/pdf; charset=utf-8")).toBe(
      "pdf",
    );
  });

  it("should be case insensitive", () => {
    expect(detectTypeFromContentType("APPLICATION/PDF")).toBe("pdf");
  });

  it("should return null for missing content type", () => {
    expect(detectTypeFromContentType(null)).toBeNull();
  });

  it("should return null for unsupported content types", () => {
    expect(detectTypeFromContentType("text/html")).toBeNull();
  });
});

describe("detectTypeFromUrl", () => {
  it("should detect GitHub URLs", () => {
    expect(detectTypeFromUrl("https://github.com/user/repo")).toBe("github");
  });

  it("should detect GitHub subdomains", () => {
    expect(detectTypeFromUrl("https://api.github.com/repos")).toBe("github");
  });

  it("should detect YouTube URLs", () => {
    expect(detectTypeFromUrl("https://youtube.com/watch?v=123")).toBe("video");
  });

  it("should detect YouTube subdomains", () => {
    expect(detectTypeFromUrl("https://www.youtube.com/watch?v=123")).toBe(
      "video",
    );
  });

  it("should detect youtu.be URLs", () => {
    expect(detectTypeFromUrl("https://youtu.be/abc123")).toBe("video");
  });

  it("should return null for unrelated URLs", () => {
    expect(detectTypeFromUrl("https://example.com/article")).toBeNull();
  });
});

describe("detectTypeFromMetadata", () => {
  it("should detect video metadata", () => {
    expect(detectTypeFromMetadata("video")).toBe("video");

    expect(detectTypeFromMetadata("video.other")).toBe("video");
  });

  it("should detect article metadata", () => {
    expect(detectTypeFromMetadata("article")).toBe("article");
  });

  it("should be case insensitive", () => {
    expect(detectTypeFromMetadata("ARTICLE")).toBe("article");

    expect(detectTypeFromMetadata("VIDEO")).toBe("video");
  });

  it("should return null for missing metadata", () => {
    expect(detectTypeFromMetadata(null)).toBeNull();
  });

  it("should return null for unsupported metadata", () => {
    expect(detectTypeFromMetadata("website")).toBeNull();
  });
});

describe("detectType", () => {
  it("should prioritize URL detection", () => {
    expect(
      detectType("https://github.com/user/repo", "text/html", "article"),
    ).toBe("github");
  });

  it("should use metadata when URL does not identify the type", () => {
    expect(
      detectType("https://example.com/article", "text/html", "article"),
    ).toBe("article");
  });

  it("should return null when no detector identifies the type", () => {
    expect(detectType("https://example.com", "text/html", null)).toBeNull();
  });
});
