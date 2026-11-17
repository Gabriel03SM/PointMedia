import { decimalInput, fromSaoPaulo, saoPauloInput } from './format';

describe('valores de formulário', () => {
  it('preserva centavos em valores brasileiros e decimais da API', () => {
    expect(decimalInput('R$ 3.500,50')).toBe('3500.50');
    expect(decimalInput('3500.50')).toBe('3500.50');
    expect(decimalInput('0,00')).toBe('0.00');
    expect(decimalInput('-1')).toBeNull();
    expect(decimalInput('1.2345')).toBeNull();
  });
  it('interpreta o encerramento em Brasília independentemente do fuso do navegador', () => {
    expect(fromSaoPaulo('2026-10-30T18:00')).toBe('2026-10-30T21:00:00.000Z');
    expect(saoPauloInput('2026-10-30T21:00:00.000Z')).toBe('2026-10-30T18:00');
  });
  it('recusa datas inexistentes', () => {
    expect(() => fromSaoPaulo('2026-02-30T10:00')).toThrow();
    expect(() => fromSaoPaulo('')).toThrow();
  });
});
