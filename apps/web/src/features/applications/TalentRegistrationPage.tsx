import { BackLink } from '../../components/BackLink';
import { Brand } from '../../components/Brand';
import { SubmissionForm } from './SubmissionForm';

export function TalentRegistrationPage() {
  return (
    <main className="public-job-details">
      <header className="public-form-header">
        <BackLink to="/vagas">Voltar às vagas</BackLink>
        <h1>Cadastro no banco de talentos</h1>
        <Brand />
      </header>
      <section className="public-job-information">
        <p>
          Compartilhe seu perfil com a Point Media para futuras oportunidades. A participação é
          voluntária e você pode sair pelo portal do candidato a qualquer momento.
        </p>
        <p>O cadastro será confirmado após o envio e a gravação da sua autorização.</p>
      </section>
      <SubmissionForm />
    </main>
  );
}
