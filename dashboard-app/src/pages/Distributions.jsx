import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Layers,
  Battery,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

const Distributions = () => {
  const [dist, setDist] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/vehicles/tesla'); // Example type
      setDist(res.data.distributions);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching distributions", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-white">Loading Distributions...</div>;

  const BATT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Fleet Distributions</h1>
        <p className="text-slate-400 font-medium italic">Anonymized histograms mapping fleet performance across ranges.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-10">
        {/* Battery health distribution — real data from FL backend */}
        <div className="bg-[#1e293b]/40 border border-white/10 p-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Battery size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Battery Health Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real vehicle counts from FL backend fleet data</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist.battery}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {dist.battery.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BATT_COLORS[index % BATT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-8 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Health Thresholds (%) vs Device Count</p>
        </div>

        {/* Privacy info */}
        <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/10 p-10 rounded-3xl flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Layers size={28} className="text-blue-400" />
              <h3 className="text-2xl font-black text-white">Data Granularity Information</h3>
            </div>
            <p className="text-slate-400 font-medium leading-relaxed mb-6">
              Battery health distributions are derived from real vehicle records stored in the FL backend after each training round. No individual device telemetry leaves the device — only encrypted model weights are transmitted.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-mono text-blue-300">Differential Privacy: σ=0.3</div>
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-mono text-emerald-300">Local-only Computation</div>
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-mono text-purple-300">Zero-Identity Tracking</div>
            </div>
          </div>
          <div className="w-full md:w-64 bg-slate-900/50 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Sync Statistics</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Health Buckets</span>
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Poll Interval</span>
                <span className="text-white font-bold">30s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Noise Level</span>
                <span className="text-white font-bold">σ = 0.3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Distributions;
