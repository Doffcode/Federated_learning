import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Battery, Radio, Target, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import KPICard from '../components/KPICard';

const API = 'http://localhost:3001';
const COLORS = ['#10b981', '#ef4444'];

const Dashboard = () => {
  const [data,    setData]    = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [dashRes, alertsRes] = await Promise.all([
        axios.get(`${API}/api/dashboard`),
        axios.get(`${API}/api/alerts`),
      ]);
      setData(dashRes.data);
      setAlerts(alertsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-white">Loading Dashboard...</div>;

  // Battery health pie — built from real per-fleet battery health
  const totalVehicles  = alerts.reduce((s, a) => s + (a.degradedCount || 0) + (a.avgBatteryHealth > 70 ? 1 : 0), 0);
  const totalDegraded  = alerts.reduce((s, a) => s + (a.degradedCount || 0), 0);
  const totalHealthy   = Math.max(0, data.activeDevices - totalDegraded);
  const batteryPieData = [
    { name: '> 70% Health (Good)', value: totalHealthy },
    { name: '< 70% Health (Degraded)', value: totalDegraded },
  ].filter(d => d.value > 0);

  // Service risk from real alerts
  const highRisk     = alerts.filter(a => a.serviceRisk === 'High').length;
  const moderateRisk = alerts.filter(a => a.serviceRisk === 'Moderate').length;
  const lowRisk      = alerts.filter(a => a.serviceRisk === 'Low').length;
  const total        = alerts.length || 1;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Fleet Overview</h1>
        <p className="text-slate-400 font-medium italic">
          Aggregated metrics from real FL device data.{' '}
          {data.flLive
            ? <span className="text-emerald-400 not-italic font-bold">● Live</span>
            : <span className="text-slate-500 not-italic">FL backend offline</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <KPICard title="Registered Vehicles"  value={data.activeDevices}                unit="devices" icon={Radio}     color="blue"   />
        <KPICard title="Avg Battery Health"   value={data.avgBatteryHealth.toFixed(1)} unit="%"       icon={Battery}   color="emerald" />
        <KPICard title="FL Model Uploads"     value={data.totalUploads}                unit="total"   icon={TrendingUp} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Battery health pie — real data */}
        <div className="bg-[#1e293b]/40 border border-white/10 p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-2">Battery Health Distribution</h3>
          <p className="text-xs text-slate-500 mb-6">Based on real vehicle health records from FL backend</p>
          {batteryPieData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={batteryPieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={75}
                    paddingAngle={5} dataKey="value"
                  >
                    {batteryPieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3 ml-4">
                {batteryPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-slate-400">{item.name}</span>
                    <span className="text-white ml-1">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No vehicle data yet — register vehicles via the mobile app
            </div>
          )}
        </div>

        {/* Service risk — derived from real battery health */}
        <div className="bg-[#1e293b]/40 border border-white/10 p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-2">Service Risk by Vehicle Type</h3>
          <p className="text-xs text-slate-500 mb-6">Derived from real average battery health per type</p>
          {alerts.length > 0 ? (
            <div className="space-y-5">
              {alerts.map(a => {
                const color = a.serviceRisk === 'High' ? '#ef4444' : a.serviceRisk === 'Moderate' ? '#f59e0b' : '#10b981';
                const textColor = a.serviceRisk === 'High' ? 'text-red-400' : a.serviceRisk === 'Moderate' ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={a.type}>
                    <div className="flex justify-between text-sm font-bold uppercase tracking-widest mb-2">
                      <span className="text-slate-300">{a.name}</span>
                      <span className={textColor}>{a.serviceRisk} — {a.avgBatteryHealth}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.avgBatteryHealth}%`, backgroundColor: color }} />
                    </div>
                    {a.degradedCount > 0 && (
                      <p className="text-xs text-red-400 mt-1">{a.degradedCount} vehicle(s) below 70% health</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500">
              No fleet data yet
            </div>
          )}
        </div>
      </div>

      {/* FL stats summary */}
      {data.flLive && (
        <div className="bg-[#1e293b]/40 border border-white/10 p-8 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-4">Global FL Model Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Completed Rounds</p>
              <p className="text-2xl font-black text-white">{data.totalRounds}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Uploads</p>
              <p className="text-2xl font-black text-white">{data.totalUploads}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Last Round Participants</p>
              <p className="text-2xl font-black text-white">{data.numParticipants}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Global Accuracy</p>
              <p className="text-2xl font-black text-emerald-400">
                {data.globalAccuracy !== null && data.globalAccuracy !== undefined
                  ? `${(data.globalAccuracy * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
