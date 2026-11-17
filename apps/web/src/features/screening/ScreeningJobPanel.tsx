import { Link } from 'react-router-dom';
import type { Job } from '@pointmedia/shared';
import { ScreeningControls } from './ScreeningControls';
import { ScreeningResults } from './ScreeningResults';
export function ScreeningJobPanel({ job }: { job: Job }) {
  return (
    <>
      <h2>Candidatos rankeados</h2>
      <ScreeningControls job={job} />
      <Link className="button secondary" to={`/gestao/triagem?vaga=${job.id}`}>
        Abrir triagem completa
      </Link>
      <ScreeningResults job={job} compact />
    </>
  );
}
