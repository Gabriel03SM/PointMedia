import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';
import type { IntelligenceStatus } from '@pointmedia/shared';

// Somente extrações com trechos literais podem atravessar esta fronteira.
const extractionSchema = z
  .object({
    excerpts: z.array(z.string().min(1).max(1000)).max(10),
    skills: z
      .array(
        z
          .object({ name: z.string().min(1).max(80), evidence: z.string().min(1).max(1000) })
          .strict(),
      )
      .max(40),
  })
  .strict();
export type ResumeExtraction = z.infer<typeof extractionSchema>;
function mentionsSkill(evidence: string, name: string) {
  const text = evidence.toLocaleLowerCase('pt-BR');
  const skill = name.toLocaleLowerCase('pt-BR');
  if (!skill.trim()) return false;
  let index = text.indexOf(skill);
  while (index >= 0) {
    if (
      !/[\p{L}\p{N}+#.]$/u.test(text.slice(0, index)) &&
      !/^(?:[\p{L}\p{N}+#]|\.[\p{L}\p{N}])/u.test(text.slice(index + skill.length))
    )
      return true;
    index = text.indexOf(skill, index + 1);
  }
  return false;
}
export abstract class IntelligenceProvider {
  abstract status(): IntelligenceStatus;
  abstract extract(source: string): Promise<unknown>;
}

@Injectable()
export class DisabledIntelligenceProvider extends IntelligenceProvider {
  status(): IntelligenceStatus {
    return { available: false, provider: null, reason: 'Nenhum provedor de IA configurado.' };
  }
  async extract(): Promise<never> {
    throw new ServiceUnavailableException(
      'Análise por IA indisponível. A triagem determinística continua disponível.',
    );
  }
}

export function validateExtraction(source: string, output: unknown): ResumeExtraction {
  const parsed = extractionSchema.parse(output);
  for (const excerpt of parsed.excerpts)
    if (!source.includes(excerpt)) throw new Error('Resumo sem evidência na fonte.');
  for (const skill of parsed.skills)
    if (!source.includes(skill.evidence) || !mentionsSkill(skill.evidence, skill.name))
      throw new Error('Competência sem evidência na fonte.');
  return parsed;
}

@Injectable()
export class IntelligenceService {
  constructor(private readonly provider: IntelligenceProvider) {}
  status() {
    return this.provider.status();
  }
  async extract(source: string) {
    if (!this.status().available)
      throw new ServiceUnavailableException('Análise por IA não configurada.');
    const input = z.string().min(1).max(100000).parse(source);
    const output = await this.provider.extract(input);
    // Fonte nunca é executada nem recebida como instrução pelo serviço principal.
    return validateExtraction(input, output);
  }
}
