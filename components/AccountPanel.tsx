import React from 'react';
import { AuthUser, PatientPersona } from '../types';

interface Props {
  user: AuthUser;
  personas: PatientPersona[];
}

const AccountPanel: React.FC<Props> = ({ user, personas }) => {
  const allergyCount = personas.reduce((total, persona) => total + persona.allergies.length, 0);
  const diseaseCount = personas.reduce((total, persona) => total + persona.chronicDiseases.length, 0);
  const medicationCount = personas.reduce((total, persona) => total + persona.currentMedications.length, 0);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Account</p>
        <h2 className="text-2xl font-bold text-slate-800">บัญชีของฉัน</h2>
        <p className="mt-1 text-sm text-slate-500">ข้อมูลการเข้าสู่ระบบและภาพรวมข้อมูลสุขภาพที่เชื่อมกับบัญชีนี้</p>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">Signed in as</p>
            <h3 className="mt-1 text-xl font-bold text-slate-800">{user.name || user.username || user.email}</h3>
            <p className="mt-1 text-sm text-slate-500">{user.email || 'No email'}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{user.role}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Username</p>
            <p className="mt-1 font-bold text-slate-800">{user.username || '-'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">User ID</p>
            <p className="mt-1 truncate font-bold text-slate-800">{user.id}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Patient profiles</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{personas.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Medications</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{medicationCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Allergies</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{allergyCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Chronic diseases</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{diseaseCount}</p>
        </div>
      </section>
    </div>
  );
};

export default AccountPanel;
