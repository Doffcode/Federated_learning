import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Binary, TrendingDown, TrendingUp, Users } from 'lucide-react';
import KPICard from '../components/KPICard';

const API = 'http://localhost:3001';

const ModelInsights = () => {
  const [modelData, setModelData] = useState(null);
  const [loading,   setLoading]   = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/model`);
      setModelData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching model data', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-10 text-white">Loading Model Insights...</div>;

  const global   = modelData?.global   || {};
  const perType  = modelData?.perType  || [];
  const byModel  = global.byModel      || [];
  const flLive   = global.flLive       ?? false;
  const hasData  = global.totalUploads > 0;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Model Insights</h1>
        <p className="text-slate-400 font-medium italic">
          Real federated learning performance from device uploads.{' '}
          {flLive
            ? <span className="text-emerald-400 not-italic font-bold">● FL Backend Live</span>
            : <span className="text-slate-500 not-italic">FL backend offline</span>}
        </p>
      </div>

      {!hasData ? (
        <div className="bg-[#1e293b]/40 border border-white/10 p-16 rounded-3xl text-center">
          <p className="text-4xl mb-4">🤖</p>
          <h2 className="text-2xl font-bold text-white mb-3">No Model Data Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Open the mobile app, load demo data, go to the Predict tab and tap
            <strong className="text-white"> Train Local Model</strong>. Once at least 3 devices
            contribute, the global FL model will aggregate here.
          </p>
        </div>
      ) : (
        <>
          {/* Global KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <KPICard title="FL Rounds Completed"   value={global.totalRounds}                                   unit="rds"  icon={Binary}     color="blue"   />
            <KPICard title="Total Device Uploads"  value={global.totalUploads}                                  unit=""     icon={Users}      color="purple" />
            <KPICard title="Avg Upload Loss"       value={global.loss != null ? global.loss.toFixed(4) : '—'}   unit=""     icon={TrendingDown} color="red"  />
            <KPICard title="Avg Upload Accuracy"   value={global.accuracy != null ? (global.accuracy * 100).toFixed(1) : '—'} unit="%" icon={TrendingUp} color="emerald" />
          </div>

          {/* Per-model breakdown */}
          {byModel.length > 0 && (
            <div className="bg-[#1e293b]/40 border border-white/10 p-8 rounded-3xl mb-8">
              <h3 className="text-lg font-bold text-white mb-6">Per-Model Upload Stats (Real Data)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      <th className="pb-4">Vehicle Model</th>
                      <th className="pb-4">Uploads</th>
                      <th className="pb-4">Avg Accuracy</th>
                      <th className="pb-4">Avg Loss</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {byModel.map((m) => (
                      <tr key={m.model} className="border-b border-white/5 last:border-0">
                        <td className="py-5 text-white">{m.model}</td>
                        <td className="py-5 text-slate-300 font-mono">{m.uploads}</td>
                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1 bg-slate-800 rounded-full flex-shrink-0">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.avg_accuracy * 100}%` }} />
                            </div>
                            <span className="text-emerald-400 font-bold">{(m.avg_accuracy * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-5 text-red-400 font-mono">{m.avg_loss.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per vehicle-type status */}
          <div className="bg-[#1e293b]/40 border border-white/10 p-8 rounded-3xl">
            <h3 className="text-lg font-bold text-white mb-6">Fleet Type Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    <th className="pb-4">Vehicle Class</th>
                    <th className="pb-4">FL Round</th>
                    <th className="pb-4">Accuracy</th>
                    <th className="pb-4">Loss</th>
                    <th className="pb-4">Data Source</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {perType.map((m) => (
                    <tr key={m.type} className="border-b border-white/5 last:border-0">
                      <td className="py-5 text-white">{m.name}</td>
                      <td className="py-5 text-slate-300 font-mono">#{m.round}</td>
                      <td className="py-5">
                        {m.accuracy != null ? (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-1 bg-slate-800 rounded-full flex-shrink-0">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.accuracy * 100}%` }} />
                            </div>
                            <span className="text-emerald-400 font-bold">{(m.accuracy * 100).toFixed(1)}%</span>
                          </div>
                        ) : <span className="text-slate-600">No uploads</span>}
                      </td>
                      <td className="py-5 font-mono">
                        {m.loss != null
                          ? <span className="text-red-400">{m.loss.toFixed(4)}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          m.flDataLive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-500'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${m.flDataLive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {m.flDataLive ? 'Real FL Data' : 'No Data Yet'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelInsights;
