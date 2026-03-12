
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
