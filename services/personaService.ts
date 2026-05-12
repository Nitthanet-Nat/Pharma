import { PatientPersona, PatientPersonaFormData } from '../types';

const STORAGE_KEY = 'rsu-pharma-patient-personas';
const ACTIVE_KEY = 'rsu-pharma-active-patient-persona-id';
const USER_ID = 'demo-user';

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const createDefaultPersonas = (): PatientPersona[] => [
  {
    id: 'persona-demo',
    userId: USER_ID,
    displayName: 'ผู้ทดลองใช้งาน',
    relationship: 'myself',
    gender: '',
    age: undefined,
    pregnancyStatus: 'not_pregnant',
    breastfeedingStatus: 'not_breastfeeding',
    allergies: [],
    chronicDiseases: [],
    currentMedications: [],
    medicationHistory: '',
    preferredLanguage: 'th',
    emergencyContact: '',
    notes: 'โปรไฟล์ตัวอย่างสำหรับทดลองแชท ไม่บันทึกลงฐานข้อมูล',
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

  try {
    return JSON.parse(stored) as PatientPersona[];
  } catch {
    const defaults = createDefaultPersonas();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    localStorage.setItem(ACTIVE_KEY, defaults[0].id);
    return defaults;
  }
};

const writeLocalPersonas = (personas: PatientPersona[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
};

export const personaService = {
  async getAll(): Promise<PatientPersona[]> {
    return readLocalPersonas();
  },

  async getById(id: string): Promise<PatientPersona | null> {
    return readLocalPersonas().find((persona) => persona.id === id) || null;
  },

  async create(data: PatientPersonaFormData): Promise<PatientPersona> {
    const personas = readLocalPersonas();
    const persona: PatientPersona = {
      id: makeId(),
      userId: USER_ID,
      ...normalizeFormData(data),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeLocalPersonas([persona, ...personas]);
    if (!localStorage.getItem(ACTIVE_KEY)) localStorage.setItem(ACTIVE_KEY, persona.id);
    return persona;
  },

  async update(id: string, data: PatientPersonaFormData): Promise<PatientPersona> {
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
  },

  async delete(id: string): Promise<void> {
    const personas = readLocalPersonas().filter((persona) => persona.id !== id);
    writeLocalPersonas(personas);
    if (localStorage.getItem(ACTIVE_KEY) === id) {
      const nextActiveId = personas[0]?.id;
      if (nextActiveId) localStorage.setItem(ACTIVE_KEY, nextActiveId);
      else localStorage.removeItem(ACTIVE_KEY);
    }
  },

  async getActive(): Promise<string | null> {
    return localStorage.getItem(ACTIVE_KEY) || readLocalPersonas()[0]?.id || null;
  },

  async setActive(id: string): Promise<void> {
    localStorage.setItem(ACTIVE_KEY, id);
  },
};
