import { categorizeBookmark } from "../integrations/gemini/bookmark-categorizer.js";

const result = await categorizeBookmark({
  title: "Inconsistencies in TEX-Produced Documents",
  description: null,
  type: "pdf",
  content: "TEX is a widely used typesetting system adopted by most publishers.",
  categories: [],
});

console.log(result);
