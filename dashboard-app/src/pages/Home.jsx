import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import VehicleTypeCard from '../components/VehicleTypeCard';
import { LayoutGrid, RefreshCcw } from 'lucide-react';

const API = 'http://localhost:3001';

const Home = () => {
  const [vehicles, setVehicles] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        axios.get(`${API}/api/vehicles`),
        axios.get(`${API}/api/dashboard`),
      ]);
      setVehicles(vRes.data);
      setDashboard(dRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching fleet data', err);
    }
  };

  useEffect(() => {
    // Initial fetch fallback
    fetchData();

    // Connect to WebSocket server for real-time updates
    const socket = io(API);
    
    socket.on('connect', () => {
      console.log('Connected to real-time dashboard feed');
    });

    socket.on('dashboard_update', (payload) => {
      setVehicles(payload.vehicles);
      setDashboard(payload.dashboard);
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin text-blue-500">
          <RefreshCcw size={48} />
        </div>
      </div>
    );
  }

  const totalDevices   = vehicles.reduce((s, v) => s + v.count, 0);
  const flRound        = dashboard?.totalRounds ?? 0;
  const totalUploads   = dashboard?.totalUploads ?? 0;
  const globalAccuracy = dashboard?.globalAccuracy;
  const flLive         = dashboard?.flLive ?? false;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-blue-400 font-bold uppercase tracking-[0.2em] text-xs mb-4">
          <LayoutGrid size={16} />
          <span>Fleet Intelligence Summary</span>
          {flLive && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] border border-emerald-500/30">
              ● Live FL Data
            </span>
          )}
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
          Precision Fleet{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            Intelligence.
          </span>
        </h1>
        <p className="text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
          Monitor battery health across your electric vehicle fleet using
          privacy-preserving federated learning insights.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {vehicles.map((v) => (
          <VehicleTypeCard key={v.type} data={v} />
        ))}
      </div>

      <div className="mt-16 bg-[#1e293b]/30 border border-white/5 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Federated Learning Status</h2>
          <p className="text-slate-400 font-medium">
            {totalDevices > 0
              ? `Global model has received ${totalUploads} device upload${totalUploads !== 1 ? 's' : ''} from ${totalDevices} registered vehicle${totalDevices !== 1 ? 's' : ''}.`
              : 'No devices have contributed model updates yet. Load the mobile app and train a local model to start.'}
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">FL Rounds</p>
            <p className="text-xl font-black text-white">{flRound}</p>
          </div>
          <div className="px-6 py-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Model Uploads</p>
            <p className="text-xl font-black text-white">{totalUploads}</p>
          </div>
          {globalAccuracy !== null && globalAccuracy !== undefined && (
            <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Global Accuracy</p>
              <p className="text-xl font-black text-white">{(globalAccuracy * 100).toFixed(1)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
