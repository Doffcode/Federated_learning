import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Settings, 
  AlertTriangle, 
  Cpu, 
  Activity, 
  Home,
  ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Dashboard', icon: Activity, path: '/dashboard' },
    { name: 'Model Insights', icon: Cpu, path: '/model' },
    { name: 'Distributions', icon: BarChart3, path: '/distributions' },
    { name: 'Alerts Summary', icon: AlertTriangle, path: '/alerts' },
    { name: 'System Health', icon: ShieldCheck, path: '/health' },
  ];

  return (
    <div className="w-64 bg-[#1e293b]/80 backdrop-blur-md border-r border-white/5 flex flex-col h-screen fixed sticky top-0 left-0">
      <div className="p-8">
        <h1 className="text-xl font-bold flex items-center gap-3 text-white">
          <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20">
            <Activity size={24} />
          </div>
          <span>Fleet Intel</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
              ${isActive 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            <item.icon size={20} />
            <span className="font-medium tracking-wide">{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-6 border-t border-white/5">
        <div className="bg-[#0f172a]/50 p-4 rounded-2xl flex items-center gap-3 border border-white/10">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
             <Settings size={20} className="text-slate-400" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-300">Fleet Admin</p>
            <p className="text-slate-500 text-xs">V3.4.1 Alpha</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
