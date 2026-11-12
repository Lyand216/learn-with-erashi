import { useRef, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FocusPanel } from '../focus/FocusPanel';
import { NotesPanel } from '../notes/NotesPanel';
import { RecallPanel } from '../recall/RecallPanel';
import { ProgressPanel } from '../progress/ProgressPanel';
import { PrinciplesPanel } from '../principles/PrinciplesPanel';
import { normalizeDataset } from '../../lib/storage/local';
import { today } from '../../lib/date';
import { useTheme } from '../../lib/useTheme';
import type { Dataset } from '../../lib/types';

type Tab = 'fokus' | 'catatan' | 'recall' | 'progres' | 'prinsip';

const TABS: Array<{ id: Tab; label: string; color: string }> = [
  { id: 'fokus', label: 'Fokus', color: 'var(--p)' },
  { id: 'catatan', label: 'Catatan', color: 'var(--y)' },
  { id: 'recall', label: 'Recall', color: 'var(--s)' },
  { id: 'progres', label: 'Progres', color: 'var(--o)' },
  { id: 'prinsip', label: 'Prinsip', color: 'var(--m)' }
];

export function Workspace({
  onSignOut,
  onUseLocal
}: {
  onSignOut?: () => void;
  onUseLocal?: () => void;
}) {
  const { data, status, error, replaceAll, reload, storeMode, wipe } = useData();
  const { notify } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('fokus');
  const [pendingImport, setPendingImport] = useState<Dataset | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [fabRequest, setFabRequest] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openTab = (next: Tab) => {
    setTab(next);
    try {
      window.location.hash = next;
    } catch {
      // Hash hanya bonus navigasi, tidak wajib.
    }
  };

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    openTab(next.id);
    navRef.current?.querySelectorAll('button')[TABS.indexOf(next)]?.focus();
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

  const wipeAll = () => {
    setWipeOpen(false);
    void (async () => {
      try {
        await wipe();
      } catch (err) {
        notify(
          `Gagal menghapus: ${err instanceof Error ? err.message : 'koneksi bermasalah'}`,
          'bad'
        );
      }
    })();
  };

  const saveLabel =
    status === 'ready'
      ? storeMode === 'cloud'
        ? 'Tersimpan di cloud'
        : 'Tersimpan di perangkat'
      : '';

  return (
    <>
      <a className="skip-link" href="#main">
        Lompat ke konten utama
      </a>

      <header>
        <div>
          <h1>Learn with Erashi</h1>
          <p>Berdasarkan ide dari buku Learning How to Learn</p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="btn alt"
            id="thm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          >
            Tema
          </button>
          <button type="button" className="btn alt" id="exp" onClick={exportData}>
            Cadangkan data
          </button>
          <button type="button" className="btn alt" id="imp" onClick={() => fileRef.current?.click()}>
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
          {onSignOut ? (
            <button type="button" className="btn alt" onClick={onSignOut}>
              Keluar
            </button>
          ) : null}
        </div>
      </header>

      {status === 'loading' ? (
        <main id="main">
          <div className="notes" aria-busy="true">
            <span className="sr-only">Memuat data...</span>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </main>
      ) : status === 'error' ? (
        <main id="main">
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
        </main>
      ) : (
        <>
          <nav role="tablist" aria-label="Bagian aplikasi" ref={navRef}>
            {TABS.map((item, index) => (
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
                onKeyDown={(event) => onTabKeyDown(event, index)}
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
              <h2 className="sr-only">Fokus</h2>
              <FocusPanel />
            </section>

            <section
              className={`panel ${tab === 'catatan' ? 'on' : ''}`}
              id="panel-catatan"
              role="tabpanel"
              aria-labelledby="tab-catatan"
            >
              <h2 className="sr-only">Catatan</h2>
              <NotesPanel fabRequest={fabRequest} onFabHandled={() => setFabRequest(0)} />
            </section>

            <section
              className={`panel ${tab === 'recall' ? 'on' : ''}`}
              id="panel-recall"
              role="tabpanel"
              aria-labelledby="tab-recall"
            >
              <h2 className="sr-only">Recall</h2>
              <RecallPanel fabRequest={fabRequest} onFabHandled={() => setFabRequest(0)} />
            </section>

            <section
              className={`panel ${tab === 'progres' ? 'on' : ''}`}
              id="panel-progres"
              role="tabpanel"
              aria-labelledby="tab-progres"
            >
              <h2 className="sr-only">Progres</h2>
              <ProgressPanel />
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

          <button
            type="button"
            className={`fab ${tab === 'catatan' || tab === 'recall' ? 'on' : ''}`}
            id="fab"
            aria-label="Tambah baru"
            onClick={() => setFabRequest((prev) => prev + 1)}
          >
            +
          </button>

          <footer>
            <p>
              Terinspirasi dari <i>Learning How to Learn</i> (Barbara Oakley &amp; Terrence Sejnowski).
              Bukan produk resmi.
            </p>
            <p>
              {storeMode === 'cloud'
                ? 'Datamu tersimpan di akun Supabase-mu.'
                : 'Datamu tidak dikirim ke server mana pun.'}{' '}
              {saveLabel ? `· ${saveLabel}` : ''}
            </p>
            <p>
              <button type="button" className="chip" id="wipe" onClick={() => setWipeOpen(true)}>
                Hapus semua data
              </button>
            </p>
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

      <ConfirmDialog
        open={wipeOpen}
        title="Hapus semua data?"
        message="Catatan, kartu, jurnal, dan statistik akan dihapus permanen. Sebaiknya cadangkan data dulu."
        confirmLabel="Ya, hapus semua"
        onCancel={() => setWipeOpen(false)}
        onConfirm={wipeAll}
      />
    </>
  );
}
