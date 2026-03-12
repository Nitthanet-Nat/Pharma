
import React from 'react';
import { Medication } from '../types';

interface Props {
  med: Medication;
}

const MedicationCard: React.FC<Props> = ({ med }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          {med.type === 'pill' && (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          )}
          {med.type === 'syrup' && (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547" />
             </svg>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Task</span>
      </div>
      <h3 className="font-bold text-slate-800 text-lg">{med.name}</h3>
      <p className="text-sm text-slate-500 mb-4">{med.dosage} - {med.frequency}</p>
      <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-600 border border-slate-100">
        <span className="font-semibold text-slate-700">คำแนะนำ:</span> {med.instruction}
      </div>
    </div>
  );
};

export default MedicationCard;
