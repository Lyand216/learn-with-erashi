import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../state/useData';
import { useToast } from '../../components/ToastProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CardDialog } from './CardDialog';
import { addDays, today } from '../../lib/date';
import { uid } from '../../lib/id';
import { BOX_GAPS, type Card } from '../../lib/types';

type DeckMode = 'due' | 'hard' | 'mix';

interface RecallPanelProps {
  fabRequest: number;
  onFabHandled: () => void;
}

export function RecallPanel({ fabRequest, onFabHandled }: RecallPanelProps) {
  const { data, update } = useData();
  const { notify } = useToast();

  const [mode, setMode] = useState<DeckMode>('due');
  const [topicFilter, setTopicFilter] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState('');

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
    return data.cards.filter(
      (card) => card.due <= today() && (!topicFilter || card.topic === topicFilter)
    );
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
    const picked = mode === 'due' ? pool[0] : pool[Math.floor(Math.random() * pool.length)];
    setCurrentId(picked.id);
  }, [dueCards, flipped, currentId, mode, lastTopic]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  useEffect(() => {
    if (fabRequest <= 0) return;
    setEditing(null);
    setDialogOpen(true);
    onFabHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabRequest]);

  const rate = (remembered: boolean) => {
    if (!current) return;
    setLastTopic(current.topic);
    update((draft) => {
      const card = draft.cards.find((item) => item.id === current.id);
      if (!card) return;
      draft.reviews.unshift({
        id: uid(),
        day: today(),
        createdAt: new Date().toISOString()
      });
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

  const saveCard = (
    values: { question: string; answer: string; topic: string },
    again: boolean
  ) => {
    update((draft) => {
      if (editing) {
        const card = draft.cards.find((item) => item.id === editing.id);
        if (card) {
          card.question = values.question;
          card.answer = values.answer;
          card.topic = values.topic;
        }
      } else {
        draft.cards.push({
          id: uid(),
          question: values.question,
          answer: values.answer,
          topic: values.topic,
          box: 0,
          lapse: 0,
          due: today()
        });
      }
    });
    notify(editing ? 'Kartu diperbarui.' : 'Kartu disimpan.', 'ok');
    if (again) {
      setEditing(null);
    } else {
      closeDialog();
      setFlipped(false);
    }
  };

  const removeCard = (id: string) => {
    update((draft) => {
      draft.cards = draft.cards.filter((card) => card.id !== id);
    });
    if (currentId === id) setCurrentId(null);
    if (editing?.id === id) {
      setEditing(null);
      setQuestionReset();
    }
    setFlipped(false);
    notify('Kartu dihapus.', 'ok');
    setPendingDelete(null);
  };

  const setQuestionReset = () => {
    setEditing(null);
    setDialogOpen(false);
  };

  const filteredCards = useMemo(() => {
    const needle = cardSearch.trim().toLowerCase();
    if (!needle) return data.cards;
    return data.cards.filter((card) =>
      `${card.question} ${card.answer} ${card.topic}`.toLowerCase().includes(needle)
    );
  }, [data.cards, cardSearch]);

  return (
    <>
      <div className="rm" id="rm" role="group" aria-label="Pilihan dek kartu">
        <button
          type="button"
          className={`btn ${mode === 'due' ? 'on' : ''}`}
          onClick={() => {
            setMode('due');
            setFlipped(false);
            setCurrentId(null);
          }}
          aria-pressed={mode === 'due'}
        >
          Jatuh tempo ({dueCount})
        </button>
        <button
          type="button"
          className={`btn ${mode === 'hard' ? 'on' : ''}`}
          onClick={() => {
            setMode('hard');
            setFlipped(false);
            setCurrentId(null);
          }}
          aria-pressed={mode === 'hard'}
        >
          Sulit diingat ({hardCount})
        </button>
        <button
          type="button"
          className={`btn ${mode === 'mix' ? 'on' : ''}`}
          onClick={() => {
            setMode('mix');
            setFlipped(false);
            setCurrentId(null);
          }}
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
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setEditing(current);
                  setDialogOpen(true);
                }}
              >
                Edit kartu
              </button>{' '}
              <button type="button" className="chip" onClick={() => setPendingDelete(current.id)}>
                Hapus kartu
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="boxes" id="boxes">
        {BOX_GAPS.map((_, index) => (
          <span key={index}>
            Kotak {index + 1}: {data.cards.filter((card) => card.box === index).length}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          className="btn s"
          id="newC"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          + Tambah kartu
        </button>
      </div>

      <details className="card" id="allC" style={{ marginTop: 18 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
          Semua kartu (<span id="nC">{data.cards.length}</span>)
        </summary>
        <input
          id="cs"
          type="search"
          placeholder="Cari kartu..."
          aria-label="Cari kartu"
          style={{ margin: '12px 0' }}
          value={cardSearch}
          onChange={(event) => setCardSearch(event.target.value)}
        />
        <div id="clist">
          {filteredCards.length ? (
            filteredCards.map((card) => (
              <div className="clist-row" key={card.id}>
                <span>
                  {card.question}
                  {card.topic ? (
                    <>
                      {' '}
                      <small>· {card.topic}</small>
                    </>
                  ) : null}
                </span>
                <span>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setEditing(card);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </button>{' '}
                  <button type="button" className="chip" onClick={() => setPendingDelete(card.id)}>
                    Hapus
                  </button>
                </span>
              </div>
            ))
          ) : (
            <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Belum ada kartu.</p>
          )}
        </div>
      </details>

      <CardDialog
        open={dialogOpen}
        card={editing}
        defaultTopic={topicFilter}
        topics={topics}
        onClose={closeDialog}
        onSave={saveCard}
      />

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
