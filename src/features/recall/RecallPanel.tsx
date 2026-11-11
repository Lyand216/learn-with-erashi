import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { addDays, today } from '../../lib/date';
import { uid } from '../../lib/id';
import { BOX_GAPS } from '../../lib/types';

type DeckMode = 'due' | 'hard' | 'mix';

export function RecallPanel() {
  const { data, update } = useData();
  const { notify } = useToast();

  const [mode, setMode] = useState<DeckMode>('due');
  const [topicFilter, setTopicFilter] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string | null>(null);

  const [cardTopic, setCardTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const topics = useMemo(() => {
    const list: string[] = [];
    data.cards.forEach((card) => {
      if (card.topic && !list.includes(card.topic)) list.push(card.topic);
    });
    return list;
  }, [data.cards]);

  const dueCount = data.cards.filter((card) => card.due <= today()).length;
  const hardCount = data.cards.filter((card) => (card.lapse || 0) >= 2).length;

  const dueCards = useMemo(() => {
    if (mode === 'mix') return data.cards.filter((card) => card.due <= today());
    if (mode === 'hard') {
      return data.cards.filter(
        (card) => (card.lapse || 0) >= 2 && (!topicFilter || card.topic === topicFilter)
      );
    }
    return data.cards.filter((card) => card.due <= today() && (!topicFilter || card.topic === topicFilter));
  }, [data.cards, mode, topicFilter]);

  const current = useMemo(() => {
    const picked = data.cards.find((card) => card.id === currentId);
    if (picked) return picked;
    return dueCards[0] ?? null;
  }, [data.cards, currentId, dueCards]);

  useEffect(() => {
    if (flipped) return;
    if (currentId && dueCards.some((card) => card.id === currentId)) return;
    if (!dueCards.length) {
      setCurrentId(null);
      return;
    }
    let pool = dueCards;
    if (mode === 'mix') {
      const other = dueCards.filter((card) => card.topic !== lastTopic);
      if (other.length) pool = other;
    }
    const picked =
      mode === 'due'
        ? pool[0]
        : pool[Math.floor(Math.random() * pool.length)];
    setCurrentId(picked.id);
  }, [dueCards, flipped, currentId, mode, lastTopic]);

  const rate = (remembered: boolean) => {
    if (!current) return;
    setLastTopic(current.topic);
    update((draft) => {
      const card = draft.cards.find((item) => item.id === current.id);
      if (!card) return;
      card.lapse = Math.max(0, (card.lapse || 0) + (remembered ? -1 : 1));
      card.box = remembered ? Math.min(card.box + 1, BOX_GAPS.length - 1) : 0;
      card.due = remembered ? addDays(today(), Math.max(BOX_GAPS[card.box], 1)) : today();
      if (!remembered) {
        const index = draft.cards.indexOf(card);
        draft.cards.splice(index, 1);
        draft.cards.push(card);
      }
    });
    setFlipped(false);
    notify(remembered ? 'Kartu naik satu kotak.' : 'Kartu ditahan, besok diulang lagi.', 'ok');
  };

  const saveCard = () => {
    if (!question.trim() || !answer.trim()) {
      notify('Pertanyaan dan jawaban wajib diisi.', 'bad');
      return;
    }
    update((draft) => {
      if (editingId) {
        const card = draft.cards.find((item) => item.id === editingId);
        if (card) {
          card.question = question.trim();
          card.answer = answer.trim();
          card.topic = cardTopic.trim();
        }
      } else {
        draft.cards.push({
          id: uid(),
          question: question.trim(),
          answer: answer.trim(),
          topic: cardTopic.trim(),
          box: 0,
          lapse: 0,
          due: today()
        });
      }
    });
    notify(editingId ? 'Kartu diperbarui.' : 'Kartu disimpan.', 'ok');
    setQuestion('');
    setAnswer('');
    setCardTopic('');
    setEditingId(null);
    setFlipped(false);
  };

  const startEdit = () => {
    if (!current) return;
    setEditingId(current.id);
    setQuestion(current.question);
    setAnswer(current.answer);
    setCardTopic(current.topic);
    document.getElementById('cq')?.focus();
  };

  const removeCard = (id: string) => {
    update((draft) => {
      draft.cards = draft.cards.filter((card) => card.id !== id);
    });
    if (currentId === id) setCurrentId(null);
    if (editingId === id) {
      setEditingId(null);
      setQuestion('');
      setAnswer('');
      setCardTopic('');
    }
    setFlipped(false);
    notify('Kartu dihapus.', 'ok');
    setPendingDelete(null);
  };

  const switchMode = (next: DeckMode) => {
    setMode(next);
    setFlipped(false);
    setCurrentId(null);
  };

  return (
    <>
      <div className="rm" id="rm" role="group" aria-label="Pilihan dek kartu">
        <button
          type="button"
          className={`btn ${mode === 'due' ? 'on' : ''}`}
          onClick={() => switchMode('due')}
          aria-pressed={mode === 'due'}
        >
          Jatuh tempo ({dueCount})
        </button>
        <button
          type="button"
          className={`btn ${mode === 'hard' ? 'on' : ''}`}
          onClick={() => switchMode('hard')}
          aria-pressed={mode === 'hard'}
        >
          Sulit diingat ({hardCount})
        </button>
        <button
          type="button"
          className={`btn ${mode === 'mix' ? 'on' : ''}`}
          onClick={() => switchMode('mix')}
          aria-pressed={mode === 'mix'}
        >
          Campur topik ({dueCount})
        </button>
      </div>

      <div
        id="rflt"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}
        role="group"
        aria-label="Filter topik kartu"
      >
        {topics.length && mode !== 'mix'
          ? ['Semua', ...topics].map((item) => {
              const value = item === 'Semua' ? '' : item;
              return (
                <button
                  key={item}
                  type="button"
                  className={`chip ${value === topicFilter ? 'on' : ''}`}
                  onClick={() => {
                    setTopicFilter(value);
                    setCurrentId(null);
                    setFlipped(false);
                  }}
                  aria-pressed={value === topicFilter}
                >
                  {item}
                </button>
              );
            })
          : null}
      </div>

      <div className="card fc" id="fc">
        {!data.cards.length ? (
          <>
            <div className="q">Belum ada kartu</div>
            <div>Tambah kartu di bawah, atau ubah catatan jadi kartu.</div>
          </>
        ) : !dueCards.length ? (
          mode === 'hard' ? (
            <>
              <div className="q">Belum ada kartu sulit</div>
              <div>
                Kartu yang kamu lupakan dua kali atau lebih akan berkumpul di sini. Setiap kali kamu
                ingat, nilainya turun sampai kartu keluar dari daftar.
              </div>
            </>
          ) : (
            <>
              <div className="q">Semua kartu sudah diulang hari ini</div>
              <div>Kembali besok, jarak ulangan makin panjang kalau kamu ingat.</div>
            </>
          )
        ) : current ? (
          <>
            <small style={{ fontWeight: 800 }}>
              {dueCards.length} kartu menunggu{current.topic ? ` · ${current.topic}` : ''}
            </small>
            <div className="q">{current.question}</div>
            {flipped ? (
              <>
                <div className="a">{current.answer}</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn p" onClick={() => rate(false)}>
                    Lupa
                  </button>
                  <button type="button" className="btn m" onClick={() => rate(true)}>
                    Ingat
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>Coba jawab dari ingatan dulu, baru intip.</div>
                <div>
                  <button type="button" className="btn" onClick={() => setFlipped(true)}>
                    Lihat jawaban
                  </button>
                </div>
              </>
            )}
            <div>
              <button type="button" className="chip" onClick={startEdit}>
                Edit kartu
              </button>{' '}
              <button type="button" className="chip" onClick={() => setPendingDelete(current.id)}>
                Hapus kartu
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="q">Belum ada kartu untuk ditagih</div>
            <div>Pilih mode lain atau tambahkan kartu baru di bawah.</div>
          </>
        )}
      </div>

      <div className="boxes" id="boxes">
        {BOX_GAPS.map((_, index) => (
          <span key={index}>
            Kotak {index + 1}: {data.cards.filter((card) => card.box === index).length}
          </span>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>{editingId ? 'Edit kartu' : 'Tambah kartu'}</h3>
        <label htmlFor="cqt">Topik (opsional)</label>
        <input
          id="cqt"
          list="tpl"
          value={cardTopic}
          onChange={(event) => setCardTopic(event.target.value)}
          placeholder="Contoh: Kriptografi"
        />
        <label htmlFor="cq">Pertanyaan</label>
        <input id="cq" value={question} onChange={(event) => setQuestion(event.target.value)} />
        <label htmlFor="ca">Jawaban</label>
        <textarea
          id="ca"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          style={{ minHeight: 70 }}
        />
        <p style={{ margin: '12px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn s" id="addCard" onClick={saveCard}>
            {editingId ? 'Simpan perubahan' : 'Simpan kartu'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="btn alt"
              onClick={() => {
                setEditingId(null);
                setQuestion('');
                setAnswer('');
                setCardTopic('');
              }}
            >
              Batal edit
            </button>
          ) : null}
        </p>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus kartu?"
        message="Kartu ini akan hilang dari dek recall dan tidak bisa dikembalikan."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeCard(pendingDelete)}
      />
    </>
  );
}
