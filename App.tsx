
import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import OrgOnboarding from './components/OrgOnboarding';
import Dashboard from './components/Dashboard';
import { PetData, UserState } from './types';

type AuthMode = 'login' | 'signup' | 'forgot';

const getDefaultUserState = (): UserState => ({
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

const hydrateUserState = (): UserState => {
  const saved = localStorage.getItem('pawveda_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.activities) {
      parsed.activities = parsed.activities.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
    }
    return parsed;
  }
  return getDefaultUserState();
};

const resolveRole = (user: UserState): 'pet-parent' | 'ngo' => {
  if (user.role === 'pet-parent' || user.role === 'ngo') {
    return user.role;
  }
  if (user.orgProfile && !user.pet) {
    return 'ngo';
  }
  return 'pet-parent';
};

const getPostAuthPath = (user: UserState) => {
  if (!user.isLoggedIn) return '/';
  const role = resolveRole(user);
  if (role === 'pet-parent') {
    return user.pet ? '/dashboard' : '/onboarding';
  }
  return user.orgProfile ? '/dashboard' : '/org-onboarding';
};

const parseAuthMode = (value: string | null): AuthMode => {
  if (value === 'login' || value === 'forgot' || value === 'signup') return value;
  return 'signup';
};

const AppRoutes: React.FC<{
  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
}> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const authMode = parseAuthMode(searchParams.get('mode'));

  const handleStart = (mode: AuthMode = 'signup') => {
    navigate(`/auth?mode=${mode}`);
  };

  const handleAuthModeChange = (mode: AuthMode) => {
    setSearchParams({ mode }, { replace: true });
  };

  const handleAuthComplete = (role: 'pet-parent' | 'ngo') => {
    const nextUser = { ...user, isLoggedIn: true, role };
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

  const handleLogout = () => {
    localStorage.removeItem('pawveda_auth');
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

  return (
    <Routes>
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
    localStorage.setItem('pawveda_user', JSON.stringify(user));
  }, [user]);

  return (
    <div className="min-h-screen font-sans bg-[#FAF8F6] text-neutral-dark selection:bg-brand-200">
      <AppRoutes user={user} setUser={setUser} />
    </div>
  );
};

export default App;
