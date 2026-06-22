import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z
    .string()
    .trim()
    .min(4, 'O usuário deve ter pelo menos 4 caracteres.')
    .max(40, 'O usuário deve ter no máximo 40 caracteres.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou underline no usuário.'),
  senha: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(72, 'A senha deve ter no máximo 72 caracteres.')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter letras maiúsculas, minúsculas e números.'),
});

export const cadastroSchema = loginSchema
  .extend({
    confirmarSenha: z.string().min(8, 'Confirme a senha informada.'),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    path: ['confirmarSenha'],
    message: 'As senhas não conferem.',
  });
