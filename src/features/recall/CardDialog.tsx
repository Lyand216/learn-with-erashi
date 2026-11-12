import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import type { Card } from '../../lib/types';

interface CardDialogProps {
  open: boolean;
  card: Card | null;
  defaultTopic: string;
  topics: string[];
  onClose: () => void;
  onSave: (values: { question: string; answer: string; topic: string }, again: boolean) => void;
}

export function CardDialog({ open, card, defaultTopic, topics, onClose, onSave }: CardDialogProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuestion(card?.question ?? '');
    setAnswer(card?.answer ?? '');
    setTopic(card?.topic ?? defaultTopic);
  }, [open, card, defaultTopic]);

  const submit = (again: boolean) => {
    if (!question.trim() || !answer.trim()) return;
    onSave(
      { question: question.trim(), answer: answer.trim(), topic: topic.trim() },
      again
    );
  };

  return (
    <Dialog open={open} title={card ? 'Edit kartu' : 'Kartu baru'} titleId="dct" onClose={onClose}>
      <label htmlFor="cqt">Topik (opsional)</label>
      <input
        id="cqt"
        list="tpl-card"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="Contoh: Kriptografi"
      />
      <datalist id="tpl-card">
        {topics.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      <label htmlFor="cq">Pertanyaan</label>
      <input id="cq" value={question} onChange={(event) => setQuestion(event.target.value)} />

      <label htmlFor="ca">Jawaban</label>
      <textarea
        id="ca"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        style={{ minHeight: 70 }}
      />

      <div className="dact">
        <button type="button" className="btn s" id="addCard" onClick={() => submit(false)}>
          {card ? 'Simpan perubahan' : 'Simpan kartu'}
        </button>
        {!card ? (
          <button type="button" className="btn alt" id="addCard2" onClick={() => submit(true)}>
            Simpan &amp; tambah lagi
          </button>
        ) : null}
        <button type="button" className="btn alt" id="cancelC" onClick={onClose}>
          Batal
        </button>
      </div>
    </Dialog>
  );
}
