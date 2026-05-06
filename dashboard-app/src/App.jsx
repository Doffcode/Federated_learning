import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ModelInsights from './pages/ModelInsights';
import Distributions from './pages/Distributions';
import AlertsSummary from './pages/AlertsSummary';
import SystemHealth from './pages/SystemHealth';
import VehicleTypeInsights from './pages/VehicleTypeInsights';

function App() {
  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/model" element={<ModelInsights />} />
          <Route path="/distributions" element={<Distributions />} />
          <Route path="/alerts" element={<AlertsSummary />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/vehicle/:type" element={<VehicleTypeInsights />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
