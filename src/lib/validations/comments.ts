import { z } from "zod";

export const createCommentSchema = z.object({
  entryId: z.string().uuid("Invalid entry ID").optional(),
  trainingSessionId: z.string().uuid("Invalid training session ID").optional(),
  comment: z.string().min(1, "Comment cannot be empty").max(5000, "Comment too long (max 5000 chars)"),
}).refine(
  (data) => data.entryId || data.trainingSessionId,
  { message: "Either entryId or trainingSessionId is required" }
).refine(
  (data) => !(data.entryId && data.trainingSessionId),
  { message: "Cannot specify both entryId and trainingSessionId" }
);

export const updateCommentSchema = z.object({
  id: z.string().uuid("Invalid comment ID"),
  comment: z.string().min(1, "Comment cannot be empty").max(5000, "Comment too long (max 5000 chars)"),
});

export type CreateComment = z.infer<typeof createCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;
