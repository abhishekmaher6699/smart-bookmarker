import { validateUrl } from "./url-validator.js";
import { Agent, fetch } from "undici";
import { safeLookup } from "./safe-lookup.js";

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

const agent = new Agent({
  connect: {
    lookup: safeLookup,
  },
});


export async function fetchUrl(url: string) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10_000);

  try {
    let currentUrl = validateUrl(url);

    for (let redirectCount = 0; ; redirectCount++) {
      const response = await fetch(currentUrl, {
        dispatcher: agent,
        signal: controller.signal,
        redirect: "manual",
      });

      if (response.status < 300 || response.status >= 400) {
        if (!response.body) {
          throw new Error("Response body is unavailable");
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalSize = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          totalSize += value.byteLength;

          if (totalSize > MAX_RESPONSE_SIZE) {
            await reader.cancel();
            throw new Error("Response body too large");
          }

          chunks.push(value);
        }

        return {
          response,
          body: Buffer.concat(chunks),
        };
      }

      if (redirectCount >= MAX_REDIRECTS) {
        await response.body?.cancel();

        throw new Error(`Too many redirects (maximum ${MAX_REDIRECTS})`);
      }

      const location = response.headers.get("location");

      if (!location) {
        await response.body?.cancel();

        throw new Error("Redirect without location");
      }

      await response.body?.cancel();
      const nextUrl = new URL(location, currentUrl);
      currentUrl = validateUrl(nextUrl.toString());
    }
  } finally {
    clearTimeout(timeout);
  }
}
