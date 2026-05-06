import React from 'react';

const KPICard = ({ title, value, unit, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-emerald-400 bg-emerald-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
    red: 'text-red-400 bg-red-400/10',
  };

  return (
    <div className="bg-[#1e293b]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 font-medium text-sm uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        {unit && <span className="text-slate-500 font-medium text-sm">{unit}</span>}
      </div>
    </div>
  );
};

export default KPICard;
