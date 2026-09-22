import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom";
import * as cheerio from "cheerio"

export function extractArticleContent(
    html: string,
    pageUrl: string
) : string | null {
    
    const dom = new JSDOM(html, {
        url: pageUrl
    })

    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    const content = article?.content;
    if (!content) {return null;}

    const $ = cheerio.load(content);

    const paragraphs = $("p")
        .map((_, element) => $(element).text().trim())
        .get()
        .filter(Boolean);

    return paragraphs.length > 0
        ? paragraphs.join("\n\n")
        : null;
}

