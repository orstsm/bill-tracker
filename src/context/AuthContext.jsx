import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './auth';

const OFFLINE_USER_KEY = 'bill_tracker_last_user';

const readCachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_USER_KEY) || 'null');
  } catch {
    return null;
  }
};

const cacheUser = (user) => {
  if (user?.id) {
    localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify({ id: user.id, email: user.email || '' }));
  } else {
    localStorage.removeItem(OFFLINE_USER_KEY);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(() => !readCachedUser());
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  });

  useEffect(() => {
    let active = true;

    const applyUser = (nextUser, clearCachedUser = false) => {
      if (!active) return;
      if (nextUser) cacheUser(nextUser);
      if (clearCachedUser) cacheUser(null);
      setUser((currentUser) => (
        currentUser?.id === nextUser?.id && currentUser?.email === nextUser?.email
          ? currentUser
          : nextUser
      ));
      setLoading(false);
    };

    // iOS can suspend the PWA while another app is open. If session recovery
    // stalls offline, release the loading screen and use the last local user.
    const recoveryTimer = window.setTimeout(() => {
      if (!active) return;
      const cachedUser = readCachedUser();
      applyUser(cachedUser);
    }, 2000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        window.clearTimeout(recoveryTimer);
        const nextUser = session?.user ?? (!navigator.onLine ? readCachedUser() : null);
        applyUser(nextUser, navigator.onLine && !nextUser);
      })
      .catch(() => {
        window.clearTimeout(recoveryTimer);
        applyUser(readCachedUser());
      });

    // Listen for changes on auth state (logged in, signed out, password recovery, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (event === 'SIGNED_OUT') {
        applyUser(null, true);
        return;
      }

      const nextUser = session?.user ?? (!navigator.onLine ? readCachedUser() : null);
      applyUser(nextUser, navigator.onLine && event === 'INITIAL_SESSION' && !nextUser);
    });

    return () => {
      active = false;
      window.clearTimeout(recoveryTimer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isPasswordRecovery, setIsPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
};
