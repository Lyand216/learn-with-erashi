import { useData } from '../../state/useData';
import { today } from '../../lib/date';
import { CHECKLIST_ITEMS, NOTE_COLORS, PRINCIPLES } from '../../lib/types';

export function PrinciplesPanel() {
  const { data, update } = useData();
  const day = today();
  const checked = data.checklist[day] ?? {};
  const doneCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;

  const toggle = (id: string, value: boolean) => {
    update((draft) => {
      const record = draft.checklist[day] ?? {};
      record[id] = value;
      draft.checklist[day] = record;
    });
  };

  return (
    <>
      <div className="card chk tinted" style={{ marginBottom: 20, background: 'var(--y)' }}>
        <h3>Ceklis hari ini</h3>
        <p style={{ margin: '4px 0 0', fontWeight: 700 }}>
          {doneCount} dari {CHECKLIST_ITEMS.length} habit tercentang
        </p>
        <div id="chk">
          {CHECKLIST_ITEMS.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={(event) => toggle(item.id, event.target.checked)}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div className="pr" id="pr">
        {PRINCIPLES.map((principle) => (
          <article key={principle.title} className="note" style={{ background: NOTE_COLORS[principle.color] }}>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
