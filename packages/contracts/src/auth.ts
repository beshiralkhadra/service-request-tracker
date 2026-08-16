import { z } from "zod";

import { UserSchema } from "./users.js";

const EmailSchema = z
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());

export const RegisterInputSchema = z.object({
  email: EmailSchema,
  displayName: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(128),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
