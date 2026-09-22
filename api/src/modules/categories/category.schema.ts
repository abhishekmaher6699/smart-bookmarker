import { z } from "zod";

export const categorizationSchema = z.object({
  category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().min(1).max(50)).min(1).max(5),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export type Categorization = z.infer<typeof categorizationSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
