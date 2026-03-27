import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const registerFormSchema = loginFormSchema
  .extend({
    displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(50),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });

export const directChatSchema = z.object({
  participantEmail: z.string().email('Enter a valid email address.'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type DirectChatFormValues = z.infer<typeof directChatSchema>;
