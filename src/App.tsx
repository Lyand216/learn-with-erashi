import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ToastProvider } from './components/ToastProvider';
import { DataProvider } from './state/DataProvider';
import { Workspace } from './features/workspace/Workspace';
import { AuthScreen } from './features/auth/AuthScreen';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { localStore } from './lib/storage/local';
import { supabaseStore } from './lib/storage/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setAuthReady(true);
      })
      .catch(() => {
        // Jaringan atau server auth tidak terjangkau: biarkan pengguna lanjut ke mode lokal.
        if (!active) return;
        setSession(null);
        setAuthReady(true);
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const cloudActive = supabaseConfigured && !offline;
  const needAuth = cloudActive && !session;

  return (
    <ToastProvider>
      <div className="wrap">
        {!authReady ? (
          <main id="main">
            <div className="card" aria-busy="true">
              <p style={{ fontWeight: 700, margin: 0 }}>Menyiapkan aplikasi...</p>
            </div>
          </main>
        ) : needAuth ? (
          <main id="main">
            <AuthScreen onUseLocal={() => setOffline(true)} />
          </main>
        ) : (
          <DataProvider store={cloudActive ? supabaseStore : localStore}>
            <Workspace
              onSignOut={cloudActive ? () => void supabase?.auth.signOut() : undefined}
              onUseLocal={cloudActive ? () => setOffline(true) : undefined}
            />
          </DataProvider>
        )}
      </div>
    </ToastProvider>
  );
}
