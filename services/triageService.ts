import { apiClient } from './apiClient';
import { CareRequestRecord } from '../types';

export const fetchTriageSessions = async (petId: string) => {
  return apiClient.get<CareRequestRecord[]>(`/api/triage/sessions?petId=${petId}`, { auth: true });
};

export const createTriageSession = async (payload: {
  petId: string;
  requestType: string;
  concern?: string | null;
  notes?: string | null;
  preferredTime?: string | null;
  phone?: string | null;
  location?: string | null;
  urgency?: string | null;
  reportType?: string | null;
}) => {
  return apiClient.post<CareRequestRecord>('/api/triage/sessions', payload, { auth: true });
};
