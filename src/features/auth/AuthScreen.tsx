import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../components/ToastProvider';

export function AuthScreen({ onUseLocal }: { onUseLocal?: () => void }) {
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.session) {
          notify('Akun dibuat, langsung masuk.', 'ok');
        } else {
          setPendingEmail(email);
          notify('Akun dibuat. Buka link konfirmasi yang dikirim ke emailmu.', 'ok');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        notify('Berhasil masuk.', 'ok');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk');
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!supabase || !pendingEmail) return;
    setBusy(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail
    });
    setBusy(false);
    notify(
      resendError ? resendError.message : 'Email konfirmasi dikirim ulang.',
      resendError ? 'bad' : 'ok'
    );
  };

  return (
    <div className="card auth">
      <h2 style={{ marginBottom: 4 }}>Masuk untuk sinkronisasi</h2>
      <p className="hint-line">
        Akun ini dipakai supaya catatan, kartu, dan jurnal-mu ada di semua perangkat.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="password">Kata sandi</label>
        <input
          id="password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p style={{ color: '#c0392b', fontWeight: 700, marginBottom: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        <p style={{ margin: '14px 0 0' }}>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Memproses...' : mode === 'signin' ? 'Masuk' : 'Buat akun'}
          </button>{' '}
          <button
            type="button"
            className="btn alt"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
          >
            {mode === 'signin' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </p>
        {pendingEmail ? (
          <p style={{ margin: '8px 0 0', fontWeight: 700 }}>
            Belum menerima email konfirmasi untuk {pendingEmail}.
            <br />
            <button
              type="button"
              className="btn alt small"
              onClick={resendConfirmation}
              disabled={busy}
              style={{ marginTop: 8 }}
            >
              Kirim ulang email konfirmasi
            </button>
          </p>
        ) : null}
        {onUseLocal ? (
          <p style={{ margin: '8px 0 0' }}>
            <button type="button" className="btn alt" onClick={onUseLocal}>
              Lanjut tanpa akun, simpan di perangkat ini
            </button>
          </p>
        ) : null}
      </form>
    </div>
  );
}
