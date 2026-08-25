import { PDFParse } from "pdf-parse";

export type ParsedPdf = {
    title: string | null;
    content: string | null;
};

export async function parsePdf(
    buffer: Buffer,
    url: string,
): Promise<ParsedPdf> {
    const parser = new PDFParse({
        data: buffer,
    });

    const info = await parser.getInfo();
    const text = await parser.getText();

    await parser.destroy();

    const title =
        info.info?.Title?.trim() ||
        extractFilename(url);

    return {
        title,
        content: text.text?.trim() || null,
    };
}



function extractFilename(url: string): string | null {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop();

    if (!filename) {
        return null;
    }

    return filename
        .replace(/\.pdf$/i, "")
        .replace(/[-_]+/g, " ")
        .trim() || null;
}