import { describe, expect, it } from "vitest";
import { parseMetadata } from "../../../src/modules/captures/ingestion/metadata-parser.js";

describe("parseMetadata", () => {
  it("should extract standard HTML metadata", () => {
    const html = `
            <html>
                <head>
                    <title>Example Article</title>
                    <meta name="description" content="This is an article">
                </head>
            </html>
        `;

    const result = parseMetadata(html, "https://example.com/article");

    expect(result.title).toBe("Example Article");
    expect(result.description).toBe("This is an article");
  });

  it("should extract OpenGraph metadata", () => {
    const html = `
            <html>
                <head>
                    <meta property="og:title" content="OG Article">
                    <meta property="og:description" content="OG description">
                    <meta property="og:image" content="https://example.com/image.jpg">
                    <meta property="og:type" content="article">
                </head>
            </html>
        `;

    const result = parseMetadata(html, "https://example.com/article");

    expect(result.ogTitle).toBe("OG Article");
    expect(result.ogDescription).toBe("OG description");
    expect(result.ogImage).toBe("https://example.com/image.jpg");
    expect(result.ogType).toBe("article");
  });

  it("should resolve relative canonical URLs", () => {
    const html = `
            <link rel="canonical" href="/articles/my-article">
        `;

    const result = parseMetadata(html, "https://example.com/page");

    expect(result.canonicalUrl).toBe(
      "https://example.com/articles/my-article",
    );
  });

  it("should resolve relative OpenGraph image URLs", () => {
    const html = `
            <meta property="og:image" content="/images/article.jpg">
        `;

    const result = parseMetadata(html, "https://example.com/articles/page");

    expect(result.ogImage).toBe("https://example.com/images/article.jpg");
  });

  it("should trim extracted metadata", () => {
    const html = `
            <title>
                Example Article
            </title>

            <meta
                name="description"
                content="  A description with spaces  "
            >

            <meta
                property="og:title"
                content="  OG Title  "
            >
        `;

    const result = parseMetadata(html, "https://example.com");

    expect(result.title).toBe("Example Article");
    expect(result.description).toBe("A description with spaces");
    expect(result.ogTitle).toBe("OG Title");
  });

  it("should return null for missing metadata", () => {
    const html = `
            <html>
                <head></head>
                <body>
                    <p>No metadata</p>
                </body>
            </html>
        `;

    const result = parseMetadata(html, "https://example.com");

    expect(result).toEqual({
      title: null,
      description: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      ogType: null,
      canonicalUrl: null,
    });
  });

  it("should use the first title when multiple title elements exist", () => {
    const html = `
            <title>First Title</title>
            <title>Second Title</title>
        `;

    const result = parseMetadata(html, "https://example.com");

    expect(result.title).toBe("First Title");
  });
});
