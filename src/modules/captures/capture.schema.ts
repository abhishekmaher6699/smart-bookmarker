import { z } from "zod";

export const createCaptureSchema = z.object({
  url: z.url(),
  title: z.string().trim().min(1).optional(),
  type: z.enum(["article", "video", "pdf", "image", "github"]).optional(),
});

export const listCapturesByUserSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
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

export const updateCaptureSchema = z
  .object({
    url: z.url().optional(),
    title: z.string().trim().min(1).nullable().optional(),
    type: z
      .enum(["article", "video", "image", "github", "pdf"])
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Atleast one field is required",
  });

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
export type ListCapturesByUserInput = z.infer<typeof listCapturesByUserSchema>;
export type UpdateCaptureInput = z.infer<typeof updateCaptureSchema>;
