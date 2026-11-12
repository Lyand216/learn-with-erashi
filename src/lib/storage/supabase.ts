import type { Store } from '../types';
import { supabase } from '../supabaseClient';
import { emptyDataset } from './local';

function requireClient() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  return supabase;
}

export const supabaseStore: Store = {
  mode: 'cloud',
  async load() {
    const client = requireClient();
    const [notes, cards, sessions, reviews, journal, checklist, checklistItems, settings] =
      await Promise.all([
        client.from('notes').select('*').order('position', { ascending: true }),
        client.from('cards').select('*').order('position', { ascending: true }),
        client.from('focus_sessions').select('*').order('position', { ascending: true }),
        client.from('reviews').select('*').order('created_at', { ascending: false }),
        client.from('journal').select('*').order('position', { ascending: true }),
        client.from('checklist').select('day,item_id,done'),
        client.from('checklist_items').select('item_id,text,position').order('position'),
        client.from('settings').select('focus_minutes,diffuse_minutes,theme,seen').maybeSingle()
      ]);

    const firstError = [notes, cards, sessions, reviews, journal, checklist, checklistItems, settings].find(
      (r) => r.error
    );
    if (firstError?.error) throw firstError.error;

    const data = emptyDataset();

    for (const row of notes.data ?? []) {
      data.notes.push({
        id: row.id,
        title: row.title ?? '',
        kind: row.kind ?? 'Chunk',
        topic: row.topic ?? '',
        body: row.body ?? '',
        color: row.color ?? 'y',
        date: row.note_date ?? ''
      });
    }

    for (const row of cards.data ?? []) {
      data.cards.push({
        id: row.id,
        question: row.question ?? '',
        answer: row.answer ?? '',
        topic: row.topic ?? '',
        box: row.box ?? 0,
        lapse: row.lapse ?? 0,
        due: row.due ?? ''
      });
    }

    for (const row of sessions.data ?? []) {
      data.sessions.push({
        id: row.id,
        day: row.day ?? '',
        minutes: row.minutes ?? 0,
        mode: row.mode === 'diffuse' ? 'diffuse' : 'focus',
        topic: row.topic ?? '',
        createdAt: row.created_at ?? ''
      });
    }

    for (const row of reviews.data ?? []) {
      data.reviews.push({
        id: row.id,
        day: row.day ?? '',
        createdAt: row.created_at ?? ''
      });
    }

    for (const row of journal.data ?? []) {
      data.journal.push({
        id: row.id,
        day: row.day ?? '',
        hardest: row.hardest ?? '',
        understood: row.understood ?? '',
        tomorrow: row.tomorrow ?? '',
        createdAt: row.created_at ?? ''
      });
    }

    for (const row of checklist.data ?? []) {
      if (!row.day) continue;
      const record = data.checklist[row.day] ?? {};
      record[row.item_id] = Boolean(row.done);
      data.checklist[row.day] = record;
    }

    const items = (checklistItems.data ?? []).map((row) => ({
      id: row.item_id,
      text: row.text ?? ''
    }));
    if (items.length) data.checklistItems = items;

    if (settings.data) {
      data.settings = {
        focusMinutes: settings.data.focus_minutes ?? 25,
        diffuseMinutes: settings.data.diffuse_minutes ?? 5,
        theme: settings.data.theme === 'light' || settings.data.theme === 'dark' ? settings.data.theme : null,
        seen: Boolean(settings.data.seen)
      };
    }

    return data;
  },

  async save(dataset) {
    const client = requireClient();
    const payload = {
      notes: dataset.notes.map((n, index) => ({
        id: n.id,
        title: n.title,
        kind: n.kind,
        topic: n.topic,
        body: n.body,
        color: n.color,
        note_date: n.date,
        position: index
      })),
      cards: dataset.cards.map((c, index) => ({
        id: c.id,
        question: c.question,
        answer: c.answer,
        topic: c.topic,
        box: c.box,
        lapse: c.lapse,
        due: c.due,
        position: index
      })),
      sessions: dataset.sessions.map((s, index) => ({
        id: s.id,
        day: s.day,
        minutes: s.minutes,
        mode: s.mode,
        topic: s.topic,
        position: index
      })),
      reviews: dataset.reviews.map((r, index) => ({
        id: r.id,
        day: r.day,
        position: index
      })),
      journal: dataset.journal.map((j, index) => ({
        id: j.id,
        day: j.day,
        hardest: j.hardest,
        understood: j.understood,
        tomorrow: j.tomorrow,
        position: index
      })),
      checklist: dataset.checklist,
      checklist_items: dataset.checklistItems.map((item, index) => ({
        item_id: item.id,
        text: item.text,
        position: index
      })),
      settings: {
        focus_minutes: dataset.settings.focusMinutes,
        diffuse_minutes: dataset.settings.diffuseMinutes,
        theme: dataset.settings.theme,
        seen: dataset.settings.seen
      }
    };

    const { error } = await client.rpc('save_dataset', { payload });
    if (error) throw error;
  },

  async wipe() {
    const client = requireClient();
    const { error } = await client.rpc('wipe_dataset');
    if (error) throw error;
  }
};
