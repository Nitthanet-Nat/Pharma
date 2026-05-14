import React from 'react';
import { PatientPersona } from '../types';
import { formatPersonaContext, getPersonaWarningBadges } from '../services/personaContext';

interface Props {
  persona?: PatientPersona | null;
}

const SHOW_AI_CONTEXT_DETAILS = false;

const PersonaHealthSummary: React.FC<Props> = ({ persona }) => {
  if (!persona) {
    return (
      <section className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        กรุณาเลือกโปรไฟล์ผู้ป่วยก่อนเริ่มปรึกษา เพื่อให้คำแนะนำปลอดภัยขึ้น
      </section>
    );
  }

  const badges = getPersonaWarningBadges(persona);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-700">ข้อควรระวัง</p>
          <h3 className="mt-1 text-lg font-bold text-slate-800">{persona.displayName}</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {persona.preferredLanguage || 'th'}
        </span>
      </div>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge} className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
              {badge}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="font-bold text-slate-700">ประวัติแพ้ยา</p>
          <p className="text-slate-500">{persona.allergies.map((item) => item.substance).join(', ') || 'ไม่มีข้อมูล'}</p>
        </div>
        <div>
          <p className="font-bold text-slate-700">โรคประจำตัว</p>
          <p className="text-slate-500">{persona.chronicDiseases.map((item) => item.name).join(', ') || 'ไม่มีข้อมูล'}</p>
        </div>
        <div>
          <p className="font-bold text-slate-700">ยาที่ใช้อยู่</p>
          <p className="text-slate-500">{persona.currentMedications.map((item) => item.name).join(', ') || 'ไม่มีข้อมูล'}</p>
        </div>
      </div>

      {SHOW_AI_CONTEXT_DETAILS && (
        <details className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-bold text-slate-700">ดูข้อความบริบทที่จะส่งให้ AI</summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans leading-relaxed">{formatPersonaContext(persona)}</pre>
        </details>
      )}
    </section>
  );
};

export default PersonaHealthSummary;
