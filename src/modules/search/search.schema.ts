import { z } from "zod";

export const searchCapturesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().min(1).optional(),
  type: z.enum(["article", "video", "pdf", "image", "github"]).optional(),
  tag: z.string().trim().min(1).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),

  categoryIds: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(z.string().uuid()).optional()),
});