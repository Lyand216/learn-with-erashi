import { useMemo } from 'react';
import { useData } from '../../state/useData';
import { ymd } from '../../lib/date';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function ProgressPanel() {
  const { data } = useData();

  const stats = useMemo(() => {
    const focusByDay = new Map<string, number>();
    const reviewByDay = new Map<string, number>();

    data.sessions.forEach((session) => {
      if (session.mode !== 'focus') return;
      focusByDay.set(session.day, (focusByDay.get(session.day) ?? 0) + 1);
    });
    data.reviews.forEach((review) => {
      reviewByDay.set(review.day, (reviewByDay.get(review.day) ?? 0) + 1);
    });

    const days: Array<{ key: string; name: string; focus: number; review: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = ymd(date);
      days.push({
        key,
        name: DAY_NAMES[date.getDay()],
        focus: focusByDay.get(key) ?? 0,
        review: reviewByDay.get(key) ?? 0
      });
    }

    let streak = 0;
    const cursor = new Date();
    if (!(focusByDay.get(ymd(cursor)) || reviewByDay.get(ymd(cursor)))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (focusByDay.get(ymd(cursor)) || reviewByDay.get(ymd(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const totalFocus = [...focusByDay.values()].reduce((sum, value) => sum + value, 0);
    const totalReview = [...reviewByDay.values()].reduce((sum, value) => sum + value, 0);

    return { days, streak, totalFocus, totalReview };
  }, [data.sessions, data.reviews]);

  const max = Math.max(
    1,
    ...stats.days.map((day) => Math.max(day.focus, day.review))
  );

  const barHeight = (value: number) => Math.round((value / max) * 110 + (value ? 4 : 0));

  const kpis: Array<[string, string | number]> = [
    ['Streak', `${stats.streak} hari`],
    ['Sesi fokus', stats.totalFocus],
    ['Kartu diulang', stats.totalReview],
    ['Catatan', data.notes.length],
    ['Kartu', data.cards.length]
  ];

  return (
    <>
      <div className="stat" id="kpi" style={{ justifyContent: 'flex-start', margin: '0 0 18px' }}>
        {kpis.map(([label, value]) => (
          <span key={label}>
            {label}: {value}
          </span>
        ))}
      </div>

      <div className="card">
        <h3>7 hari terakhir</h3>
        <div className="bars" id="bars">
          {stats.days.map((day) => (
            <div className="bar-day" key={day.key}>
              <div className="bar-col">
                <div
                  className="bar focus"
                  title={`Sesi fokus: ${day.focus}`}
                  style={{ height: `${barHeight(day.focus)}px` }}
                />
                <div
                  className="bar review"
                  title={`Kartu diulang: ${day.review}`}
                  style={{ height: `${barHeight(day.review)}px` }}
                />
              </div>
              {day.name}
              <br />
              {day.focus} / {day.review}
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontWeight: 700 }}>
          Merah muda = sesi fokus, biru = kartu diulang. Angka di bawah hari: sesi / kartu.
        </p>
      </div>
    </>
  );
}
