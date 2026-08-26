const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDc2ZGIzYi0yNGQ4LTRmN2UtYTA1Ny01MzFkYzlkNDg0ZTciLCJpYXQiOjE3ODc3MjQ2ODUsImV4cCI6MTc4NzcyNTU4NX0.9nxMBBBxMKKUcPJRONQ4WLN-DdBEnOrVHTuWvK-gO7Y";

const urls = [
  "https://www.google.com",
  "https://www.github.com",
  "https://www.wikipedia.org",
  "https://www.mozilla.org",
  "https://nodejs.org",
  "https://www.postgresql.org",
  "https://expressjs.com",
  "https://www.typescriptlang.org",
  "https://developer.mozilla.org",
  "https://www.npmjs.com",
];

const requests = urls.map((url, i) =>
  fetch("http://localhost:3000/captures", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      title: `Concurrency Test ${i + 1}`,
      type: "article",
    }),
  }),
);

const responses = await Promise.all(requests);

for (const [i, response] of responses.entries()) {
  console.log(
    `${i + 1}: ${response.status}`,
    await response.text(),
  );
}