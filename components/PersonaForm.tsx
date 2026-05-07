import React, { useMemo, useState } from 'react';
import { Allergy, ChronicDisease, CurrentMedication, PatientPersona, PatientPersonaFormData } from '../types';

interface Props {
  initialPersona?: PatientPersona | null;
  onSubmit: (data: PatientPersonaFormData) => Promise<void> | void;
  onCancel: () => void;
}

const emptyForm: PatientPersonaFormData = {
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

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const textToAllergies = (value: string): Allergy[] =>
  splitList(value).map((substance) => ({ id: substance, substance }));

const textToDiseases = (value: string): ChronicDisease[] =>
  splitList(value).map((name) => ({ id: name, name }));

const textToMedications = (value: string): CurrentMedication[] =>
  splitList(value).map((name) => ({ id: name, name }));

const PersonaForm: React.FC<Props> = ({ initialPersona, onSubmit, onCancel }) => {
  const initial = useMemo<PatientPersonaFormData>(
    () =>
      initialPersona
        ? {
            displayName: initialPersona.displayName,
            relationship: initialPersona.relationship,
            gender: initialPersona.gender || '',
            dateOfBirth: initialPersona.dateOfBirth || '',
            age: initialPersona.age,
            weightKg: initialPersona.weightKg,
            heightCm: initialPersona.heightCm,
            pregnancyStatus: initialPersona.pregnancyStatus || 'not_pregnant',
            breastfeedingStatus: initialPersona.breastfeedingStatus || 'not_breastfeeding',
            allergies: initialPersona.allergies,
            chronicDiseases: initialPersona.chronicDiseases,
            currentMedications: initialPersona.currentMedications,
            medicationHistory: initialPersona.medicationHistory || '',
            preferredLanguage: initialPersona.preferredLanguage || 'th',
            emergencyContact: initialPersona.emergencyContact || '',
            notes: initialPersona.notes || '',
          }
        : emptyForm,
    [initialPersona]
  );

  const [form, setForm] = useState(initial);
  const [allergyText, setAllergyText] = useState(initial.allergies.map((item) => item.substance).join(', '));
  const [diseaseText, setDiseaseText] = useState(initial.chronicDiseases.map((item) => item.name).join(', '));
  const [medicationText, setMedicationText] = useState(initial.currentMedications.map((item) => item.name).join(', '));
  const [error, setError] = useState('');

  const setField = (field: keyof PatientPersonaFormData, value: string | number | undefined) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.displayName.trim()) {
      setError('กรุณากรอกชื่อโปรไฟล์ผู้ป่วย');
      return;
    }

    setError('');
    await onSubmit({
      ...form,
      displayName: form.displayName.trim(),
      allergies: textToAllergies(allergyText),
      chronicDiseases: textToDiseases(diseaseText),
      currentMedications: textToMedications(medicationText),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-700">โปรไฟล์ผู้ป่วย</p>
          <h3 className="text-lg font-bold text-slate-800">{initialPersona ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก'}</h3>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
          ปิด
        </button>
      </div>

      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm font-semibold text-slate-700">
          ชื่อที่แสดง
          <input
            value={form.displayName}
            onChange={(event) => setField('displayName', event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
            placeholder="เช่น คุณแม่, น้องต้น"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          ความสัมพันธ์
          <select
            value={form.relationship}
            onChange={(event) => setField('relationship', event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-300"
          >
            <option value="myself">ตัวฉันเอง</option>
            <option value="father">พ่อ</option>
            <option value="mother">แม่</option>
            <option value="child">เด็ก</option>
            <option value="elderly">ผู้สูงอายุ</option>
            <option value="other">บุคคลอื่น</option>
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          เพศ
          <input
            value={form.gender || ''}
            onChange={(event) => setField('gender', event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
            placeholder="หญิง/ชาย/อื่น ๆ"
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
          น้ำหนัก (กก.)
          <input
            type="number"
            min="0"
            value={form.weightKg ?? ''}
            onChange={(event) => setField('weightKg', event.target.value ? Number(event.target.value) : undefined)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          ส่วนสูง (ซม.)
          <input
            type="number"
            min="0"
            value={form.heightCm ?? ''}
            onChange={(event) => setField('heightCm', event.target.value ? Number(event.target.value) : undefined)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          ตั้งครรภ์
          <select
            value={form.pregnancyStatus || ''}
            onChange={(event) => setField('pregnancyStatus', event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-300"
          >
            <option value="not_pregnant">ไม่ตั้งครรภ์</option>
            <option value="pregnant">ตั้งครรภ์</option>
            <option value="possible">อาจตั้งครรภ์</option>
            <option value="not_applicable">ไม่เกี่ยวข้อง</option>
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          ให้นมบุตร
          <select
            value={form.breastfeedingStatus || ''}
            onChange={(event) => setField('breastfeedingStatus', event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-emerald-300"
          >
            <option value="not_breastfeeding">ไม่ได้ให้นม</option>
            <option value="breastfeeding">ให้นมบุตร</option>
            <option value="not_applicable">ไม่เกี่ยวข้อง</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        ประวัติแพ้ยา
        <textarea
          value={allergyText}
          onChange={(event) => setAllergyText(event.target.value)}
          className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          placeholder="คั่นหลายรายการด้วย comma เช่น Penicillin, Ibuprofen"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        โรคประจำตัว
        <textarea
          value={diseaseText}
          onChange={(event) => setDiseaseText(event.target.value)}
          className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          placeholder="เช่น เบาหวาน, โรคไต, ความดันโลหิตสูง"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        ยาที่ใช้อยู่
        <textarea
          value={medicationText}
          onChange={(event) => setMedicationText(event.target.value)}
          className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          placeholder="เช่น Metformin, Warfarin, Amlodipine"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        หมายเหตุ
        <textarea
          value={form.notes || ''}
          onChange={(event) => setField('notes', event.target.value)}
          className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300"
          placeholder="ข้อมูลที่เภสัชกรควรรู้เพิ่มเติม"
        />
      </label>

      <button type="submit" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-100">
        บันทึกโปรไฟล์
      </button>
    </form>
  );
};

export default PersonaForm;
