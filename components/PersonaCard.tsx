import React from 'react';
import { PatientPersona } from '../types';
import { getPersonaAge, getPersonaWarningBadges, getRelationshipLabel } from '../services/personaContext';

interface Props {
  persona: PatientPersona;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const warningTone: Record<string, string> = {
  แพ้ยา: 'bg-rose-50 text-rose-700 border-rose-100',
  ตั้งครรภ์: 'bg-purple-50 text-purple-700 border-purple-100',
  ให้นมบุตร: 'bg-pink-50 text-pink-700 border-pink-100',
  เด็ก: 'bg-blue-50 text-blue-700 border-blue-100',
  ผู้สูงอายุ: 'bg-amber-50 text-amber-700 border-amber-100',
  โรคประจำตัว: 'bg-orange-50 text-orange-700 border-orange-100',
  ใช้ยาหลายชนิด: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PersonaCard: React.FC<Props> = ({ persona, isActive, onSelect, onEdit, onDelete }) => {
  const age = getPersonaAge(persona);
  const badges = getPersonaWarningBadges(persona);

  return (
    <article
      className={`rounded-3xl border bg-white p-4 shadow-sm transition-all ${
        isActive ? 'border-emerald-300 ring-4 ring-emerald-100' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-700">
            {persona.displayName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-slate-800">{persona.displayName}</h3>
              {isActive && (
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">
                  กำลังปรึกษา
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {getRelationshipLabel(persona.relationship)}
              {typeof age === 'number' ? ` • ${age} ปี` : ''}
              {persona.gender ? ` • ${persona.gender}` : ''}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
            แก้ไข
          </button>
          <button onClick={onDelete} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
            ลบ
          </button>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold ${warningTone[badge] || warningTone['ใช้ยาหลายชนิด']}`}
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-bold text-slate-700">ประวัติแพ้ยา</p>
          <p className="mt-1 text-slate-500">{persona.allergies.map((item) => item.substance).join(', ') || 'ไม่มีข้อมูล'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="font-bold text-slate-700">ยาที่ใช้อยู่</p>
          <p className="mt-1 text-slate-500">{persona.currentMedications.map((item) => item.name).join(', ') || 'ไม่มีข้อมูล'}</p>
        </div>
      </div>
    </article>
  );
};

export default PersonaCard;
