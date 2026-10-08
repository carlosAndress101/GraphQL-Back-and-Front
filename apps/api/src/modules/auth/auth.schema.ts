import { z } from "zod";

// trim/lowercase must run before the email check, so they wrap the outside of a pipe.
export const CredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // 128 chars bounds the scrypt input (DoS guard); 12 is the minimum for real secrets.
  password: z.string().min(12).max(128),
});

export type Credentials = z.infer<typeof CredentialsSchema>;
