import { z } from "zod";

import { UserRoleSchema } from "./enums.js";

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().trim().min(2).max(100),
  role: UserRoleSchema,
});

export type User = z.infer<typeof UserSchema>;

export const AgentSchema = UserSchema.extend({
  role: z.literal("AGENT"),
});

export type Agent = z.infer<typeof AgentSchema>;
