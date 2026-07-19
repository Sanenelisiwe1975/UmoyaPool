import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import PortfolioPage from './pages/PortfolioPage';
import VaultsPage from './pages/VaultsPage';
import StokvelPage from './pages/StokvelPage';
import StrategiesPage from './pages/StrategiesPage';
import AgentsPage from './pages/AgentsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="/app" element={<PortfolioPage />} />
        <Route path="/app/vaults" element={<VaultsPage />} />
        <Route path="/app/stokvel" element={<StokvelPage />} />
        <Route path="/app/strategies" element={<StrategiesPage />} />
        <Route path="/app/agents" element={<AgentsPage />} />
      </Route>
    </Routes>
  );
}
