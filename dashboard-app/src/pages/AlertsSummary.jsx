import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, ShieldAlert, Battery, CheckCircle } from 'lucide-react';

const API = 'http://localhost:3001';

const AlertsSummary = () => {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/alerts`);
      setAlerts(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching alerts', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-white">Loading Alerts...</div>;

  // Compute summary from real data
  const highCount     = alerts.filter(a => a.serviceRisk === 'High').length;
  const moderateCount = alerts.filter(a => a.serviceRisk === 'Moderate').length;
  const lowCount      = alerts.filter(a => a.serviceRisk === 'Low').length;
  const totalDegraded = alerts.reduce((s, a) => s + (a.degradedCount || 0), 0);
  const flAlertCount  = alerts.filter(a => a.flAlert).length;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Aggregated Alerts</h1>
        <p className="text-slate-400 font-medium italic">
          Service risk levels derived from real battery health data via FL backend.
        </p>
      </div>

      {/* Summary cards — real counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-red-400 mb-4 font-bold uppercase tracking-widest text-[10px]">
            <ShieldAlert size={16} />
            <span>High Risk Types</span>
          </div>
          <p className="text-3xl font-black text-white">{highCount}</p>
          <p className="text-slate-500 text-xs mt-1">Vehicle types with battery &lt; 80%</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-amber-400 mb-4 font-bold uppercase tracking-widest text-[10px]">
            <AlertTriangle size={16} />
            <span>Moderate Risk Types</span>
          </div>
          <p className="text-3xl font-black text-white">{moderateCount}</p>
          <p className="text-slate-500 text-xs mt-1">Vehicle types with battery 80–90%</p>
        </div>

        <div className="bg-red-900/20 border border-red-900/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-red-300 mb-4 font-bold uppercase tracking-widest text-[10px]">
            <Battery size={16} />
            <span>Degraded Vehicles</span>
          </div>
          <p className="text-3xl font-black text-white">{totalDegraded}</p>
          <p className="text-slate-500 text-xs mt-1">Vehicles below 70% battery health</p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-emerald-400 mb-4 font-bold uppercase tracking-widest text-[10px]">
            <CheckCircle size={16} />
            <span>Stable Types</span>
          </div>
          <p className="text-3xl font-black text-white">{lowCount}</p>
          <p className="text-slate-500 text-xs mt-1">Vehicle types with battery &gt; 90%</p>
        </div>
      </div>

      {/* Per-fleet table */}
      <div className="bg-[#1e293b]/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Per-Fleet Warning Metrics</h3>
          {alerts.some(a => a.flDataLive) && (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">
              ● Real FL Data
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            No vehicle data yet — register vehicles and train local models via the mobile app.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-8 py-5">Vehicle Class</th>
                <th className="px-8 py-5">Avg Battery Health</th>
                <th className="px-8 py-5">Degraded Vehicles</th>
                <th className="px-8 py-5">Service Risk</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {alerts.map((a) => {
                const riskColor =
                  a.serviceRisk === 'High'     ? { bg: 'bg-red-500/20',    text: 'text-red-400'    } :
                  a.serviceRisk === 'Moderate' ? { bg: 'bg-amber-500/20',  text: 'text-amber-400'  } :
                                                 { bg: 'bg-emerald-500/20',text: 'text-emerald-400'};
                return (
                  <tr key={a.type} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-white group-hover:text-blue-400 transition-colors font-bold">{a.name}</div>
                      <div className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-widest">{a.type}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${a.avgBatteryHealth}%`,
                              backgroundColor: a.avgBatteryHealth > 90 ? '#10b981' : a.avgBatteryHealth > 80 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-white font-bold">{a.avgBatteryHealth}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`font-bold ${a.degradedCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {a.degradedCount}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${riskColor.bg} ${riskColor.text}`}>
                        {a.serviceRisk}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        a.flAlert ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${a.flAlert ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`} />
                        {a.flAlert ? 'Alert' : 'Stable'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AlertsSummary;
