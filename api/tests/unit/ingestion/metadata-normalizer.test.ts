import { describe, expect, it } from "vitest";
import { normalizeMetadata } from "../../../src/modules/captures/ingestion/metadata-normalizer.js";

describe("normalizeMetadata", () => {
  it("should prefer OpenGraph title over standard title", () => {
    const metadata = {
      title: "Standard Title",
      description: "Standard Description",
      ogTitle: "OG Title",
      ogDescription: "OG Description",
      ogImage: "https://example.com/image.jpg",
      ogType: "article",
      canonicalUrl: "https://example.com/article",
    };

    const result = normalizeMetadata(metadata);

    expect(result.title).toBe("OG Title");
  });

  it("should fall back to standard title when OpenGraph title is null", () => {
    const metadata = {
      title: "Standard Title",
      description: "Standard Description",
      ogTitle: null,
      ogDescription: "OG Description",
      ogImage: null,
      ogType: "article",
      canonicalUrl: null,
    };

    const result = normalizeMetadata(metadata);

    expect(result.title).toBe("Standard Title");
  });

  it("should prefer OpenGraph description over standard description", () => {
    const metadata = {
      title: "Title",
      description: "Standard Description",
      ogTitle: null,
      ogDescription: "OG Description",
      ogImage: null,
      ogType: null,
      canonicalUrl: null,
    };

    const result = normalizeMetadata(metadata);

    expect(result.description).toBe("OG Description");
  });

  it("should fall back to standard description when OpenGraph description is null", () => {
    const metadata = {
      title: "Title",
      description: "Standard Description",
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      ogType: null,
      canonicalUrl: null,
    };

    const result = normalizeMetadata(metadata);

    expect(result.description).toBe("Standard Description");
  });

  it("should use the OpenGraph image as imageUrl", () => {
    const metadata = {
      title: "Title",
      description: "Description",
      ogTitle: null,
      ogDescription: null,
      ogImage: "https://example.com/image.jpg",
      ogType: null,
      canonicalUrl: null,
    };

    const result = normalizeMetadata(metadata);

    expect(result.imageUrl).toBe("https://example.com/image.jpg");
  });

  it("should preserve canonical URL", () => {
    const metadata = {
      title: "Title",
      description: "Description",
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      ogType: null,
      canonicalUrl: "https://example.com/article",
    };

    const result = normalizeMetadata(metadata);

    expect(result.canonicalUrl).toBe("https://example.com/article");
  });

  it("should return null when optional metadata is unavailable", () => {
    const metadata = {
      title: null,
      description: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      ogType: null,
      canonicalUrl: null,
    };

    const result = normalizeMetadata(metadata);

    expect(result).toEqual({
      title: null,
      description: null,
      imageUrl: null,
      canonicalUrl: null,
    });
  });

  it("should not fall back when OpenGraph title is an empty string", () => {
    const metadata = {
      title: "Standard Title",
      description: null,
      ogTitle: "",
      ogDescription: null,
      ogImage: null,
      ogType: null,
      canonicalUrl: null,
    };

    const result = normalizeMetadata(metadata);

    expect(result.title).toBe("");
  });
});
