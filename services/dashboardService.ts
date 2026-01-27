import { apiClient } from './apiClient';
import {
  ActivityLogRecord,
  CareRequestRecord,
  DashboardSummary,
  DashboardVitals,
  DietLogRecord,
  MedicalEventRecord,
  ParentFeedbackRecord,
  PetUpdateRecord,
  SymptomLogRecord
} from '../types';

export const fetchDashboardSummary = async (petId: string, range: string) => {
  return apiClient.get<DashboardSummary>(`/api/dashboard/summary?petId=${petId}&range=${range}`, { auth: true });
};

export const fetchDashboardVitals = async (petId: string, rangeDays: number) => {
  return apiClient.get<DashboardVitals>(`/api/dashboard/vitals?petId=${petId}&rangeDays=${rangeDays}`, { auth: true });
};

export const fetchPetUpdates = async (petId: string, rangeDays = 30) => {
  return apiClient.get<PetUpdateRecord[]>(`/api/pet/updates?petId=${petId}&rangeDays=${rangeDays}`, { auth: true });
};

export const createPetUpdate = async (payload: {
  petId: string;
  updateDate?: string;
  weightValue?: number | null;
  weightUnit?: string | null;
  dietType?: string | null;
  activityLevel?: string | null;
  notes?: string | null;
}) => {
  return apiClient.post<PetUpdateRecord>('/api/pet/updates', payload, { auth: true });
};

export const fetchActivityLogs = async (petId: string, rangeDays = 30) => {
  return apiClient.get<ActivityLogRecord[]>(`/api/activity/logs?petId=${petId}&rangeDays=${rangeDays}`, { auth: true });
};

export const createActivityLog = async (payload: {
  petId: string;
  activityType: string;
  durationMinutes: number;
  intensity?: string | null;
  notes?: string | null;
  occurredAt?: string;
}) => {
  return apiClient.post<ActivityLogRecord>('/api/activity/logs', payload, { auth: true });
};

export const createDietLog = async (payload: {
  petId: string;
  logDate?: string;
  mealType?: string | null;
  dietType?: string | null;
  actualFood?: string | null;
  deviation?: boolean | null;
}) => {
  return apiClient.post<DietLogRecord>('/api/diet/logs', payload, { auth: true });
};

export const fetchDietLogs = async (petId: string, rangeDays = 90) => {
  return apiClient.get<DietLogRecord[]>(`/api/diet/logs?petId=${petId}&rangeDays=${rangeDays}`, { auth: true });
};

export const createMedicalEvent = async (payload: {
  petId: string;
  eventType: string;
  dateAdministered?: string | null;
  nextDue?: string | null;
  verifiedBy?: string | null;
  notes?: string | null;
}) => {
  return apiClient.post<MedicalEventRecord>('/api/medical/events', payload, { auth: true });
};

export const createSymptomLog = async (payload: {
  petId: string;
  symptomType: string;
  occurredAt?: string;
  severity?: number | null;
  notes?: string | null;
}) => {
  return apiClient.post<SymptomLogRecord>('/api/symptoms', payload, { auth: true });
};

export const createParentFeedback = async (payload: {
  petId: string;
  rating?: number | null;
  category?: string | null;
  sentiment?: string | null;
  message?: string | null;
  tags?: string[] | null;
  source?: string | null;
  status?: string | null;
}) => {
  return apiClient.post<ParentFeedbackRecord>('/api/feedback', payload, { auth: true });
};

export const createCareRequest = async (payload: {
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
  return apiClient.post<CareRequestRecord>('/api/care/requests', payload, { auth: true });
};

export const fetchCareRequests = async (petId: string) => {
  return apiClient.get<CareRequestRecord[]>(`/api/care/requests?petId=${petId}`, { auth: true });
};
