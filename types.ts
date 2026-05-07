
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instruction: string;
  type: 'pill' | 'syrup' | 'injection' | 'topical';
}

export interface HealthMetrics {
  date: string;
  bloodPressure: number;
  heartRate: number;
}

export type Relationship =
  | 'myself'
  | 'father'
  | 'mother'
  | 'child'
  | 'elderly'
  | 'other';

export interface Allergy {
  id: string;
  substance: string;
  reaction?: string;
  severity?: string;
  notes?: string;
}

export interface ChronicDisease {
  id: string;
  name: string;
  severity?: string;
  notes?: string;
}

export interface CurrentMedication {
  id: string;
  name: string;
  dose?: string;
  frequency?: string;
  notes?: string;
}

export interface PatientPersona {
  id: string;
  userId: string;
  displayName: string;
  relationship: Relationship | string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  pregnancyStatus?: string;
  breastfeedingStatus?: string;
  chronicDiseases: ChronicDisease[];
  allergies: Allergy[];
  currentMedications: CurrentMedication[];
  medicationHistory?: string;
  preferredLanguage?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PatientPersonaFormData = Omit<
  PatientPersona,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;
