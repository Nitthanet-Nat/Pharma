import React from 'react';
import { PatientPersona } from '../types';
import PersonaCard from './PersonaCard';

interface Props {
  personas: PatientPersona[];
  activePersonaId?: string | null;
  onSelect: (id: string) => void;
  onEdit: (persona: PatientPersona) => void;
  onDelete: (id: string) => void;
}

const PersonaList: React.FC<Props> = ({ personas, activePersonaId, onSelect, onEdit, onDelete }) => {
  if (personas.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-center">
        <p className="font-bold text-emerald-800">ยังไม่มีโปรไฟล์ผู้ป่วย</p>
        <p className="mt-1 text-sm text-emerald-700">เพิ่มสมาชิกเพื่อให้ AI พิจารณาบริบทสุขภาพก่อนให้คำแนะนำ</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {personas.map((persona) => (
        <PersonaCard
          key={persona.id}
          persona={persona}
          isActive={persona.id === activePersonaId}
          onSelect={() => onSelect(persona.id)}
          onEdit={() => onEdit(persona)}
          onDelete={() => onDelete(persona.id)}
        />
      ))}
    </div>
  );
};

export default PersonaList;
