import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { NOTE_COLORS, NOTE_KINDS, type Note, type NoteColor, type NoteKind } from '../../lib/types';

interface NoteDialogProps {
  open: boolean;
  note: Note | null;
  defaultTopic: string;
  topics: string[];
  onClose: () => void;
  onSave: (values: {
    title: string;
    kind: NoteKind;
    topic: string;
    body: string;
    color: NoteColor;
  }) => void;
}

export function NoteDialog({ open, note, defaultTopic, topics, onClose, onSave }: NoteDialogProps) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NoteKind>('Chunk');
  const [topic, setTopic] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('y');

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? '');
    setKind(note?.kind ?? 'Chunk');
    setTopic(note?.topic ?? defaultTopic);
    setBody(note?.body ?? '');
    setColor(note?.color ?? 'y');
  }, [open, note, defaultTopic]);

  const submit = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({ title: title.trim(), kind, topic: topic.trim(), body: body.trim(), color });
  };

  return (
    <Dialog open={open} title={note ? 'Edit catatan' : 'Catatan baru'} titleId="dnt" onClose={onClose}>
      <div className="row">
        <div>
          <label htmlFor="nt">Judul</label>
          <input
            id="nt"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Satu ide utama = satu chunk"
          />
        </div>
        <div>
          <label htmlFor="nk">Jenis</label>
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
        list="tpl-note"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="Contoh: Kriptografi"
      />
      <datalist id="tpl-note">
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

      <div className="dact">
        <button type="button" className="btn" id="addNote" onClick={submit}>
          {note ? 'Simpan perubahan' : 'Tempel catatan'}
        </button>
        <button type="button" className="btn alt" id="cancelN" onClick={onClose}>
          Batal
        </button>
      </div>
    </Dialog>
  );
}
