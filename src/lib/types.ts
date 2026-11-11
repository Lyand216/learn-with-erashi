export type NoteColor = 'y' | 'p' | 'm' | 's' | 'l' | 'o';

export type NoteKind = 'Chunk' | 'Analogi' | 'Pertanyaan' | 'Kesalahan';

export interface Note {
  id: string;
  title: string;
  kind: NoteKind;
  topic: string;
  body: string;
  color: NoteColor;
  date: string;
}

export interface Card {
  id: string;
  question: string;
  answer: string;
  topic: string;
  box: number;
  lapse: number;
  due: string;
}

export interface FocusSession {
  id: string;
  day: string;
  minutes: number;
  mode: 'focus' | 'diffuse';
  topic: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  day: string;
  hardest: string;
  understood: string;
  tomorrow: string;
  createdAt: string;
}

export interface Settings {
  focusMinutes: number;
  diffuseMinutes: number;
}

export interface Dataset {
  notes: Note[];
  cards: Card[];
  sessions: FocusSession[];
  journal: JournalEntry[];
  /** day -> id item -> sudah dicek */
  checklist: Record<string, Record<string, boolean>>;
  settings: Settings;
}

export type StoreMode = 'local' | 'cloud';

export interface Store {
  mode: StoreMode;
  load(): Promise<Dataset>;
  save(dataset: Dataset): Promise<void>;
}

export const NOTE_COLORS: Record<NoteColor, string> = {
  y: '#ffe27a',
  p: '#ffa6c9',
  m: '#8de6bf',
  s: '#95d6ff',
  l: '#cdb4ff',
  o: '#ffb98a'
};

export const NOTE_KINDS: NoteKind[] = ['Chunk', 'Analogi', 'Pertanyaan', 'Kesalahan'];

/** Jarak ulangan kartu (Leitner): makin tinggi kotaknya, makin jarang kartu muncul. */
export const BOX_GAPS = [0, 1, 3, 7, 14];

export const CHECKLIST_ITEMS = [
  { id: 'sleep', label: 'Tidur cukup semalam' },
  { id: 'noPhone', label: 'Satu sesi fokus tanpa HP' },
  { id: 'recall', label: 'Satu sesi recall tanpa lihat materi' },
  { id: 'walk', label: 'Gerak badan atau jalan kaki' },
  { id: 'cards', label: 'Ulang kartu yang jatuh tempo' }
];

export const PRINCIPLES: Array<{ title: string; color: NoteColor; body: string }> = [
  {
    title: 'Mode fokus & mode santai',
    color: 'p',
    body: 'Otak punya dua mode. Fokus untuk memahami, santai untuk menyambung ide. Selang-seling keduanya, jangan belajar nonstop.'
  },
  {
    title: 'Chunking',
    color: 'y',
    body: 'Pecah materi jadi potongan kecil yang bermakna. Pahami satu chunk sampai bisa dijelaskan, lalu gabungkan.'
  },
  {
    title: 'Recall, bukan baca ulang',
    color: 's',
    body: 'Tutup buku, lalu ingat-ingat isinya. Menarik ingatan keluar lebih kuat daripada membaca berulang.'
  },
  {
    title: 'Ulangi berjarak',
    color: 'm',
    body: 'Ulang hari ini, besok, lalu minggu depan. Belajar sekali lama kalah dari beberapa kali singkat.'
  },
  {
    title: 'Hati-hati ilusi paham',
    color: 'o',
    body: 'Materi terasa familiar saat dibaca belum tentu kamu menguasainya. Uji dirimu dengan soal.'
  },
  {
    title: 'Analogi & metafora',
    color: 'l',
    body: 'Hubungkan konsep baru dengan hal yang sudah kamu tahu. Gambarnya ikut membantu ingatan.'
  },
  {
    title: 'Lawan penundaan',
    color: 'p',
    body: 'Mulai dengan 25 menit saja. Fokus pada proses, bukan pada hasil yang bikin cemas.'
  },
  {
    title: 'Tidur & gerak',
    color: 'm',
    body: 'Tidur membersihkan racun otak dan memperkuat ingatan. Olahraga ringan membantu belajar.'
  },
  {
    title: 'Interleaving',
    color: 's',
    body: 'Campur beberapa jenis soal dalam satu sesi supaya kamu tahu kapan memakai metode yang mana.'
  }
];

export const TIMER_HINTS = {
  focus:
    'Matikan notifikasi, lalu fokus ke satu hal saja. Otakmu sedang membangun chunk.',
  diffuse:
    'Jauhi layar belajar: jalan kaki, minum, atau rebahan. Otak tetap bekerja di latar belakang.'
};
