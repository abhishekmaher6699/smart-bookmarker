import { z } from "zod";


const httpUrlSchema = z
  .url()
  .refine(
    (value) => {
      const protocol = new URL(value).protocol
      return protocol === "http:" || protocol === "https:"
    },
    {
      message: "Only HTTP and HTTPS URLs are allowed"
    }
  )


const captureTypeSchema = z
  .enum(["article", "video", "pdf", "image", "github"])
  .nullable()
  .optional();


export const createCaptureSchema = z.object({
  url: httpUrlSchema,

  title: z.string().trim().min(1).nullable().optional(),

  type: captureTypeSchema,

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

      thumbnailUrl: httpUrlSchema.nullable().optional(),

      selectedText: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});


export const updateCaptureSchema = z
  .object({
    url: httpUrlSchema.optional(),
    categoryId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).nullable().optional(),
    type: captureTypeSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Atleast one field is required",
  });


export const captureIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
export type UpdateCaptureInput = z.infer<typeof updateCaptureSchema>;
