import { useRef, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FocusPanel } from '../focus/FocusPanel';
import { NotesPanel } from '../notes/NotesPanel';
import { RecallPanel } from '../recall/RecallPanel';
import { PrinciplesPanel } from '../principles/PrinciplesPanel';
import { normalizeDataset } from '../../lib/storage/local';
import { today } from '../../lib/date';
import { useTheme } from '../../lib/useTheme';
import type { Dataset } from '../../lib/types';

type Tab = 'fokus' | 'catatan' | 'recall' | 'prinsip';

const TABS: Array<{ id: Tab; label: string; color: string }> = [
  { id: 'fokus', label: 'Fokus & santai', color: 'var(--p)' },
  { id: 'catatan', label: 'Catatan', color: 'var(--y)' },
  { id: 'recall', label: 'Recall', color: 'var(--s)' },
  { id: 'prinsip', label: 'Prinsip', color: 'var(--m)' }
];

export function Workspace({
  onSignOut,
  onUseLocal
}: {
  onSignOut?: () => void;
  onUseLocal?: () => void;
}) {
  const { data, status, error, replaceAll, reload, saveState, storeMode } = useData();
  const { notify } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('fokus');
  const [pendingImport, setPendingImport] = useState<Dataset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openTab = (next: Tab) => {
    setTab(next);
    try {
      window.location.hash = next;
    } catch {
      // Hash hanya bonus navigasi, tidak wajib.
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learn-with-erashi-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Data dicadangkan sebagai file JSON.', 'ok');
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const dataset = normalizeDataset(parsed);
        if (!dataset.notes.length && !dataset.cards.length && !dataset.journal.length) {
          notify('File ini tidak berisi data catatan yang dikenali.', 'bad');
          return;
        }
        setPendingImport(dataset);
      } catch {
        notify('File tidak valid. Pakai file hasil "Cadangkan data".', 'bad');
      }
    };
    reader.readAsText(file);
  };

  const applyImport = () => {
    if (!pendingImport) return;
    replaceAll(pendingImport);
    setPendingImport(null);
    notify('Data dipulihkan.', 'ok');
  };

  const saveLabel =
    saveState === 'saving'
      ? 'Menyimpan...'
      : saveState === 'error'
        ? 'Gagal menyimpan'
        : storeMode === 'cloud'
          ? 'Tersimpan di cloud'
          : 'Tersimpan di perangkat';

  return (
    <>
      <a className="skip-link" href="#main">
        Lompat ke konten utama
      </a>
      <header className="site-header">
        <div>
          <h1>Learn with Erashi</h1>
          <p>Berdasarkan ide dari buku Learning How to Learn</p>
        </div>
        <div className="header-actions">
          <span className="status-pill">{saveLabel}</span>
          <button type="button" className="btn alt" onClick={exportData}>
            Cadangkan data
          </button>
          <button type="button" className="btn alt" onClick={() => fileRef.current?.click()}>
            Pulihkan data
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn alt"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
          >
            {theme === 'light' ? 'Mode gelap' : 'Mode terang'}
          </button>
          {onSignOut ? (
            <button type="button" className="btn alt" onClick={onSignOut}>
              Keluar
            </button>
          ) : null}
        </div>
      </header>

      {storeMode === 'local' ? (
        <div className="banner">
          <p>
            Mode lokal: data tersimpan di perangkat ini. Isi <code>VITE_SUPABASE_URL</code> dan{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> di berkas <code>.env</code> lalu jalankan ulang
            <code> npm run dev</code> untuk sinkronisasi antar perangkat.
          </p>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="notes" aria-busy="true" aria-live="polite">
          <span className="sr-only">Memuat data...</span>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : status === 'error' ? (
        <div className="card" role="alert">
          <h3>Data belum bisa dimuat</h3>
          <p style={{ fontWeight: 700 }}>{error}</p>
          <p>
            <button type="button" className="btn" onClick={reload}>
              Coba lagi
            </button>
            {onUseLocal ? (
              <button type="button" className="btn alt" onClick={onUseLocal}>
                Lanjut pakai mode lokal
              </button>
            ) : null}
          </p>
        </div>
      ) : (
        <>
          <nav className="tabs" role="tablist" aria-label="Bagian aplikasi">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                data-t={item.id}
                style={{ ['--c' as string]: item.color }}
                onClick={() => openTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <main id="main">
            <section
              className={`panel ${tab === 'fokus' ? 'on' : ''}`}
              id="panel-fokus"
              role="tabpanel"
              aria-labelledby="tab-fokus"
            >
              <h2 className="sr-only">Fokus &amp; santai</h2>
              <FocusPanel onGoToNotes={() => openTab('catatan')} />
            </section>
            <section
              className={`panel ${tab === 'catatan' ? 'on' : ''}`}
              id="panel-catatan"
              role="tabpanel"
              aria-labelledby="tab-catatan"
            >
              <h2 className="sr-only">Catatan</h2>
              <NotesPanel />
            </section>
            <section
              className={`panel ${tab === 'recall' ? 'on' : ''}`}
              id="panel-recall"
              role="tabpanel"
              aria-labelledby="tab-recall"
            >
              <h2 className="sr-only">Recall</h2>
              <RecallPanel />
            </section>
            <section
              className={`panel ${tab === 'prinsip' ? 'on' : ''}`}
              id="panel-prinsip"
              role="tabpanel"
              aria-labelledby="tab-prinsip"
            >
              <h2 className="sr-only">Prinsip</h2>
              <PrinciplesPanel />
            </section>
          </main>

          <footer className="footer">
            {storeMode === 'cloud'
              ? 'Data tersimpan otomatis di akun Supabase-mu.'
              : 'Data tersimpan otomatis di perangkat ini. Pakai "Cadangkan data" untuk menyimpan salinan sebagai file JSON.'}
          </footer>
        </>
      )}

      <ConfirmDialog
        open={pendingImport !== null}
        title="Pulihkan data?"
        message="Semua data yang ada sekarang akan diganti dengan isi file cadangan."
        confirmLabel="Ya, pulihkan"
        onCancel={() => setPendingImport(null)}
        onConfirm={applyImport}
      />
    </>
  );
}
