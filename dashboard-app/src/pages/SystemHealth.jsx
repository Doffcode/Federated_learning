import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  Activity,
  Database,
  Cpu,
  Radio,
  CheckCircle
} from 'lucide-react';
import KPICard from '../components/KPICard';

const API = 'http://localhost:3001';

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/system`);
      setHealth(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching health data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-white">Loading System Health...</div>;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">System Health</h1>
        <p className="text-slate-400 font-medium italic">
          Operational status of the federated learning infrastructure.{' '}
          {health.flBackendOnline
            ? <span className="text-emerald-400 not-italic font-bold">● FL Backend Online</span>
            : <span className="text-red-400 not-italic font-bold">● FL Backend Offline</span>}
        </p>
      </div>

      {/* Real KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <KPICard title="Registered Devices" value={health.activeDevices} unit="nodes" icon={Cpu}      color="blue"   />
        <KPICard title="Total FL Uploads"   value={health.totalUploads}  unit=""      icon={Database}  color="purple" />
        <KPICard title="FL Rounds Done"     value={health.totalRounds}   unit="rds"   icon={Activity}  color="emerald"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FL backend status card */}
        <div className="bg-[#1e293b]/40 border border-white/10 p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Radio size={20} className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">FL Backend Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Connection</span>
              <span className={`font-bold text-sm ${health.flBackendOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                {health.flBackendOnline ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Total Device Uploads</span>
              <span className="text-white font-bold">{health.totalUploads}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">FL Rounds Completed</span>
              <span className="text-white font-bold">{health.totalRounds}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Last Checked</span>
              <span className="text-white font-mono text-xs">{new Date(health.lastUpdate).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Privacy architecture */}
        <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-white/5 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/20">
            <ShieldCheck size={40} />
          </div>
          <h3 className="text-2xl font-black text-white mb-3">Privacy Architecture</h3>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
            Federated learning — raw vehicle data never leaves the device. Only encrypted model weight gradients are transmitted to the aggregation server.
          </p>
          <div className="w-full space-y-4 text-left">
            {[
              { label: 'Raw data stays on-device', ok: true },
              { label: 'Differential privacy noise (σ=0.3)', ok: true },
              { label: 'L2 gradient clipping', ok: true },
              { label: 'Server-side aggregation only', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
