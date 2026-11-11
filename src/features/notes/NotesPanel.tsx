import { useMemo, useRef, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { today } from '../../lib/date';
import { uid } from '../../lib/id';
import { NOTE_COLORS, NOTE_KINDS, type Note, type NoteColor, type NoteKind } from '../../lib/types';

export function NotesPanel() {
  const { data, update } = useData();
  const { notify } = useToast();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NoteKind>('Chunk');
  const [topic, setTopic] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('y');
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

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

  const resetForm = () => {
    setTitle('');
    setKind('Chunk');
    setTopic('');
    setBody('');
    setColor('y');
    setEditing(null);
  };

  const save = () => {
    if (!title.trim() && !body.trim()) {
      notify('Isi judul atau isi catatan dulu.', 'bad');
      return;
    }
    update((draft) => {
      if (editing) {
        const target = draft.notes.find((note) => note.id === editing);
        if (target) {
          target.title = title.trim();
          target.kind = kind;
          target.topic = topic.trim();
          target.body = body.trim();
          target.color = color;
        }
      } else {
        draft.notes.unshift({
          id: uid(),
          title: title.trim() || 'Tanpa judul',
          kind,
          topic: topic.trim(),
          body: body.trim(),
          color,
          date: today()
        });
      }
    });
    notify(editing ? 'Perubahan catatan disimpan.' : 'Catatan ditempel.', 'ok');
    resetForm();
  };

  const startEdit = (note: Note) => {
    setEditing(note.id);
    setTitle(note.title);
    setKind(note.kind);
    setTopic(note.topic);
    setBody(note.body);
    setColor(note.color);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector<HTMLInputElement>('#nt')?.focus();
  };

  const remove = (id: string) => {
    update((draft) => {
      draft.notes = draft.notes.filter((note) => note.id !== id);
    });
    if (editing === id) resetForm();
    notify('Catatan dihapus.', 'ok');
    setPendingDelete(null);
  };

  const toCard = (note: Note) => {
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
      <div className="card" ref={formRef}>
        <div className="row">
          <div>
            <label htmlFor="nt" style={{ marginTop: 0 }}>
              Judul
            </label>
            <input
              id="nt"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Satu ide utama = satu chunk"
            />
          </div>
          <div>
            <label htmlFor="nk" style={{ marginTop: 0 }}>
              Jenis
            </label>
            <select id="nk" value={kind} onChange={(event) => setKind(event.target.value as NoteKind)}>
              {NOTE_KINDS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="ntp">Topik atau mata kuliah</label>
        <input
          id="ntp"
          list="tpl"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Contoh: Kriptografi"
        />
        <datalist id="tpl">
          {topics.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <label htmlFor="nb">Isi (pakai kata-katamu sendiri)</label>
        <textarea id="nb" value={body} onChange={(event) => setBody(event.target.value)} />

        <label id="warna-label">Warna</label>
        <div className="sw" id="sw" role="radiogroup" aria-labelledby="warna-label">
          {(Object.keys(NOTE_COLORS) as NoteColor[]).map((key) => (
            <span key={key}>
              <input
                type="radio"
                name="col"
                id={`c_${key}`}
                value={key}
                checked={color === key}
                onChange={() => setColor(key)}
              />
              <label htmlFor={`c_${key}`} style={{ background: NOTE_COLORS[key] }} title={key} />
            </span>
          ))}
        </div>

        <p style={{ margin: '14px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" id="addNote" onClick={save}>
            {editing ? 'Simpan perubahan' : 'Tempel catatan'}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn alt"
              onClick={() => {
                resetForm();
                notify('Batal edit.', 'info');
              }}
            >
              Batal edit
            </button>
          ) : null}
        </p>
      </div>

      <div id="flt" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18, alignItems: 'center' }}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari catatan..."
          aria-label="Cari catatan"
          style={{ width: 'auto', flex: '1 1 180px' }}
        />
        {topics.length ? (
          ['Semua', ...topics].map((item) => {
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
        ) : null}
        <span className="status-pill">
          {visible.length} / {data.notes.length} catatan
        </span>
      </div>

      <div className="notes" id="notes">
        {visible.length ? (
          visible.map((note, index) => (
            <article
              key={note.id}
              className="note"
              style={{ background: NOTE_COLORS[note.color], ['--r' as string]: `${((index * 7) % 5 - 2) * 0.6}deg` }}
            >
              <small>
                {note.kind}
                {note.topic ? ` · ${note.topic}` : ''} · {note.date}
              </small>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
              <div className="acts">
                <button type="button" onClick={() => toCard(note)}>
                  Jadikan kartu
                </button>
                <button type="button" onClick={() => startEdit(note)}>
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
            {data.notes.length
              ? 'Tidak ada catatan yang cocok dengan filter ini.'
              : 'Belum ada catatan. Tulis satu ide dengan kata-katamu sendiri, lalu tempel di sini.'}
          </div>
        )}
      </div>

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
