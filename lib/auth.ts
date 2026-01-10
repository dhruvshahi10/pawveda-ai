import { UserState } from '../types';
import { STORAGE_KEYS } from './config';
import { storage } from './storage';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
}

const restoreActivities = (activities: UserState['activities']) =>
  activities.map(activity => ({ ...activity, timestamp: new Date(activity.timestamp) }));

export const getDefaultUserState = (): UserState => ({
  isLoggedIn: false,
  isPremium: false,
  credits: {
    nutri: 10,
    activity: 10,
    studio: 10
  },
  activities: [],
  memories: []
});

export const hydrateUserState = (): UserState => {
  const saved = storage.get<UserState>(STORAGE_KEYS.user);
  if (!saved) {
    return getDefaultUserState();
  }
  if (saved.activities) {
    return { ...saved, activities: restoreActivities(saved.activities) };
  }
  return saved;
};

export const persistUserState = (user: UserState) => {
  storage.set(STORAGE_KEYS.user, user);
};

export const getAuthSession = () => storage.get<AuthSession>(STORAGE_KEYS.auth);

export const setAuthSession = (session: AuthSession) => {
  storage.set(STORAGE_KEYS.auth, session);
};

export const clearAuthSession = () => {
  storage.remove(STORAGE_KEYS.auth);
};

export const coerceRole = (value: unknown): UserState['role'] | null => {
  if (value === 'pet-parent' || value === 'ngo') return value;
  if (value === 'pet_parent') return 'pet-parent';
  return null;
};

export const resolveRole = (user: UserState): 'pet-parent' | 'ngo' => {
  if (user.role === 'pet-parent' || user.role === 'ngo') {
    return user.role;
  }
  if (user.orgProfile && !user.pet) {
    return 'ngo';
  }
  return 'pet-parent';
};

export const getPostAuthPath = (user: UserState) => {
  if (!user.isLoggedIn) return '/';
  const role = resolveRole(user);
  if (role === 'pet-parent') {
    return user.pet ? '/dashboard' : '/onboarding';
  }
  return user.orgProfile ? '/dashboard' : '/org-onboarding';
};
