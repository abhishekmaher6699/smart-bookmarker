import { describe, expect, it } from "vitest";
import { extractArticleContent } from "../../../src/modules/captures/ingestion/content-parser.js";

describe("extractArticleContent", () => {
  it("should extract article paragraphs", () => {
    const html = `
            <html>
                <body>
                    <article>
                        <h1>My Article</h1>
                        <p>First paragraph.</p>
                        <p>Second paragraph.</p>
                        <p>Third paragraph.</p>
                    </article>
                </body>
            </html>
        `;

    const result = extractArticleContent(html, "https://example.com/article");

    expect(result).toBe(
      "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
    );
  });

  it("should trim whitespace from paragraphs", () => {
    const html = `
            <html>
                <body>
                    <article>
                        <p>
                            First paragraph with spaces.
                        </p>
                        <p>
                            Second paragraph.
                        </p>
                    </article>
                </body>
            </html>
        `;

    const result = extractArticleContent(html, "https://example.com/article");

    expect(result).toBe("First paragraph with spaces.\n\nSecond paragraph.");
  });

  it("should ignore empty paragraphs", () => {
    const html = `
            <html>
                <body>
                    <article>
                        <p>First paragraph.</p>
                        <p>   </p>
                        <p>Second paragraph.</p>
                    </article>
                </body>
            </html>
        `;

    const result = extractArticleContent(html, "https://example.com/article");

    expect(result).toBe("First paragraph.\n\nSecond paragraph.");
  });

  it("should extract text from paragraph elements containing inline HTML", () => {
    const html = `
            <html>
                <body>
                    <article>
                        <p>This is <strong>important</strong> text.</p>
                        <p>This contains <a href="/link">a link</a>.</p>
                    </article>
                </body>
            </html>
        `;

    const result = extractArticleContent(html, "https://example.com/article");

    expect(result).toBe("This is important text.\n\nThis contains a link.");
  });

  it("should return null when no readable article content exists", () => {
    const html = `
            <html>
                <head>
                    <title>Example</title>
                </head>
                <body>
                    <nav>Navigation</nav>
                    <footer>Footer</footer>
                </body>
            </html>
        `;

    const result = extractArticleContent(html, "https://example.com");

    expect(result).toBeNull();
  });
});
