import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { NoteDialog } from './NoteDialog';
import { today } from '../../lib/date';
import { uid } from '../../lib/id';
import { NOTE_COLORS, type Note, type NoteColor, type NoteKind } from '../../lib/types';

interface NotesPanelProps {
  fabRequest: number;
  onFabHandled: () => void;
}

export function NotesPanel({ fabRequest, onFabHandled }: NotesPanelProps) {
  const { data, update } = useData();
  const { notify } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [converted, setConverted] = useState<string[]>([]);
  // Disimpan di ref juga, supaya klik ganda tidak sempat membuat kartu kembar
  // sebelum React sempat menggambar ulang tombolnya.
  const convertedRef = useRef(new Set<string>());

  const topics = useMemo(() => {
    const list: string[] = [];
    data.notes.forEach((note) => {
      if (note.topic && !list.includes(note.topic)) list.push(note.topic);
    });
    return list;
  }, [data.notes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.notes.filter((note) => {
      if (filter && note.topic !== filter) return false;
      if (!needle) return true;
      return `${note.title} ${note.body} ${note.topic}`.toLowerCase().includes(needle);
    });
  }, [data.notes, filter, query]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  useEffect(() => {
    if (fabRequest <= 0) return;
    openNew();
    onFabHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabRequest]);

  const save = (values: {
    title: string;
    kind: NoteKind;
    topic: string;
    body: string;
    color: NoteColor;
  }) => {
    update((draft) => {
      if (editing) {
        const target = draft.notes.find((note) => note.id === editing.id);
        if (target) Object.assign(target, values);
      } else {
        draft.notes.unshift({
          id: uid(),
          title: values.title || 'Tanpa judul',
          kind: values.kind,
          topic: values.topic,
          body: values.body,
          color: values.color,
          date: today()
        });
      }
    });
    notify(editing ? 'Perubahan catatan disimpan.' : 'Catatan ditempel.', 'ok');
    closeDialog();
  };

  const remove = (id: string) => {
    update((draft) => {
      draft.notes = draft.notes.filter((note) => note.id !== id);
    });
    setPendingDelete(null);
    notify('Catatan dihapus.', 'ok');
  };

  const toCard = (note: Note) => {
    if (convertedRef.current.has(note.id)) return;
    convertedRef.current.add(note.id);
    setConverted((prev) => [...prev, note.id]);
    update((draft) => {
      draft.cards.push({
        id: uid(),
        question: note.title,
        answer: note.body,
        topic: note.topic,
        box: 0,
        lapse: 0,
        due: today()
      });
    });
    notify('Catatan diubah jadi kartu recall.', 'ok');
  };

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn" id="newN" onClick={openNew}>
          + Tambah catatan
        </button>
        <input
          id="sq"
          type="search"
          placeholder="Cari catatan..."
          aria-label="Cari catatan"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div id="flt" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
        {topics.length
          ? ['Semua', ...topics].map((item) => {
              const value = item === 'Semua' ? '' : item;
              return (
                <button
                  key={item}
                  type="button"
                  className={`chip ${value === filter ? 'on' : ''}`}
                  onClick={() => setFilter(value)}
                  aria-pressed={value === filter}
                >
                  {item}
                </button>
              );
            })
          : null}
      </div>

      <div className="notes" id="notes">
        {visible.length ? (
          visible.map((note, index) => (
            <article
              key={note.id}
              className="note"
              style={{
                background: NOTE_COLORS[note.color],
                ['--r' as string]: `${((index * 7) % 5 - 2) * 0.6}deg`
              }}
            >
              <small>
                {note.kind}
                {note.topic ? ` · ${note.topic}` : ''} · {note.date}
              </small>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
              <div className="acts">
                <button
                  type="button"
                  onClick={() => toCard(note)}
                  disabled={converted.includes(note.id)}
                >
                  {converted.includes(note.id) ? 'Sudah jadi kartu' : 'Jadikan kartu'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(note);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => setPendingDelete(note.id)}>
                  Hapus
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            {data.notes.length ? (
              'Tidak ada catatan yang cocok.'
            ) : (
              <>
                Belum ada catatan.
                <br />
                <br />
                <button type="button" className="btn" onClick={openNew}>
                  + Tulis catatan pertama
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <NoteDialog
        open={dialogOpen}
        note={editing}
        defaultTopic={filter}
        topics={topics}
        onClose={closeDialog}
        onSave={save}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus catatan?"
        message="Catatan ini akan hilang dari daftar dan tidak bisa dikembalikan."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
      />
    </>
  );
}
