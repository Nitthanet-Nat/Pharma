import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { name: 'จ.', bp: 120, hr: 72 },
  { name: 'อ.', bp: 125, hr: 75 },
  { name: 'พ.', bp: 118, hr: 70 },
  { name: 'พฤ.', bp: 122, hr: 74 },
  { name: 'ศ.', bp: 121, hr: 71 },
  { name: 'ส.', bp: 119, hr: 69 },
  { name: 'อา.', bp: 120, hr: 72 }
];

const weeklySummary = [
  { label: 'ค่าเฉลี่ยความดัน', value: '120/78 mmHg' },
  { label: 'ชีพจรเฉลี่ย', value: '72 bpm' },
  { label: 'แนวโน้มโดยรวม', value: 'คงที่' }
];

const HealthStats: React.FC = () => {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Weekly Trend</p>
          <h3 className="mt-1 text-lg font-bold text-slate-800">แนวโน้มสุขภาพ 7 วัน</h3>
          <p className="mt-1 text-sm text-slate-500">ติดตามค่าความดันและชีพจรในสัปดาห์ล่าสุด</p>
        </div>
        <div className="flex space-x-4 text-xs font-semibold">
          <div className="flex items-center text-emerald-600">
            <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            ความดัน
          </div>
          <div className="flex items-center text-blue-600">
            <span className="mr-2 h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            ชีพจร
          </div>
        </div>
      </div>

      <div className="mt-5 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px -12px rgb(15 23 42 / 0.18)'
              }}
              formatter={(value: number, key: string) => [
                key === 'bp' ? `${value} mmHg` : `${value} bpm`,
                key === 'bp' ? 'ความดัน' : 'ชีพจร'
              ]}
            />
            <Area type="monotone" dataKey="bp" stroke="#10b981" fill="url(#colorBp)" strokeWidth={3} />
            <Area type="monotone" dataKey="hr" stroke="#3b82f6" fill="url(#colorHr)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {weeklySummary.map((item) => (
          <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HealthStats;
