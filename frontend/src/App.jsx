import { useState } from 'react';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Register from './screens/Register';
import Home from './screens/Home';
import Admin from './screens/Admin';
import './App.css';

function getStoredUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    if (!payload.shift && payload.crew) payload.shift = payload.crew;
    return payload;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [authScreen, setAuthScreen] = useState('landing'); // 'landing' | 'login' | 'register'
  const [view, setView] = useState(() => getStoredUser() ? 'landing' : 'default'); // 'default' | 'home' | 'admin' | 'landing'

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setView('default');
  }

  function handleProfileUpdated(newToken) {
    const payload = JSON.parse(atob(newToken.split('.')[1]));
    setUser(payload);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setAuthScreen('landing');
    setView('default');
  }

  // Landing page — shown to logged-in users who navigate back to it
  if (authScreen === 'landing' && !user || view === 'landing') {
    return (
      <Landing
        user={user}
        onGoLogin={() => setAuthScreen('login')}
        onGoRegister={() => setAuthScreen('register')}
        onGoApp={() => setView('default')}
        onLogout={handleLogout}
      />
    );
  }

  if (user) {
    const showAdmin = user.role === 'admin' && view === 'admin';
    if (showAdmin) {
      return (
        <Admin
          user={user}
          onLogout={handleLogout}
          onGoHome={() => setView('default')}
          onGoLanding={() => setView('landing')}
        />
      );
    }
    return (
      <Home
        user={user}
        onLogout={handleLogout}
        onGoAdmin={user.role === 'admin' ? () => setView('admin') : null}
        onGoLanding={() => setView('landing')}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  if (authScreen === 'register') {
    return (
      <Register
        onGoLogin={() => setAuthScreen('login')}
        onGoBack={() => setAuthScreen('landing')}
      />
    );
  }

  return (
    <Login
      onLogin={handleLogin}
      onGoRegister={() => setAuthScreen('register')}
      onGoBack={() => setAuthScreen('landing')}
    />
  );
}
