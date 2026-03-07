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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/tic-tac-toe" element={<TicTacToe />} />
        <Route path="/course-challenge" element={<CourseChallenge />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/solver" element={<SolverPage />} />
        <Route path="/generator" element={<GeneratorPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
      </Routes>
    </BrowserRouter>
  );
}
