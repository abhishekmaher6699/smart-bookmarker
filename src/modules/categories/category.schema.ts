import { z } from "zod";

export const categorizationSchema = z.object({
  category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().min(1).max(50)).min(1).max(5),
});

export type Categorization = z.infer<typeof categorizationSchema>;
