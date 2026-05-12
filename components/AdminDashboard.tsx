import React, { useEffect, useMemo, useState } from 'react';
import { AdminPersona, AdminPersonaPayload, AdminUser, adminService } from '../services/adminService';
import { Allergy, ChronicDisease, CurrentMedication } from '../types';

type AdminView = 'dashboard' | 'users' | 'patients';

const emptyPayload: AdminPersonaPayload = {
  userId: '',
  userEmail: '',
  userName: '',
  displayName: '',
  relationship: 'myself',
  gender: '',
  age: undefined,
  weightKg: undefined,
  heightCm: undefined,
  pregnancyStatus: 'not_pregnant',
  breastfeedingStatus: 'not_breastfeeding',
  allergies: [],
  chronicDiseases: [],
  currentMedications: [],
  medicationHistory: '',
  preferredLanguage: 'th',
  emergencyContact: '',
  notes: '',
};

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const toAllergies = (value: string): Allergy[] => splitList(value).map((substance) => ({ id: substance, substance }));
const toDiseases = (value: string): ChronicDisease[] => splitList(value).map((name) => ({ id: name, name }));
const toMedications = (value: string): CurrentMedication[] => splitList(value).map((name) => ({ id: name, name }));
const listText = (items: Array<{ substance?: string; name?: string }>) =>
  items.map((item) => item.substance || item.name).filter(Boolean).join(', ');

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AdminDashboard: React.FC = () => {
  const [view, setView] = useState<AdminView>('dashboard');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [personas, setPersonas] = useState<AdminPersona[]>([]);
  const [query, setQuery] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminPersonaPayload>(emptyPayload);
  const [allergyText, setAllergyText] = useState('');
  const [diseaseText, setDiseaseText] = useState('');
  const [medicationText, setMedicationText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId) || null;

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      [user.username, user.email, user.name, user.role].some((value) => value?.toLowerCase().includes(keyword))
    );
  }, [query, users]);

  const filteredPersonas = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return personas;
    return personas.filter((persona) =>
      [
        persona.displayName,
        persona.relationship,
        persona.user?.username,
        persona.user?.email,
        listText(persona.allergies),
        listText(persona.chronicDiseases),
        listText(persona.currentMedications),
      ].some((value) => value?.toLowerCase().includes(keyword))
    );
  }, [personas, query]);

  const stats = useMemo(
    () => ({
      users: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      personas: personas.length,
      riskyProfiles: personas.filter(
        (persona) =>
          persona.allergies.length > 0 ||
          persona.chronicDiseases.some((disease) => /ไต|kidney|pregnan|ตั้งครรภ์/i.test(disease.name))
      ).length,
      medications: personas.reduce((total, persona) => total + persona.currentMedications.length, 0),
      allergies: personas.reduce((total, persona) => total + persona.allergies.length, 0),
    }),
    [personas, users]
  );

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [loadedUsers, loadedPersonas] = await Promise.all([adminService.getUsers(), adminService.getPersonas()]);
      setUsers(loadedUsers);
      setPersonas(loadedPersonas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setSelectedPersonaId(null);
    setForm(emptyPayload);
    setAllergyText('');
    setDiseaseText('');
    setMedicationText('');
  };

  const editPersona = (persona: AdminPersona) => {
    setView('patients');
    setSelectedPersonaId(persona.id);
    setForm({
      userId: persona.userId,
      userEmail: persona.user?.email || '',
      userName: persona.user?.name || '',
      displayName: persona.displayName,
      relationship: persona.relationship,
      gender: persona.gender || '',
      dateOfBirth: persona.dateOfBirth || '',
      age: persona.age,
      weightKg: persona.weightKg,
      heightCm: persona.heightCm,
      pregnancyStatus: persona.pregnancyStatus || 'not_pregnant',
      breastfeedingStatus: persona.breastfeedingStatus || 'not_breastfeeding',
      allergies: persona.allergies,
      chronicDiseases: persona.chronicDiseases,
      currentMedications: persona.currentMedications,
      medicationHistory: persona.medicationHistory || '',
      preferredLanguage: persona.preferredLanguage || 'th',
      emergencyContact: persona.emergencyContact || '',
      notes: persona.notes || '',
    });
    setAllergyText(listText(persona.allergies));
    setDiseaseText(listText(persona.chronicDiseases));
    setMedicationText(listText(persona.currentMedications));
  };

  const setField = (field: keyof AdminPersonaPayload, value: string | number | undefined) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.displayName.trim()) {
      setError('กรุณากรอกชื่อผู้ป่วย');
      return;
    }
    if (!selectedPersonaId && !form.userId?.trim() && !form.userEmail?.trim()) {
      setError('กรุณาระบุ User ID หรือ Email ของเจ้าของข้อมูล');
      return;
    }

    setIsSaving(true);
    setError('');
    const payload: AdminPersonaPayload = {
      ...form,
      displayName: form.displayName.trim(),
      userId: form.userId?.trim(),
      allergies: toAllergies(allergyText),
      chronicDiseases: toDiseases(diseaseText),
      currentMedications: toMedications(medicationText),
    };

    try {
      if (selectedPersonaId) await adminService.updatePersona(selectedPersonaId, payload);
      else await adminService.createPersona(payload);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save patient data');
    } finally {
      setIsSaving(false);
    }
  };

  const removePersona = async (persona: AdminPersona) => {
    if (!window.confirm(`ลบข้อมูล ${persona.displayName}?`)) return;
    setError('');
    try {
      await adminService.deletePersona(persona.id);
      if (selectedPersonaId === persona.id) resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete patient data');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Admin Console</p>
          <h2 className="text-2xl font-bold text-slate-800">หลังบ้าน RSU Pharma</h2>
          <p className="mt-1 text-sm text-slate-500">ดูภาพรวม จัดการผู้ใช้ และตรวจสอบโปรไฟล์สุขภาพจากฐานข้อมูลจริง</p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-60"
        >
          รีเฟรช
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
        {[
          ['dashboard', 'Dashboard'],
          ['users', 'Users'],
          ['patients', 'Patients'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key as AdminView)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${view === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      {view === 'dashboard' && (
        <div className="space-y-5">
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Users</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">{stats.users}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Admins</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">{stats.admins}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Patient profiles</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">{stats.personas}</p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-semibold text-amber-700">Risk flags</p>
              <p className="mt-2 text-3xl font-bold text-amber-800">{stats.riskyProfiles}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">รายการที่ควรตรวจสอบ</h3>
            <div className="mt-4 space-y-3">
              {personas
                .filter((persona) => persona.allergies.length > 0 || persona.chronicDiseases.length > 0)
                .slice(0, 5)
                .map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => editPersona(persona)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left"
                  >
                    <p className="font-bold text-slate-800">{persona.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {persona.user?.email || persona.userId} | แพ้ยา {persona.allergies.length} | โรค {persona.chronicDiseases.length}
                    </p>
                  </button>
                ))}
              {!isLoading && personas.length === 0 && <p className="text-sm font-semibold text-slate-500">ยังไม่มีข้อมูล</p>}
            </div>
          </section>
        </div>
      )}

      {view === 'users' && (
        <div className="space-y-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-300"
            placeholder="ค้นหาชื่อ username email หรือ role"
          />
          {filteredUsers.map((user) => (
            <article key={user.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{user.name || user.username || user.email}</h3>
                  <p className="mt-1 text-xs text-slate-500">{user.username || '-'} | {user.email || '-'} | {formatDate(user.updatedAt)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {user.role}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-bold text-slate-700">Profiles</p>
                  <p className="mt-1 text-slate-500">{user.patientPersonas.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-bold text-slate-700">Active profile</p>
                  <p className="mt-1 truncate text-slate-500">{user.activePatientPersonaId || '-'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {view === 'patients' && (
        <div className="space-y-5">
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-700">{selectedPersona ? 'แก้ไขข้อมูลผู้ป่วย' : 'เพิ่มข้อมูลผู้ป่วย'}</p>
                <h3 className="text-lg font-bold text-slate-800">{selectedPersona?.displayName || 'Patient profile'}</h3>
              </div>
              {selectedPersona && (
                <button type="button" onClick={resetForm} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                  ยกเลิก
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm font-semibold text-slate-700">
                Owner User ID
                <input
                  value={form.userId || ''}
                  onChange={(event) => setField('userId', event.target.value)}
                  disabled={Boolean(selectedPersona)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 disabled:text-slate-400"
                  placeholder="ใช้ ID จากหน้า Users"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Owner name
                <input
                  value={form.userName || ''}
                  onChange={(event) => setField('userName', event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Owner email
                <input
                  value={form.userEmail || ''}
                  onChange={(event) => setField('userEmail', event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
                />
              </label>
              <label className="col-span-2 text-sm font-semibold text-slate-700">
                ชื่อผู้ป่วย
                <input
                  value={form.displayName}
                  onChange={(event) => setField('displayName', event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                อายุ
                <input
                  type="number"
                  min="0"
                  value={form.age ?? ''}
                  onChange={(event) => setField('age', event.target.value ? Number(event.target.value) : undefined)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                น้ำหนัก
                <input
                  type="number"
                  min="0"
                  value={form.weightKg ?? ''}
                  onChange={(event) => setField('weightKg', event.target.value ? Number(event.target.value) : undefined)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              แพ้ยา
              <textarea value={allergyText} onChange={(event) => setAllergyText(event.target.value)} className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              โรคประจำตัว
              <textarea value={diseaseText} onChange={(event) => setDiseaseText(event.target.value)} className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              ยาที่ใช้ประจำ
              <textarea value={medicationText} onChange={(event) => setMedicationText(event.target.value)} className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
            </label>

            <button type="submit" disabled={isSaving} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-60">
              {isSaving ? 'กำลังบันทึก...' : selectedPersona ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ป่วย'}
            </button>
          </form>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-300"
            placeholder="ค้นหาชื่อผู้ป่วย โรค ยา หรือ email"
          />

          {filteredPersonas.map((persona) => (
            <article key={persona.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800">{persona.displayName}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {persona.user?.username || persona.user?.email || persona.userId} | อัปเดต {formatDate(persona.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editPersona(persona)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">แก้ไข</button>
                  <button onClick={() => removePersona(persona)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">ลบ</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-800">
                  <p className="font-bold">แพ้ยา</p>
                  <p className="mt-1 text-emerald-700">{listText(persona.allergies) || '-'}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-800">
                  <p className="font-bold">โรค</p>
                  <p className="mt-1 text-blue-700">{listText(persona.chronicDiseases) || '-'}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-800">
                  <p className="font-bold">ยา</p>
                  <p className="mt-1 text-amber-700">{listText(persona.currentMedications) || '-'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
