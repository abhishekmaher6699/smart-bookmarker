import * as cheerio from "cheerio"


export type ParsedMetadata = {
    title: string | null;
    description: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogType: string | null;
    canonicalUrl: string | null;
};


export function parseMetadata(html: string, pageUrl: string) : ParsedMetadata {
    const $ = cheerio.load(html)
    
    const title = $("title").first().text().trim() || null

    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || null
    
    const ogDescription = $('meta[property="og:description"]').attr("content")?.trim() || null
    const description = $('meta[name="description"]').attr("content")?.trim() || null;
    
    const rawCanonicalUrl = $('link[rel="canonical"]').attr("href")?.trim() || null;
    const canonicalUrl = rawCanonicalUrl ? new URL(rawCanonicalUrl, pageUrl).toString() : null;
    
    const rawOgImg = $('meta[property="og:image"]').attr("content")?.trim() || null
    const ogImage = rawOgImg ? new URL(rawOgImg, pageUrl).toString() : null

    const ogType = $('meta[property="og:type"]').attr("content")?.trim() || null;
    
    
    return {
        title,
        ogTitle,
        description,
        ogDescription,
        ogImage,
        ogType,
        canonicalUrl
    }
}