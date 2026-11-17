import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { ProfilePage } from '../features/account/ProfilePage';
import { HomePage } from '../features/public/HomePage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CandidatePortal } from '../features/candidates/CandidatePortal';
import { CandidatesPage } from '../features/candidates/CandidatesPage';
import { JobsPage } from '../features/jobs/JobsPage';
import { JobDetailsPage } from '../features/jobs/PublicJobs';
import { PublicJobsPage } from '../features/jobs/PublicJobsPage';
import { ApplicationConfirmation } from '../features/applications/ApplicationConfirmation';
import { TalentRegistrationPage } from '../features/applications/TalentRegistrationPage';
import { ScreeningPage } from '../features/screening/ScreeningPage';
import { RecruitmentDashboard } from '../features/analytics/RecruitmentDashboard';
import { AdministrationDashboard } from '../features/analytics/AdministrationDashboard';
import { RouteAccessibility } from '../components/RouteAccessibility';

export function App() {
  return (
    <>
      <RouteAccessibility />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/vagas" element={<PublicJobsPage />} />
        <Route path="/vagas/:id" element={<JobDetailsPage />} />
        <Route path="/banco-de-talentos" element={<TalentRegistrationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['CANDIDATE']} />}>
          <Route path="/candidato" element={<CandidatePortal />} />
          <Route path="/candidaturas/:id/confirmacao" element={<ApplicationConfirmation />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']} />}>
          <Route path="/gestao/dashboard" element={<RecruitmentDashboard />} />
          <Route path="/gestao/vagas" element={<JobsPage />} />
          <Route path="/gestao/candidatos" element={<CandidatesPage />} />
          <Route path="/gestao/talentos" element={<CandidatesPage talent />} />
          <Route path="/gestao/triagem" element={<ScreeningPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdministrationDashboard />} />
          <Route path="/admin/metricas" element={<RecruitmentDashboard metrics />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
