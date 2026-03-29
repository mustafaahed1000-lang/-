import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Advisor from './pages/Advisor';
import Planner from './pages/Planner.tsx';
import Games from './pages/Games';
import TicTacToe from './pages/games/TicTacToe';
import ChatPage from './pages/ChatPage';
import CourseChallenge from './pages/CourseChallenge';
import FilesPage from './pages/FilesPage';
import SolverPage from './pages/SolverPage';
import GeneratorPage from './pages/GeneratorPage';
import FeaturesPage from './pages/FeaturesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import ContactPage from './pages/ContactPage';
import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/advisor" element={<AuthGuard><Advisor /></AuthGuard>} />
        <Route path="/planner" element={<AuthGuard><Planner /></AuthGuard>} />
        <Route path="/games" element={<AuthGuard><Games /></AuthGuard>} />
        <Route path="/games/tic-tac-toe" element={<AuthGuard><TicTacToe /></AuthGuard>} />
        <Route path="/course-challenge" element={<AuthGuard><CourseChallenge /></AuthGuard>} />
        <Route path="/chat" element={<AuthGuard><ChatPage /></AuthGuard>} />
        <Route path="/files" element={<AuthGuard><FilesPage /></AuthGuard>} />
        <Route path="/solver" element={<AuthGuard><SolverPage /></AuthGuard>} />
        <Route path="/generator" element={<AuthGuard><GeneratorPage /></AuthGuard>} />
        <Route path="/quiz-history" element={<AuthGuard><CourseChallenge /></AuthGuard>} />
        <Route path="/contact" element={<AuthGuard><ContactPage /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
}
