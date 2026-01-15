
import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import OrgOnboarding from './components/OrgOnboarding';
import Dashboard from './components/Dashboard';
import PillarPage from './components/PillarPage';
import BlogPage from './components/BlogPage';
import BlogIndex from './components/BlogIndex';
import GuidesIndex from './components/GuidesIndex';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import SafetyPage from './components/SafetyPage';
import SupportPage from './components/SupportPage';
import { clearAuthSession, coerceRole, getAuthSession, getDefaultUserState, getPostAuthPath, hydrateUserState, persistUserState, resolveRole, setAuthSession } from './lib/auth';
import { apiClient } from './services/apiClient';
import { PetData, UserState } from './types';

type AuthMode = 'login' | 'signup' | 'forgot';

const parseAuthMode = (value: string | null): AuthMode => {
  if (value === 'login' || value === 'forgot' || value === 'signup') return value;
  return 'signup';
};

interface MeResponse {
  id: string;
  email: string;
  fullName?: string | null;
  role?: string | null;
  tier?: string | null;
}

const toPetData = (profile: any): PetData => ({
  name: profile?.name ?? '',
  breed: profile?.breed ?? 'Indie / Pariah',
  age: profile?.age ?? 'Adult',
  ageMonths: profile?.ageMonths ?? '',
  weight: profile?.weight ?? '15',
  dietType: profile?.dietType ?? 'Home Cooked',
  gender: profile?.gender ?? 'Male',
  activityLevel: profile?.activityLevel ?? 'Moderate',
  city: profile?.city ?? '',
  allergies: Array.isArray(profile?.allergies) ? profile.allergies : [],
  interests: Array.isArray(profile?.interests) ? profile.interests : [],
  spayNeuterStatus: profile?.spayNeuterStatus ?? 'Unknown',
  vaccinationStatus: profile?.vaccinationStatus ?? 'Not sure',
  lastVaccineDate: profile?.lastVaccineDate ?? '',
  activityBaseline: profile?.activityBaseline ?? '30-60 min',
  housingType: profile?.housingType ?? 'Apartment',
  walkSurface: profile?.walkSurface ?? 'Mixed',
  parkAccess: profile?.parkAccess ?? 'Yes',
  feedingSchedule: profile?.feedingSchedule ?? 'Twice',
  foodBrand: profile?.foodBrand ?? '',
  goals: Array.isArray(profile?.goals) ? profile.goals : [],
  vetAccess: profile?.vetAccess ?? 'Regular Vet'
});

const AppRoutes: React.FC<{
  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
}> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bootstrapping, setBootstrapping] = useState(() => !!getAuthSession()?.refreshToken);
  const authMode = parseAuthMode(searchParams.get('mode'));

  const handleStart = (mode: AuthMode = 'signup') => {
    navigate(`/auth?mode=${mode}`);
  };

  const hydrateProfile = async (baseUser: UserState, role: 'pet-parent' | 'ngo') => {
    let nextUser = baseUser;
    try {
      if (role === 'pet-parent' && !baseUser.pet) {
        const profiles = await apiClient.get<any[]>('/api/pets', { auth: true });
        if (Array.isArray(profiles) && profiles.length) {
          nextUser = { ...baseUser, pet: toPetData(profiles[0]) };
        }
      }

      if (role === 'ngo' && !baseUser.orgProfile) {
        const profile = await apiClient.get<any>('/api/orgs/profile', { auth: true });
        if (profile) {
          nextUser = {
            ...baseUser,
            orgProfile: {
              name: profile.contactName || profile.name || '',
              phone: profile.phone || '',
              city: profile.city || '',
              orgName: profile.orgName || undefined
            }
          };
        }
      }
    } catch {
      return baseUser;
    }
    return nextUser;
  };

  const fetchMe = async () => {
    try {
      return await apiClient.get<MeResponse>('/api/me', { auth: true, skipAuthRefresh: true });
    } catch {
      return null;
    }
  };

  const handleAuthModeChange = (mode: AuthMode) => {
    setSearchParams({ mode }, { replace: true });
  };

  const handleAuthComplete = async (role: 'pet-parent' | 'ngo') => {
    const baseUser = { ...user, isLoggedIn: true, role };
    const nextUser = await hydrateProfile(baseUser, role);
    setUser(nextUser);
    navigate(getPostAuthPath(nextUser), { replace: true });
  };

  const handleOnboardingComplete = (petData: PetData) => {
    setUser(prev => ({ ...prev, pet: petData }));
    navigate('/dashboard', { replace: true });
  };

  const handleOrgOnboardingComplete = (orgProfile: { name: string; phone: string; city: string; orgName?: string }) => {
    setUser(prev => ({ ...prev, orgProfile }));
    navigate('/dashboard', { replace: true });
  };

  const handleUpdateUser = (updatedUser: UserState) => {
    setUser(updatedUser);
  };

  const handleLogout = async () => {
    const session = getAuthSession();
    if (session?.refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { refreshToken: session.refreshToken });
      } catch {
        // ignore logout failures
      }
    }
    clearAuthSession();
    setUser(getDefaultUserState());
    navigate('/', { replace: true });
  };

  const handleAuthBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!bootstrapping) return;
    let active = true;
    const refreshSession = async () => {
      const session = getAuthSession();
      if (!session?.refreshToken) {
        if (active) setBootstrapping(false);
        return;
      }
      try {
        const data = await apiClient.post<{
          accessToken?: string;
          refreshToken?: string;
          user?: { role?: unknown } | null;
        }>(
          '/api/auth/refresh',
          { refreshToken: session.refreshToken },
          { skipAuthRefresh: true }
        );
        if (!data?.accessToken) {
          throw new Error('Refresh failed');
        }
        setAuthSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || session.refreshToken,
          user: data.user || session.user
        });
        const me = await fetchMe();
        if (me) {
          setAuthSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || session.refreshToken,
            user: me
          });
        }
        const resolvedRole =
          coerceRole(me?.role) ??
          coerceRole(data?.user?.role) ??
          user.role ??
          'pet-parent';
        const baseUser = { ...user, isLoggedIn: true, role: resolvedRole };
        const nextUser = await hydrateProfile(baseUser, resolvedRole);
        if (active) {
          setUser(nextUser);
        }
      } catch {
        clearAuthSession();
        if (active) {
          setUser(getDefaultUserState());
        }
      } finally {
        if (active) setBootstrapping(false);
      }
    };
    refreshSession();
    return () => {
      active = false;
    };
  }, [bootstrapping]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6] text-brand-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-500">Syncing</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/guides/:pillar" element={<PillarPage />} />
      <Route path="/guides" element={<GuidesIndex />} />
      <Route path="/blog/:petType/:slug" element={<BlogPage />} />
      <Route path="/blog/:petType" element={<BlogIndex />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/safety" element={<SafetyPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route
        path="/"
        element={user.isLoggedIn ? <Navigate to={getPostAuthPath(user)} replace /> : <LandingPage onStart={handleStart} />}
      />
      <Route
        path="/auth"
        element={
          user.isLoggedIn ? (
            <Navigate to={getPostAuthPath(user)} replace />
          ) : (
            <Auth
              initialMode={authMode}
              onModeChange={handleAuthModeChange}
              onComplete={handleAuthComplete}
              onBack={handleAuthBack}
            />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          !user.isLoggedIn ? (
            <Navigate to="/auth?mode=login" replace />
          ) : resolveRole(user) === 'ngo' ? (
            <Navigate to={getPostAuthPath(user)} replace />
          ) : user.pet ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Onboarding onComplete={handleOnboardingComplete} />
          )
        }
      />
      <Route
        path="/org-onboarding"
        element={
          !user.isLoggedIn ? (
            <Navigate to="/auth?mode=login" replace />
          ) : resolveRole(user) === 'pet-parent' ? (
            <Navigate to={getPostAuthPath(user)} replace />
          ) : user.orgProfile ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <OrgOnboarding onComplete={handleOrgOnboardingComplete} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          !user.isLoggedIn ? (
            <Navigate to="/auth?mode=login" replace />
          ) : resolveRole(user) === 'pet-parent' && !user.pet ? (
            <Navigate to="/onboarding" replace />
          ) : resolveRole(user) === 'ngo' && !user.orgProfile ? (
            <Navigate to="/org-onboarding" replace />
          ) : (
            <Dashboard
              user={user}
              setUser={handleUpdateUser}
              onUpgrade={() => setUser(prev => ({ ...prev, isPremium: true }))}
              onLogout={handleLogout}
            />
          )
        }
      />
      <Route path="*" element={<Navigate to={user.isLoggedIn ? getPostAuthPath(user) : '/'} replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserState>(hydrateUserState);

  useEffect(() => {
    persistUserState(user);
  }, [user]);

  return (
    <div className="min-h-screen font-sans bg-[#FAF8F6] text-neutral-dark selection:bg-brand-200">
      <AppRoutes user={user} setUser={setUser} />
    </div>
  );
};

export default App;
