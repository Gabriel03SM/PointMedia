import { PasswordService } from './password.service';

describe('senhas', () => {
  const service = new PasswordService();
  it('usa Argon2id com salt individual e verifica a senha', async () => {
    const password = 'uma frase de acesso forte';
    const first = await service.hash(password);
    const second = await service.hash(password);
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
    expect(await service.verify(first, password)).toBe(true);
    expect(await service.verify(first, 'senha incorreta')).toBe(false);
  });
});
