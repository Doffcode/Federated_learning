import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  Car,
  Truck,
  ChevronRight,
  Battery,
  Users
} from 'lucide-react';

const VehicleTypeCard = ({ data }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [data.type]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`http://localhost:8001/api/users-by-vehicle-type?vehicle_type=${data.type}`);
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoadingUsers(false);
  };
  
  const iconMap = {
    ebike: Bike,
    tesla: Car,
    bmw: Car,
    nexon: Truck,
  };

  const colorMap = {
    green: 'from-emerald-400/20 to-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'from-red-400/20 to-red-500/10 border-red-500/20 text-red-400',
    blue: 'from-blue-400/20 to-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'from-purple-400/20 to-purple-500/10 border-purple-500/20 text-purple-400',
  };

  const Icon = iconMap[data.type] || Car;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${colorMap[data.color]} border backdrop-blur-md rounded-3xl p-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl group`}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-white/10 rounded-2xl">
          <Icon size={28} />
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{data.count} Devices</span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{data.name}</h3>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-tight">{data.models}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Battery size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Avg Health</span>
          </div>
          <p className="text-xl font-bold text-white leading-none">{data.avgBatteryHealth.toFixed(1)} <span className="text-sm font-medium text-slate-500">%</span></p>
        </div>
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Active Users</span>
          </div>
          <p className="text-xl font-bold text-white leading-none">{users.length} <span className="text-sm font-medium text-slate-500">users</span></p>
        </div>
      </div>

      {/* Users List */}
      {users.length > 0 && (
        <div className="mb-6 bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Active Contributors</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="text-sm border-l-2 border-white/10 pl-3 py-1">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-slate-500 text-xs">{user.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={() => navigate(`/vehicle/${data.type}`)}
        className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 font-bold py-4 rounded-2xl transition-all duration-300 hover:bg-slate-200 active:scale-95"
      >
        <span>View Insights</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default VehicleTypeCard;
