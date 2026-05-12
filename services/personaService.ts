import { PatientPersona, PatientPersonaFormData } from '../types';

const STORAGE_KEY = 'rsu-pharma-patient-personas';
const ACTIVE_KEY = 'rsu-pharma-active-patient-persona-id';
const USER_ID = 'web-client-user';

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const createDefaultPersonas = (): PatientPersona[] => [
  {
    id: 'persona-self',
    userId: USER_ID,
    displayName: 'สมศรี ใจดี',
    relationship: 'myself',
    gender: 'หญิง',
    age: 34,
    weightKg: 58,
    heightCm: 160,
    pregnancyStatus: 'not_pregnant',
    breastfeedingStatus: 'not_breastfeeding',
    allergies: [{ id: 'allergy-penicillin', substance: 'Penicillin', reaction: 'ผื่นคัน', severity: 'ปานกลาง' }],
    chronicDiseases: [{ id: 'disease-bp', name: 'ความดันโลหิตสูง', severity: 'เล็กน้อย' }],
    currentMedications: [{ id: 'med-amlodipine', name: 'Amlodipine', dose: '5 mg', frequency: 'วันละครั้ง' }],
    medicationHistory: 'เคยใช้พาราเซตามอลได้',
    preferredLanguage: 'th',
    emergencyContact: '081-000-0000',
    notes: 'ติดตามความดันเป็นระยะ',
  },
  {
    id: 'persona-father',
    userId: USER_ID,
    displayName: 'คุณพ่อ',
    relationship: 'father',
    gender: 'ชาย',
    age: 68,
    weightKg: 70,
    heightCm: 168,
    pregnancyStatus: 'not_applicable',
    breastfeedingStatus: 'not_applicable',
    allergies: [],
    chronicDiseases: [
      { id: 'disease-diabetes', name: 'เบาหวานชนิดที่ 2', severity: 'ปานกลาง' },
      { id: 'disease-kidney', name: 'โรคไตเรื้อรัง', severity: 'ปานกลาง' },
    ],
    currentMedications: [
      { id: 'med-metformin', name: 'Metformin', dose: '500 mg', frequency: 'วันละ 2 ครั้งหลังอาหาร' },
      { id: 'med-losartan', name: 'Losartan', dose: '50 mg', frequency: 'วันละครั้ง' },
      { id: 'med-atorvastatin', name: 'Atorvastatin', dose: '20 mg', frequency: 'ก่อนนอน' },
    ],
    preferredLanguage: 'th',
    emergencyContact: '082-000-0000',
    notes: 'ผู้สูงอายุ มีโรคประจำตัว ควรระวังการใช้ยาใหม่',
  },
];

const normalizeFormData = (data: PatientPersonaFormData): PatientPersonaFormData => ({
  ...data,
  allergies: data.allergies.map((item) => ({ ...item, id: item.id || makeId() })).filter((item) => item.substance.trim()),
  chronicDiseases: data.chronicDiseases.map((item) => ({ ...item, id: item.id || makeId() })).filter((item) => item.name.trim()),
  currentMedications: data.currentMedications.map((item) => ({ ...item, id: item.id || makeId() })).filter((item) => item.name.trim()),
});

const readLocalPersonas = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const defaults = createDefaultPersonas();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    localStorage.setItem(ACTIVE_KEY, defaults[0].id);
    return defaults;
  }

  return JSON.parse(stored) as PatientPersona[];
};

const writeLocalPersonas = (personas: PatientPersona[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
};

const updateLocalPersona = (id: string, data: PatientPersonaFormData) => {
  const personas = readLocalPersonas();
  const existing = personas.find((persona) => persona.id === id);
  if (!existing) throw new Error('Patient persona not found');

  const updated: PatientPersona = {
    ...existing,
    ...normalizeFormData(data),
    updatedAt: new Date().toISOString(),
  };
  writeLocalPersonas(personas.map((persona) => (persona.id === id ? updated : persona)));
  return updated;
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Persona API failed with status ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json();
};

export const personaService = {
  async getAll(): Promise<PatientPersona[]> {
    try {
      return await requestJson<PatientPersona[]>(`/api/personas?userId=${encodeURIComponent(USER_ID)}`);
    } catch {
      return readLocalPersonas();
    }
  },

  async getById(id: string): Promise<PatientPersona | null> {
    try {
      return await requestJson<PatientPersona>(`/api/personas/${id}?userId=${encodeURIComponent(USER_ID)}`);
    } catch {
      return readLocalPersonas().find((persona) => persona.id === id) || null;
    }
  },

  async create(data: PatientPersonaFormData): Promise<PatientPersona> {
    const normalized = normalizeFormData(data);
    try {
      return await requestJson<PatientPersona>('/api/personas', {
        method: 'POST',
        body: JSON.stringify({ ...normalized, userId: USER_ID }),
      });
    } catch {
      const personas = readLocalPersonas();
      const persona: PatientPersona = {
        id: makeId(),
        userId: USER_ID,
        ...normalized,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeLocalPersonas([persona, ...personas]);
      if (!localStorage.getItem(ACTIVE_KEY)) localStorage.setItem(ACTIVE_KEY, persona.id);
      return persona;
    }
  },

  async update(id: string, data: PatientPersonaFormData): Promise<PatientPersona> {
    const normalized = normalizeFormData(data);
    try {
      return await requestJson<PatientPersona>(`/api/personas/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...normalized, userId: USER_ID }),
      });
    } catch {
      return updateLocalPersona(id, normalized);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await requestJson(`/api/personas/${id}`, { method: 'DELETE', body: JSON.stringify({ userId: USER_ID }) });
    } catch {
      const personas = readLocalPersonas().filter((persona) => persona.id !== id);
      writeLocalPersonas(personas);
      if (localStorage.getItem(ACTIVE_KEY) === id) {
        const nextActiveId = personas[0]?.id;
        if (nextActiveId) localStorage.setItem(ACTIVE_KEY, nextActiveId);
        else localStorage.removeItem(ACTIVE_KEY);
      }
    }
  },

  async getActive(): Promise<string | null> {
    try {
      const result = await requestJson<{ activePatientPersonaId: string | null }>(
        `/api/personas/active?userId=${encodeURIComponent(USER_ID)}`
      );
      return result.activePatientPersonaId;
    } catch {
      return localStorage.getItem(ACTIVE_KEY) || readLocalPersonas()[0]?.id || null;
    }
  },

  async setActive(id: string): Promise<void> {
    localStorage.setItem(ACTIVE_KEY, id);
    try {
      await requestJson('/api/personas/active', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, patientPersonaId: id }),
      });
    } catch {
      // The app can run without the persona API when login is disabled.
    }
  },
};
