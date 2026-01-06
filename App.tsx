
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { UserState, PetData } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'auth' | 'onboarding' | 'dashboard'>('landing');
  const [user, setUser] = useState<UserState>(() => {
    const saved = localStorage.getItem('pawveda_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure date objects are restored
      if (parsed.activities) {
        parsed.activities = parsed.activities.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
      }
      return parsed;
    }
    return {
      isLoggedIn: false,
      isPremium: false,
      credits: {
        nutri: 10,
        activity: 10,
        studio: 10
      },
      activities: [],
      memories: []
    };
  });

  useEffect(() => {
    localStorage.setItem('pawveda_user', JSON.stringify(user));
  }, [user]);

  const handleStart = () => setView('auth');
  
  const handleAuthComplete = () => {
    setUser(prev => ({ ...prev, isLoggedIn: true }));
    setView(user.pet ? 'dashboard' : 'onboarding');
  };

  const handleOnboardingComplete = (petData: PetData) => {
    setUser(prev => ({ ...prev, pet: petData }));
    setView('dashboard');
  };

  const handleUpdateUser = (updatedUser: UserState) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    setUser({
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
    setView('landing');
  };

  return (
    <div className="min-h-screen font-sans bg-[#FAF8F6] text-neutral-dark selection:bg-brand-200">
      {view === 'landing' && <LandingPage onStart={handleStart} />}
      {view === 'auth' && <Auth onComplete={handleAuthComplete} onBack={() => setView('landing')} />}
      {view === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
      {view === 'dashboard' && (
        <Dashboard 
          user={user} 
          setUser={handleUpdateUser}
          onUpgrade={() => setUser(prev => ({...prev, isPremium: true}))}
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
};

export default App;
