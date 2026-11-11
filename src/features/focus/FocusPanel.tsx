import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { formatClock, today } from '../../lib/date';
import { uid } from '../../lib/id';
import { TIMER_HINTS } from '../../lib/types';

type Mode = 'focus' | 'diffuse';

const PRESETS = [
  { value: '25,5', label: '25 / 5 menit' },
  { value: '50,10', label: '50 / 10 menit' },
  { value: '15,3', label: '15 / 3 menit' }
];

export function FocusPanel({ onGoToNotes }: { onGoToNotes: () => void }) {
  const { data, update } = useData();
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
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
          modeRef.current === 'focus' ? 'Sesi fokus selesai. Saatnya santai!' : 'Istirahat selesai. Ayo fokus lagi!'
        );
      }
    } catch {
      // Notifikasi ditolak browser, timer tetap berjalan normal.
    }
  }, []);

  const recordSession = useCallback(
    (minutes: number, which: Mode) => {
      if (which !== 'focus' || minutes < 1) return;
      update((draft) => {
        draft.sessions.unshift({
          id: uid(),
          day: today(),
          minutes,
          mode: 'focus',
          topic: topicRef.current,
          createdAt: new Date().toISOString()
        });
      });
    },
    [update]
  );

  const finish = useCallback(() => {
    const finishedMode = modeRef.current;
    recordSession(Math.round(durationOf(finishedMode) / 60), finishedMode);
    beep();
    const nextMode: Mode = finishedMode === 'focus' ? 'diffuse' : 'focus';
    setMode(nextMode);
    setLeft(durationOf(nextMode));
    setRunning(false);
    notify(
      finishedMode === 'focus' ? 'Sesi fokus selesai. Saatnya santai!' : 'Istirahat selesai. Ayo fokus lagi!',
      'ok'
    );
  }, [beep, durationOf, notify, recordSession]);

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
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  const pause = () => {
    setRunning(false);
  };

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
    const which = mode;
    setLeft(which === 'focus' ? focus * 60 : diffuse * 60);
  };

  const startQuickFive = () => {
    prepareAudio();
    setMode('focus');
    setLeft(300);
    endAtRef.current = Date.now() + 300 * 1000;
    setRunning(true);
  };

  const stopAndSave = () => {
    const elapsed = durationOf(mode) - left;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    setRunning(false);
    recordSession(minutes, mode);
    setLeft(durationOf(mode));
    notify(`Sesi dicatat: ${minutes} menit`, 'ok');
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
    onGoToNotes();
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

  const todaySessions = data.sessions.filter((s) => s.day === today() && s.mode === 'focus');
  const minutesToday = todaySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const presetValue = `${data.settings.focusMinutes},${data.settings.diffuseMinutes}`;
  const lastJournal = data.journal[0];

  return (
    <>
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
          {running ? (
            <button type="button" className="btn alt" onClick={stopAndSave}>
              Selesai &amp; catat
            </button>
          ) : null}
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
          {minutesToday > 0 ? <span>{minutesToday} menit hari ini</span> : null}
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
        <label htmlFor="pre">Sebelum belajar: tebak apa yang akan kamu pelajari atau sudah kamu ketahui</label>
        <textarea
          id="pre"
          value={pre}
          onChange={(event) => setPre(event.target.value)}
          style={{ minHeight: 60 }}
          placeholder="Tebakan yang salah pun tidak apa-apa. Ini menyiapkan otakmu."
        />
        <label htmlFor="sessLog">
          Setelah selesai: tulis yang kamu ingat tanpa melihat materi, lalu bandingkan dengan tebakan awalmu
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

      <div className="card tinted" style={{ marginTop: 18, background: 'var(--l)' }}>
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
    </>
  );
}
