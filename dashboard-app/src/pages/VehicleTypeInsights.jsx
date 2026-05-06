import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Battery,
  BarChart3,
  TrendingDown,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import KPICard from '../components/KPICard';

const VehicleTypeInsights = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/vehicles/${type}`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vehicle insights", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [type]);

  if (loading) return <div className="p-10 text-white">Loading insights...</div>;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Fleet Overview</span>
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{data.name} Fleet Insights</h1>
          <p className="text-slate-400 font-medium">Aggregated performance from {data.count} active devices in the {data.models} category.</p>
        </div>
        <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Model Round</p>
          <p className="text-2xl font-black text-white">{data.currentRound}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <KPICard title="Avg Battery Health"  value={data.avgBatteryHealth.toFixed(1)}                                           unit="%"  icon={Battery}     color="emerald" />
        <KPICard title="Training Accuracy"   value={data.accuracy != null ? (data.accuracy * 100).toFixed(1) : '—'}             unit="%"  icon={BarChart3}   color="purple"  />
        <KPICard title="Training Loss"       value={data.loss      != null ? data.loss.toFixed(4)             : '—'}             unit=""   icon={TrendingDown} color="red"    />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-[#1e293b]/40 border border-white/5 p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-2">Battery Health Distribution</h3>
          <p className="text-xs text-slate-500 mb-6">Real vehicle counts from FL backend fleet records</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.distributions.battery}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {data.history && data.history.length > 0 ? (
          <div className="bg-[#1e293b]/40 border border-white/5 p-8 rounded-3xl">
            <h3 className="text-lg font-bold text-white mb-2">FL Round History</h3>
            <p className="text-xs text-slate-500 mb-6">Loss over training rounds</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history}>
                  <defs>
                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="round" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="loss" stroke="#ef4444" fillOpacity={1} fill="url(#colorLoss)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-[#1e293b]/40 border border-white/5 p-8 rounded-3xl flex items-center justify-center">
            <p className="text-slate-500 text-center">No training history yet — train a local model via the mobile app</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/10 border border-indigo-500/20 p-8 rounded-3xl">
        <div className="flex items-center gap-3 text-indigo-400 mb-6">
          <Bell size={24} />
          <h3 className="text-xl font-bold text-white">Federated Model Update Payload</h3>
        </div>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Differentially private weight gradients are aggregated here and broadcast back to client devices. Raw battery data never leaves the device.
        </p>
        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 font-mono text-xs text-indigo-300 space-y-4">
          <div>
            <p className="text-slate-500 mb-1 uppercase tracking-widest text-[9px]">Global Model Round</p>
            <p>#{data.currentRound}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1 uppercase tracking-widest text-[9px]">Avg Battery Health</p>
            <p className="text-emerald-300">{data.avgBatteryHealth.toFixed(1)}% across {data.count} devices</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1 uppercase tracking-widest text-[9px]">Privacy Noise Level</p>
            <p>ε = 0.3 (Gaussian, L2-clipped)</p>
          </div>
          {data.flDataLive && (
            <div>
              <p className="text-slate-500 mb-1 uppercase tracking-widest text-[9px]">Data Source</p>
              <p className="text-emerald-400">● Real FL data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleTypeInsights;
