import { fetchUrl } from "./http-client.js";
import { parseMetadata } from "./metadata-parser.js";
import { normalizeMetadata } from "./metadata-normalizer.js";
import { extractArticleContent } from "./content-parser.js";
import { detectType } from "./type-detector.js";
import { parsePdf } from "./pdf-parser.js";
import { logger } from "../../../utils/logger.js";

export async function ingestUrl(url: string) {
  const result = await fetchUrl(url);

  if (result.response.status === 429) {
    throw new Error("Remote server rate limited the request");
  }

  if (!result.response.ok) {
    throw new Error(`Remote server returned HTTP ${result.response.status}`);
  }

  const contentType = result.response.headers.get("content-type");

  const type = detectType(result.response.url, contentType, null);

  if (type === "pdf") {
    const pdf = await parsePdf(result.body, result.response.url);

    return {
      url: result.response.url,
      title: pdf.title,
      description: null,
      imageUrl: null,
      canonicalUrl: null,
      content: pdf.content,
      type: "pdf",
    };
  }

  if (type === "image" || type === "video") {
    return {
      url: result.response.url,
      title: null,
      description: null,
      imageUrl: type === "image" ? result.response.url : null,
      canonicalUrl: null,
      content: null,
      type,
    };
  }

  if (contentType && !contentType.toLowerCase().startsWith("text/html")) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const html = result.body.toString("utf-8");

  return ingestHtml(html, result.response.url);
}



export function ingestHtml(html: string, url: string) {
  const parsed = parseMetadata(html, url);
  logger.info("Browser metadata detected", {
    url,
    ogType: parsed.ogType,
  });

  const metadata = normalizeMetadata(parsed);

  const content = extractArticleContent(html, url);

  const type = detectType(url, "text/html", parsed.ogType);

  return {
    url,
    ...metadata,
    content,
    type,
  };
}




export function createBrowserMetadata(
  url: string,
  browserSource: {
    title: string | null;
    type: string | null;
    content: string | null;
    description: string | null;
    thumbnail_url: string | null;
  },
) {
  return {
    url,
    title: browserSource.title,
    description: browserSource.description,
    imageUrl: browserSource.thumbnail_url,
    canonicalUrl: url,
    content: browserSource.content,
    type: detectType(url, "text/html", null),
  };
}