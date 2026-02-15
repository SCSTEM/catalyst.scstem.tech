import z from "zod";

export const limitQuery = z
  .object({
    limit: z
      .string()
      .transform((val) => Number(val))
      .refine((val) => val >= 1 && val <= 200, {
        message: "Limit must be between 1 and 200",
      })
      .default(50)
      .optional(),
  })
  .optional();
