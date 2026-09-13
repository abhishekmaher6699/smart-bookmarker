import { z } from "zod";

export const createCaptureSchema = z.object({
  url: z.url(),

  title: z.string().trim().min(1).nullable().optional(),

  type: z
    .enum(["article", "video", "pdf", "image", "github"])
    .nullable()
    .optional(),

  browserData: z
    .object({
      title: z.string().trim().min(1).nullable().optional(),

      type: z
        .enum(["article", "video", "pdf", "image", "github"])
        .nullable()
        .optional(),

      html: z.string().max(5_000_000).nullable().optional(),

      content: z.string().max(500_000).nullable().optional(),

      description: z.string().trim().nullable().optional(),

      thumbnailUrl: z.url().nullable().optional(),

      selectedText: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});


export const updateCaptureSchema = z
  .object({
    url: z.url().optional(),
    categoryId: z.string().uuid().nullable().optional(),
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
export type UpdateCaptureInput = z.infer<typeof updateCaptureSchema>;
