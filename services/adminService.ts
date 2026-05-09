import { PatientPersona, PatientPersonaFormData } from '../types';

export interface AdminUser {
  id: string;
  email?: string | null;
  name?: string | null;
  activePatientPersonaId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patientPersonas: PatientPersona[];
}

export interface AdminPersona extends PatientPersona {
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
    activePatientPersonaId?: string | null;
  };
}

export type AdminPersonaPayload = PatientPersonaFormData & {
  userId?: string;
  userEmail?: string;
  userName?: string;
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

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message =
      error && typeof error === 'object' && 'error' in error
        ? String((error as { error?: unknown }).error)
        : `Admin API failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
};

export const adminService = {
  getUsers() {
    return requestJson<AdminUser[]>('/api/admin/users');
  },

  getPersonas() {
    return requestJson<AdminPersona[]>('/api/admin/personas');
  },

  createPersona(data: AdminPersonaPayload) {
    return requestJson<AdminPersona>('/api/admin/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePersona(id: string, data: AdminPersonaPayload) {
    return requestJson<AdminPersona>(`/api/admin/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePersona(id: string) {
    return requestJson<void>(`/api/admin/personas/${id}`, {
      method: 'DELETE',
    });
  },
};
