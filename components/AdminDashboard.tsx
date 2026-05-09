import React, { useEffect, useMemo, useState } from 'react';
import { AdminPersona, AdminPersonaPayload, AdminUser, adminService } from '../services/adminService';
import { Allergy, ChronicDisease, CurrentMedication } from '../types';

const emptyPayload: AdminPersonaPayload = {
  userId: 'web-client-user',
  userEmail: '',
  userName: '',
  displayName: '',
  relationship: 'myself',
  gender: '',
  dateOfBirth: '',
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

const listText = (items: Array<{ substance?: string; name?: string }>) =>
  items.map((item) => item.substance || item.name).filter(Boolean).join(', ');

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toAllergies = (value: string): Allergy[] => splitList(value).map((substance) => ({ id: substance, substance }));
const toDiseases = (value: string): ChronicDisease[] => splitList(value).map((name) => ({ id: name, name }));
const toMedications = (value: string): CurrentMedication[] => splitList(value).map((name) => ({ id: name, name }));

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [personas, setPersonas] = useState<AdminPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminPersonaPayload>(emptyPayload);
  const [allergyText, setAllergyText] = useState('');
  const [diseaseText, setDiseaseText] = useState('');
  const [medicationText, setMedicationText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId) || null;

  const stats = useMemo(
    () => ({
      users: users.length,
      personas: personas.length,
      allergies: personas.reduce((total, persona) => total + persona.allergies.length, 0),
      meds: personas.reduce((total, persona) => total + persona.currentMedications.length, 0),
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

    setIsSaving(true);
    setError('');
    const payload: AdminPersonaPayload = {
      ...form,
      displayName: form.displayName.trim(),
      userId: form.userId?.trim() || 'web-client-user',
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
    const confirmed = window.confirm(`Delete ${persona.displayName}?`);
    if (!confirmed) return;
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Admin</p>
          <h2 className="text-2xl font-bold text-slate-800">หลังบ้านข้อมูลผู้ใช้</h2>
          <p className="mt-1 text-sm text-slate-500">ข้อมูลในหน้านี้ดึงจาก API และฐานข้อมูลจริงเท่านั้น</p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-60"
        >
          รีเฟรช
        </button>
      </div>

      {error && <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{stats.users}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Patient profiles</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{stats.personas}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Allergy records</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{stats.allergies}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Medication records</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{stats.meds}</p>
        </div>
      </section>

      <form onSubmit={submit} className="mb-5 space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-emerald-700">{selectedPersona ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}</p>
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
            User ID
            <input
              value={form.userId || ''}
              onChange={(event) => setField('userId', event.target.value)}
              disabled={Boolean(selectedPersona)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 disabled:text-slate-400"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            User name
            <input
              value={form.userName || ''}
              onChange={(event) => setField('userName', event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
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
            ความสัมพันธ์
            <select
              value={form.relationship}
              onChange={(event) => setField('relationship', event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-300"
            >
              <option value="myself">ตัวเอง</option>
              <option value="father">พ่อ</option>
              <option value="mother">แม่</option>
              <option value="child">เด็ก</option>
              <option value="elderly">ผู้สูงอายุ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            เพศ
            <input
              value={form.gender || ''}
              onChange={(event) => setField('gender', event.target.value)}
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
          <textarea
            value={allergyText}
            onChange={(event) => setAllergyText(event.target.value)}
            className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
            placeholder="Penicillin, Ibuprofen"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          โรคประจำตัว
          <textarea
            value={diseaseText}
            onChange={(event) => setDiseaseText(event.target.value)}
            className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
            placeholder="เบาหวาน, ความดัน"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          ยาที่ใช้ประจำ
          <textarea
            value={medicationText}
            onChange={(event) => setMedicationText(event.target.value)}
            className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
            placeholder="Metformin, Amlodipine"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          หมายเหตุ
          <textarea
            value={form.notes || ''}
            onChange={(event) => setField('notes', event.target.value)}
            className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-100 disabled:opacity-60"
        >
          {isSaving ? 'กำลังบันทึก...' : selectedPersona ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ป่วย'}
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">ข้อมูลผู้ป่วยทั้งหมด</h3>
          {isLoading && <span className="text-xs font-semibold text-slate-500">Loading...</span>}
        </div>

        {personas.map((persona) => (
          <article key={persona.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800">{persona.displayName}</h4>
                <p className="mt-1 text-xs text-slate-500">
                  {persona.user?.name || persona.userId} | {persona.user?.email || 'no email'} | อัปเดต {formatDate(persona.updatedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => editPersona(persona)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                  แก้ไข
                </button>
                <button onClick={() => removePersona(persona)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  ลบ
                </button>
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

        {!isLoading && personas.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
            ยังไม่มีข้อมูลในฐานข้อมูล
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
