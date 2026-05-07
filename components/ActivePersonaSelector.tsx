import React from 'react';
import { PatientPersona } from '../types';
import { getPersonaAge, getPersonaWarningBadges } from '../services/personaContext';

interface Props {
  personas: PatientPersona[];
  activePersonaId?: string | null;
  onChange: (id: string) => void;
}

const ActivePersonaSelector: React.FC<Props> = ({ personas, activePersonaId, onChange }) => {
  const activePersona = personas.find((persona) => persona.id === activePersonaId) || personas[0];
  const badges = activePersona ? getPersonaWarningBadges(activePersona) : [];
  const age = activePersona ? getPersonaAge(activePersona) : undefined;

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
      <label className="text-xs font-bold text-emerald-700">เลือกผู้ป่วยที่ต้องการปรึกษา</label>
      <select
        value={activePersona?.id || ''}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.displayName}
          </option>
        ))}
      </select>
      {activePersona && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{typeof age === 'number' ? `${age} ปี` : 'ไม่ระบุอายุ'}</span>
          <span>•</span>
          <span>{activePersona.gender || 'ไม่ระบุเพศ'}</span>
          {badges.map((badge) => (
            <span key={badge} className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
              {badge}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default ActivePersonaSelector;
