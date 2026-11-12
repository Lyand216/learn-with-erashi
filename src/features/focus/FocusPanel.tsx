import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatClock, today } from '../../lib/date';
import { uid } from '../../lib/id';
import { DEFAULT_CHECKLIST, TIMER_HINTS, type ChecklistItem } from '../../lib/types';

type Mode = 'focus' | 'diffuse';

const PRESETS = [
  { value: '25,5', label: '25 / 5 menit' },
  { value: '50,10', label: '50 / 10 menit' },
  { value: '15,3', label: '15 / 3 menit' }
];

export function FocusPanel() {
  const { data, update, storeMode } = useData();
  const { notify } = useToast();

  const [mode, setMode] = useState<Mode>('focus');
  const [left, setLeft] = useState(data.settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef(0);
  const modeRef = useRef<Mode>(mode);
  const settingsRef = useRef(data.settings);
  const topicRef = useRef('');
  const audioRef = useRef<AudioContext | null>(null);

  const [topic, setTopic] = useState('');
  const [pre, setPre] = useState('');
  const [sessLog, setSessLog] = useState('');

  const [hardest, setHardest] = useState('');
  const [understood, setUnderstood] = useState('');
  const [tomorrow, setTomorrow] = useState('');

  const [editingChecklist, setEditingChecklist] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [pendingRemoveItem, setPendingRemoveItem] = useState<string | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    settingsRef.current = data.settings;
  }, [data.settings]);

  useEffect(() => {
    topicRef.current = topic;
  }, [topic]);

  const durationOf = useCallback(
    (which: Mode) =>
      (which === 'focus' ? settingsRef.current.focusMinutes : settingsRef.current.diffuseMinutes) * 60,
    []
  );

  const beep = useCallback(() => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioRef.current ?? new Ctor();
      audioRef.current = ctx;
      void ctx.resume();
      const start = ctx.currentTime;
      [660, 880, 660].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.25, start + index * 0.28);
        gain.gain.exponentialRampToValueAtTime(0.001, start + index * 0.28 + 0.22);
        osc.start(start + index * 0.28);
        osc.stop(start + index * 0.28 + 0.24);
      });
    } catch {
      // Audio butuh interaksi pengguna; abaikan kalau tidak tersedia.
    }
    try {
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(
          modeRef.current === 'focus'
            ? 'Sesi fokus selesai. Saatnya santai!'
            : 'Istirahat selesai. Ayo fokus lagi!'
        );
      }
    } catch {
      // Notifikasi ditolak browser, timer tetap berjalan normal.
    }
  }, []);

  const finish = useCallback(() => {
    const finishedMode = modeRef.current;
    if (finishedMode === 'focus') {
      update((draft) => {
        draft.sessions.unshift({
          id: uid(),
          day: today(),
          minutes: Math.round(durationOf(finishedMode) / 60),
          mode: 'focus',
          topic: topicRef.current,
          createdAt: new Date().toISOString()
        });
      });
    }
    beep();
    const nextMode: Mode = finishedMode === 'focus' ? 'diffuse' : 'focus';
    setMode(nextMode);
    setLeft(durationOf(nextMode));
    setRunning(false);
    notify(
      finishedMode === 'focus'
        ? 'Sesi fokus selesai. Saatnya santai!'
        : 'Istirahat selesai. Ayo fokus lagi!',
      'ok'
    );
  }, [beep, durationOf, notify, update]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        finish();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, finish]);

  useEffect(() => {
    document.title = running ? `${formatClock(left)} - Learn with Erashi` : 'Learn with Erashi';
  }, [left, running]);

  const prepareAudio = () => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioRef.current ?? new Ctor();
      audioRef.current = ctx;
      void ctx.resume();
    } catch {
      // Abaikan, bunyi hanya pemanis.
    }
    try {
      if (window.Notification && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    } catch {
      // Izin notifikasi tidak tersedia.
    }
  };

  const start = () => {
    prepareAudio();
    endAtRef.current = Date.now() + left * 1000;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setLeft(durationOf(mode));
  };

  const switchMode = (which: Mode) => {
    setRunning(false);
    setMode(which);
    setLeft(durationOf(which));
  };

  const applyPreset = (value: string) => {
    const [focus, diffuse] = value.split(',').map((v) => Number(v));
    update((draft) => {
      draft.settings.focusMinutes = focus;
      draft.settings.diffuseMinutes = diffuse;
    });
    setRunning(false);
    setLeft(mode === 'focus' ? focus * 60 : diffuse * 60);
  };

  const startQuickFive = () => {
    prepareAudio();
    setMode('focus');
    setLeft(300);
    endAtRef.current = Date.now() + 300 * 1000;
    setRunning(true);
  };

  const saveSessionNote = () => {
    const body = sessLog.trim();
    if (!body) {
      notify('Tulis dulu apa yang kamu ingat, baru simpan.', 'bad');
      return;
    }
    const t = topic.trim();
    const preText = pre.trim();
    update((draft) => {
      draft.notes.unshift({
        id: uid(),
        title: t || 'Ingatan sesi fokus',
        kind: 'Chunk',
        topic: t,
        body: `${preText ? `Tebakan awal: ${preText}\n\nSetelah belajar: ` : ''}${body}`,
        color: 'm',
        date: today()
      });
    });
    setTopic('');
    setPre('');
    setSessLog('');
    notify('Catatan sesi disimpan di tab Catatan.', 'ok');
  };

  const saveJournal = () => {
    if (!hardest.trim() && !understood.trim() && !tomorrow.trim()) {
      notify('Isi minimal satu baris jurnal.', 'bad');
      return;
    }
    update((draft) => {
      draft.journal.unshift({
        id: uid(),
        day: today(),
        hardest: hardest.trim(),
        understood: understood.trim(),
        tomorrow: tomorrow.trim(),
        createdAt: new Date().toISOString()
      });
    });
    setHardest('');
    setUnderstood('');
    setTomorrow('');
    notify('Jurnal tersimpan.', 'ok');
  };

  const deleteJournal = (id: string) => {
    update((draft) => {
      draft.journal = draft.journal.filter((entry) => entry.id !== id);
    });
  };

  const checklist = data.checklistItems.length ? data.checklistItems : DEFAULT_CHECKLIST;
  const checkedToday = data.checklist[today()] ?? {};
  const doneCount = checklist.filter((item) => checkedToday[item.id]).length;

  const toggleItem = (id: string, value: boolean) => {
    update((draft) => {
      const record = draft.checklist[today()] ?? {};
      record[id] = value;
      draft.checklist[today()] = record;
    });
  };

  const renameItem = (id: string, text: string) => {
    update((draft) => {
      const item = draft.checklistItems.find((entry) => entry.id === id);
      if (item) item.text = text;
    });
  };

  const addItem = () => {
    const value = newItem.trim();
    if (!value) return;
    update((draft) => {
      draft.checklistItems.push({ id: `u${uid()}`, text: value });
    });
    setNewItem('');
  };

  const removeItem = (id: string) => {
    update((draft) => {
      draft.checklistItems = draft.checklistItems.filter((item) => item.id !== id);
    });
    setPendingRemoveItem(null);
  };

  const resetChecklist = () => {
    update((draft) => {
      draft.checklistItems = DEFAULT_CHECKLIST.map((item) => ({ ...item }));
    });
    notify('Ceklis dikembalikan ke 5 item bawaan.', 'ok');
  };

  const todaySessions = data.sessions.filter((s) => s.day === today() && s.mode === 'focus');
  const presetValue = `${data.settings.focusMinutes},${data.settings.diffuseMinutes}`;
  const lastJournal = data.journal[0];

  return (
    <>
      {!data.settings.seen ? (
        <div className="card" id="welcome" style={{ background: 'var(--y)', marginBottom: 18 }}>
          <h3>Selamat datang</h3>
          <p style={{ margin: '6px 0' }}>
            Alat belajar ini memakai ide dari <i>Learning How to Learn</i>. Alurnya:
          </p>
          <ol style={{ margin: '0 0 10px', paddingLeft: 20, fontWeight: 600 }}>
            <li>Mulai sesi fokus, lalu istirahat santai.</li>
            <li>Tulis ingatanmu dari kepala sendiri di Catatan.</li>
            <li>Ulang kartu di Recall secara berkala.</li>
            <li>Tutup hari dengan jurnal refleksi.</li>
          </ol>
          <p style={{ margin: '0 0 10px', fontWeight: 600 }}>
            {storeMode === 'cloud'
              ? 'Semua data tersimpan di akunmu dan bisa dibuka di perangkat lain. Pakai Cadangkan data secara rutin.'
              : 'Semua data hanya tersimpan di browser ini. Pakai Cadangkan data secara rutin.'}
          </p>
          <button
            type="button"
            className="btn"
            id="wok"
            onClick={() =>
              update((draft) => {
                draft.settings.seen = true;
              })
            }
          >
            Mengerti, mulai
          </button>
        </div>
      ) : null}

      <div className={`card timer ${mode}`} id="timerCard">
        <div className="mode" role="group" aria-label="Mode timer">
          <button
            type="button"
            className={`btn ${mode === 'focus' ? 'on' : ''}`}
            onClick={() => switchMode('focus')}
            aria-pressed={mode === 'focus'}
          >
            Mode fokus {data.settings.focusMinutes} mnt
          </button>
          <button
            type="button"
            className={`btn ${mode === 'diffuse' ? 'on' : ''}`}
            onClick={() => switchMode('diffuse')}
            aria-pressed={mode === 'diffuse'}
          >
            Mode santai {data.settings.diffuseMinutes} mnt
          </button>
        </div>

        <div className="time" id="time" aria-live="off" aria-label={`Sisa waktu ${formatClock(left)}`}>
          {formatClock(left)}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn m" id="go" onClick={running ? pause : start}>
            {running ? 'Jeda' : 'Mulai'}
          </button>
          <button type="button" className="btn alt" id="reset" onClick={reset}>
            Atur ulang
          </button>
        </div>

        <p className="hint" id="hint">
          {TIMER_HINTS[mode]}
        </p>

        <div className="stat">
          <select
            id="pst"
            aria-label="Durasi timer"
            style={{ width: 'auto' }}
            value={PRESETS.some((p) => p.value === presetValue) ? presetValue : 'custom'}
            onChange={(event) => {
              if (event.target.value !== 'custom') applyPreset(event.target.value);
            }}
          >
            {PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
            {!PRESETS.some((p) => p.value === presetValue) ? (
              <option value="custom">Kustom ({presetValue})</option>
            ) : null}
          </select>
          <button type="button" className="btn alt" id="five" onClick={startQuickFive}>
            Mulai 5 menit saja
          </button>
        </div>

        <div className="stat">
          <span id="sessN">{todaySessions.length} sesi fokus hari ini</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <label htmlFor="topic" style={{ marginTop: 0 }}>
          Apa yang akan kamu pelajari di sesi ini?
        </label>
        <input
          id="topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Contoh: Bab 3 jaringan komputer"
        />
        <label htmlFor="pre">
          Sebelum belajar: tebak apa yang akan kamu pelajari atau sudah kamu ketahui
        </label>
        <textarea
          id="pre"
          value={pre}
          onChange={(event) => setPre(event.target.value)}
          style={{ minHeight: 60 }}
          placeholder="Tebakan yang salah pun tidak apa-apa. Ini menyiapkan otakmu."
        />
        <label htmlFor="sessLog">
          Setelah selesai: tulis yang kamu ingat tanpa melihat materi, lalu bandingkan dengan tebakan
          awalmu
        </label>
        <textarea
          id="sessLog"
          value={sessLog}
          onChange={(event) => setSessLog(event.target.value)}
          placeholder="Tutup bukumu, lalu tulis dari ingatan..."
        />
        <p style={{ margin: '10px 0 0' }}>
          <button type="button" className="btn" id="saveSess" onClick={saveSessionNote}>
            Simpan jadi catatan
          </button>
        </p>
      </div>

      <div className="card chk" id="ccard" style={{ marginTop: 18, background: 'var(--y)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}
        >
          <h3>
            Ceklis hari ini <small id="cprog">({doneCount}/{checklist.length})</small>
          </h3>
          <button
            type="button"
            className="chip"
            id="cedit"
            onClick={() => setEditingChecklist((prev) => !prev)}
          >
            {editingChecklist ? 'Selesai' : 'Ubah ceklis'}
          </button>
        </div>

        <div id="chk">
          {checklist.length ? (
            checklist.map((item: ChecklistItem) =>
              editingChecklist ? (
                <div className="chk-edit" key={item.id}>
                  <input
                    value={item.text}
                    aria-label="Nama item"
                    onChange={(event) => renameItem(item.id, event.target.value)}
                  />
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setPendingRemoveItem(item.id)}
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={Boolean(checkedToday[item.id])}
                    onChange={(event) => toggleItem(item.id, event.target.checked)}
                  />
                  {item.text}
                </label>
              )
            )
          ) : (
            <p style={{ margin: '6px 0', fontWeight: 600 }}>
              Ceklis kosong. Tekan Ubah ceklis untuk menambah item.
            </p>
          )}
        </div>

        <div id="cform" hidden={!editingChecklist} style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="cnew"
              placeholder="Item baru..."
              aria-label="Item baru"
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addItem();
                }
              }}
            />
            <button type="button" className="btn" id="cadd" onClick={addItem}>
              Tambah
            </button>
          </div>
          <p style={{ margin: '10px 0 0' }}>
            <button type="button" className="chip" id="creset" onClick={resetChecklist}>
              Kembalikan bawaan
            </button>
          </p>
        </div>
      </div>

      <div className="card" id="jcard" style={{ marginTop: 18, background: 'var(--l)' }}>
        <h3>Jurnal refleksi</h3>
        <p id="jplan" style={{ margin: '4px 0 0', fontWeight: 700 }}>
          {lastJournal?.tomorrow ? `Rencanamu (${lastJournal.day}): ${lastJournal.tomorrow}` : ''}
        </p>
        <label htmlFor="j1">Apa yang paling sulit hari ini?</label>
        <input id="j1" value={hardest} onChange={(event) => setHardest(event.target.value)} />
        <label htmlFor="j2">Apa yang baru kamu pahami?</label>
        <input id="j2" value={understood} onChange={(event) => setUnderstood(event.target.value)} />
        <label htmlFor="j3">Apa yang mau diulang besok?</label>
        <input id="j3" value={tomorrow} onChange={(event) => setTomorrow(event.target.value)} />
        <p style={{ margin: '12px 0 0' }}>
          <button type="button" className="btn" id="saveJ" onClick={saveJournal}>
            Simpan jurnal
          </button>
        </p>
        <div id="jlist" style={{ marginTop: 12 }}>
          {data.journal.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              style={{ borderTop: '2.5px dashed var(--line)', padding: '8px 0', fontWeight: 600 }}
            >
              <b>{entry.day}</b>{' '}
              <button type="button" className="chip" onClick={() => deleteJournal(entry.id)}>
                Hapus
              </button>
              <br />
              Sulit: {entry.hardest}
              <br />
              Baru paham: {entry.understood}
              <br />
              Ulang besok: {entry.tomorrow}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemoveItem !== null}
        title="Hapus item ini?"
        message="Item akan dihapus dari daftar ceklis harian."
        onCancel={() => setPendingRemoveItem(null)}
        onConfirm={() => pendingRemoveItem && removeItem(pendingRemoveItem)}
      />
    </>
  );
}
