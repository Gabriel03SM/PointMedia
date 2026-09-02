import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { TalentRegisterPage } from './pages/TalentRegisterPage';
import { CandidatePortalPage } from './pages/CandidatePortalPage';
import { RecruiterDashboardPage } from './pages/RecruiterDashboardPage';
import { JobsManagementPage } from './pages/JobsManagementPage';
import { JobRankingPage } from './pages/JobRankingPage';
import { TalentPoolPage } from './pages/TalentPoolPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RecruiterSidebar } from './components/RecruiterSidebar';
import './App.css';

function Layout() {
  const location = useLocation();
  const isRecruiterArea = location.pathname.startsWith('/recruiter');

  return (
    <div className={isRecruiterArea ? 'recruiter-app' : 'public-app'}>
      {!isRecruiterArea && <Navbar />}
      {isRecruiterArea && <RecruiterSidebar />}
      <main className={isRecruiterArea ? 'recruiter-main' : 'public-main'}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/vagas/:id" element={<JobDetailsPage />} />
          <Route path="/talentos/cadastro" element={<TalentRegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Candidate Portal */}
          <Route path="/candidato/painel" element={<CandidatePortalPage />} />

          {/* Recruiter / Admin Portal */}
          <Route path="/recruiter/dashboard" element={<RecruiterDashboardPage />} />
          <Route path="/recruiter/jobs" element={<JobsManagementPage />} />
          <Route path="/recruiter/jobs/:id/ranking" element={<JobRankingPage />} />
          <Route path="/recruiter/talent-pool" element={<TalentPoolPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isRecruiterArea && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
