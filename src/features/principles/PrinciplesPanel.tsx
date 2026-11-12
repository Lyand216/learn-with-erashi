import { useData } from '../../state/useData';
import { NOTE_COLORS, PRINCIPLES } from '../../lib/types';

export function PrinciplesPanel() {
  useData();

  return (
    <div className="pr" id="pr">
      {PRINCIPLES.map((principle) => (
        <article
          key={principle.title}
          className="note"
          style={{ background: NOTE_COLORS[principle.color] }}
        >
          <h3>{principle.title}</h3>
          <p>{principle.body}</p>
        </article>
      ))}
    </div>
  );
}
