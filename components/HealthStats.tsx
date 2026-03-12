
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const data = [
  { name: 'จ.', bp: 120, hr: 72 },
  { name: 'อ.', bp: 125, hr: 75 },
  { name: 'พ.', bp: 118, hr: 70 },
  { name: 'พฤ.', bp: 122, hr: 74 },
  { name: 'ศ.', bp: 121, hr: 71 },
  { name: 'ส.', bp: 119, hr: 69 },
  { name: 'อา.', bp: 120, hr: 72 },
];

const HealthStats: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800">สถิติสุขภาพสัปดาห์นี้</h2>
        <div className="flex space-x-4 text-xs font-semibold">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
            ความดัน
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
            ชีพจร
          </div>
        </div>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="bp" stroke="#10b981" fillOpacity={1} fill="url(#colorBp)" strokeWidth={3} />
            <Area type="monotone" dataKey="hr" stroke="#3b82f6" fill="transparent" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HealthStats;
