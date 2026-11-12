import type {
  Card,
  Dataset,
  JournalEntry,
  Note,
  NoteColor,
  NoteKind,
  ReviewRecord,
  Store,
  Theme
} from '../types';
import { DEFAULT_CHECKLIST, LEGACY_CHECKLIST_IDS, NOTE_COLORS } from '../types';

const KEY = 'lhl-v2';
const LEGACY_KEY = 'lhl';

export const emptyDataset = (): Dataset => ({
  notes: [],
  cards: [],
  sessions: [],
  reviews: [],
  journal: [],
  checklist: {},
  checklistItems: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
  settings: { focusMinutes: 25, diffuseMinutes: 5, theme: null, seen: false }
});

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown): boolean {
  return value === true || value === 1;
}

function color(value: unknown): NoteColor {
  return typeof value === 'string' && value in NOTE_COLORS ? (value as NoteColor) : 'y';
}

function kind(value: unknown): NoteKind {
  const allowed: NoteKind[] = ['Chunk', 'Analogi', 'Pertanyaan', 'Kesalahan'];
  return typeof value === 'string' && allowed.includes(value as NoteKind) ? (value as NoteKind) : 'Chunk';
}

function theme(value: unknown): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** Id item ceklis lama (angka atau nama tetap) dipetakan ke id baru d0..d4. */
function checklistItemId(key: string): string {
  if (/^\d+$/.test(key)) return `d${key}`;
  return LEGACY_CHECKLIST_IDS[key] ?? key;
}

/** Menerima data versi baru maupun data dari file HTML lama (lama: t/k/b/c/d/tp). */
export function normalizeDataset(raw: unknown): Dataset {
  const data = emptyDataset();
  if (!raw || typeof raw !== 'object') return data;
  const src = raw as Record<string, unknown>;

  if (Array.isArray(src.notes)) {
    data.notes = src.notes
      .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
      .map((n) => {
        const note: Note = {
          id: str(n.id) || `n${Math.random().toString(36).slice(2, 10)}`,
          title: str(n.title, str(n.t)),
          kind: kind(n.kind ?? n.k),
          topic: str(n.topic, str(n.tp)),
          body: str(n.body, str(n.b)),
          color: color(n.color ?? n.c),
          date: str(n.date, str(n.d))
        };
        return note;
      });
  }

  if (Array.isArray(src.cards)) {
    data.cards = src.cards
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c) => {
        const card: Card = {
          id: str(c.id) || `c${Math.random().toString(36).slice(2, 10)}`,
          question: str(c.question, str(c.q)),
          answer: str(c.answer, str(c.a)),
          topic: str(c.topic, str(c.tp)),
          box: num(c.box),
          lapse: num(c.lapse),
          due: str(c.due)
        };
        return card;
      });
  }

  if (Array.isArray(src.sessions)) {
    data.sessions = src.sessions
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map((s) => ({
        id: str(s.id) || `s${Math.random().toString(36).slice(2, 10)}`,
        day: str(s.day),
        minutes: num(s.minutes),
        mode: s.mode === 'diffuse' ? ('diffuse' as const) : ('focus' as const),
        topic: str(s.topic),
        createdAt: str(s.createdAt, str(s.created_at))
      }));
  } else if (src.sess && typeof src.sess === 'object') {
    // Data lama menyimpan hitungan sesi per hari, tanpa durasi.
    for (const [day, count] of Object.entries(src.sess as Record<string, unknown>)) {
      for (let i = 0; i < num(count); i += 1) {
        data.sessions.push({
          id: `legacy-${day}-${i}`,
          day,
          minutes: 0,
          mode: 'focus',
          topic: '',
          createdAt: ''
        });
      }
    }
  }

  if (Array.isArray(src.reviews)) {
    data.reviews = src.reviews
      .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .map((r) => {
        const review: ReviewRecord = {
          id: str(r.id) || `r${Math.random().toString(36).slice(2, 10)}`,
          day: str(r.day),
          createdAt: str(r.createdAt, str(r.created_at))
        };
        return review;
      });
  } else if (src.rev && typeof src.rev === 'object') {
    for (const [day, count] of Object.entries(src.rev as Record<string, unknown>)) {
      for (let i = 0; i < num(count); i += 1) {
        data.reviews.push({
          id: `legacy-rev-${day}-${i}`,
          day,
          createdAt: ''
        });
      }
    }
  }

  if (Array.isArray(src.journal)) {
    data.journal = src.journal
      .filter((j): j is Record<string, unknown> => !!j && typeof j === 'object')
      .map((j) => {
        const entry: JournalEntry = {
          id: str(j.id) || `j${Math.random().toString(36).slice(2, 10)}`,
          day: str(j.day, str(j.d)),
          hardest: str(j.hardest, str(j.a)),
          understood: str(j.understood, str(j.b)),
          tomorrow: str(j.tomorrow, str(j.c)),
          createdAt: str(j.createdAt)
        };
        return entry;
      });
  }

  const legacyChecklist = src.checklist === undefined && src.chk !== undefined;
  const checklistSource =
    src.checklist && typeof src.checklist === 'object'
      ? (src.checklist as Record<string, unknown>)
      : src.chk && typeof src.chk === 'object'
        ? (src.chk as Record<string, unknown>)
        : {};
  for (const [day, items] of Object.entries(checklistSource)) {
    if (!items || typeof items !== 'object') continue;
    const record: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(items as Record<string, unknown>)) {
      if (!bool(value)) continue;
      const id = legacyChecklist ? checklistItemId(key) : LEGACY_CHECKLIST_IDS[key] ?? key;
      record[id] = true;
    }
    data.checklist[day] = record;
  }

  if (Array.isArray(src.checklistItems)) {
    const items = src.checklistItems
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c) => ({
        id: str(c.id) || `d${Math.random().toString(36).slice(2, 10)}`,
        text: str(c.text, str(c.t))
      }));
    if (items.length) data.checklistItems = items;
  } else if (Array.isArray(src.cl)) {
    const items = src.cl
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c) => ({ id: str(c.id), text: str(c.t) }));
    if (items.length) data.checklistItems = items;
  }

  const settings = src.settings as Record<string, unknown> | undefined;
  if (settings) {
    data.settings = {
      focusMinutes: num(settings.focusMinutes, data.settings.focusMinutes) || 25,
      diffuseMinutes: num(settings.diffuseMinutes, data.settings.diffuseMinutes) || 5,
      theme: theme(settings.theme),
      seen: bool(settings.seen)
    };
  } else if (typeof src.pst === 'string' && src.pst.includes(',')) {
    const [focus, diffuse] = src.pst.split(',').map((v) => num(v));
    data.settings.focusMinutes = focus || 25;
    data.settings.diffuseMinutes = diffuse || 5;
  }

  data.settings.theme = theme(src.theme) ?? data.settings.theme;
  data.settings.seen = bool(src.seen) || data.settings.seen;

  return data;
}

export function readLocalDataset(): Dataset {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return normalizeDataset(JSON.parse(stored));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return normalizeDataset(JSON.parse(legacy));
  } catch {
    // localStorage bisa diblokir (mode privat): aplikasi tetap jalan dengan data kosong.
  }
  return emptyDataset();
}

export const localStore: Store = {
  mode: 'local',
  async load() {
    return readLocalDataset();
  },
  async save(dataset) {
    localStorage.setItem(KEY, JSON.stringify(dataset));
  },
  async wipe() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  }
};
