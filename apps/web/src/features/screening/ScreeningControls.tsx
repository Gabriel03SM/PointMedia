import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Job, ScreeningSettings } from '@pointmedia/shared';
import { api } from '../../lib/api';
import { Feedback } from '../../components/Feedback';
import './screening.css';

function ConfigurationForm({
  initial,
  version,
  pending,
  onSave,
}: {
  initial: ScreeningSettings;
  version: number;
  pending: boolean;
  onSave: (settings: ScreeningSettings) => void;
}) {
  const [values, setValues] = useState<ScreeningSettings>(() => ({
    skillsWeight: initial.skillsWeight,
    seniorityWeight: initial.seniorityWeight,
    salaryWeight: initial.salaryWeight,
    mandatorySkillsShare: initial.mandatorySkillsShare,
    requireCompleteData: initial.requireCompleteData,
  }));
  const [error, setError] = useState<string>();
  const fields = [
    ['skillsWeight', 'Tecnologias (%)'],
    ['seniorityWeight', 'Senioridade (%)'],
    ['salaryWeight', 'Salário (%)'],
    ['mandatorySkillsShare', 'Indispensáveis dentro de tecnologias (%)'],
  ] as const;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (values.skillsWeight + values.seniorityWeight + values.salaryWeight !== 100) {
          setError('A soma dos três critérios deve ser 100%.');
          return;
        }
        if (
          fields.some(
            ([key]) => !Number.isInteger(values[key]) || values[key] < 0 || values[key] > 100,
          )
        ) {
          setError('Use percentuais inteiros entre 0 e 100.');
          return;
        }
        setError(undefined);
        onSave(values);
      }}
    >
      <fieldset className="screening-weights" disabled={pending}>
        <legend>Pesos e critérios por vaga</legend>
        {fields.map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={values[key]}
              onChange={(event) => setValues({ ...values, [key]: Number(event.target.value) })}
            />
          </label>
        ))}
        <label className="screening-complete">
          <input
            type="checkbox"
            checked={values.requireCompleteData}
            onChange={(event) =>
              setValues({ ...values, requireCompleteData: event.target.checked })
            }
          />
          Aguardar dados completos dos critérios aplicáveis antes de calcular a nota
        </label>
        <p className="hint">
          Indispensáveis não declarados pedem confirmação humana. Nenhuma nota aprova ou elimina
          candidatos automaticamente.
        </p>
        <Feedback message={error} error />
        <button className="button secondary" disabled={pending}>
          {pending
            ? 'Salvando…'
            : version
              ? 'Salvar nova versão dos critérios'
              : 'Salvar critérios iniciais'}
        </button>
      </fieldset>
    </form>
  );
}
export function ScreeningControls({ job }: { job: Job }) {
  const cache = useQueryClient();
  const [notice, setNotice] = useState<string>();
  const configuration = useQuery({
    queryKey: ['screening', job.id, 'configuration'],
    queryFn: ({ signal }) => api.screeningConfiguration(job.id, signal),
    staleTime: 0,
  });
  const save = useMutation({
    mutationFn: (values: ScreeningSettings) =>
      api.saveScreeningConfiguration(job.id, {
        ...values,
        version: configuration.data?.configuration?.version ?? 0,
      }),
    onSuccess: async () => {
      setNotice('Critérios salvos. Gere o ranking para aplicar esta versão.');
      await cache.invalidateQueries({ queryKey: ['screening', job.id] });
    },
  });
  const generate = useMutation({
    mutationFn: () =>
      api.generateScreening(job.id, configuration.data!.configuration!.version, job.version),
    onSuccess: async (run) => {
      setNotice(
        `Ranking gerado. Execução ${run.sequence}, critérios versão ${run.configurationVersion}.`,
      );
      await cache.invalidateQueries({ queryKey: ['screening', job.id] });
    },
  });
  if (configuration.isPending) return <p role="status">Carregando critérios…</p>;
  if (configuration.isError)
    return (
      <>
        <Feedback message={configuration.error.message} error />
        <button className="button secondary" onClick={() => void configuration.refetch()}>
          Tentar novamente
        </button>
      </>
    );
  const current = configuration.data.configuration;
  return (
    <section className="screening-controls">
      <details>
        <summary>
          Configurar pesos {current ? `— versão ${current.version}` : '— ainda não salvos'}
        </summary>
        <ConfigurationForm
          key={current?.id ?? 'new'}
          initial={current ?? configuration.data.defaults}
          version={current?.version ?? 0}
          pending={save.isPending || generate.isPending}
          onSave={(values) => save.mutate(values)}
        />
      </details>
      <p className="hint">
        {current
          ? `Critérios versão ${current.version} · algoritmo ${current.algorithmVersion}`
          : 'Salve os critérios iniciais antes de gerar.'}
      </p>
      <Feedback message={notice} />
      <Feedback message={save.error?.message ?? generate.error?.message} error />
      <button
        className="button"
        disabled={!current || save.isPending || generate.isPending}
        onClick={() => generate.mutate()}
      >
        {generate.isPending ? 'Processando…' : 'Gerar ou reprocessar ranking'}
      </button>
    </section>
  );
}
