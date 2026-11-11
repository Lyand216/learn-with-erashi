import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Dataset, Store } from '../lib/types';
import { emptyDataset } from '../lib/storage/local';
import { useToast } from '../components/ToastProvider';
import { DataContext, type DataContextValue, type SaveState, type Status } from './DataContext';

export function DataProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Dataset>(emptyDataset);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const dataRef = useRef(data);
  const saveTimer = useRef<number | null>(null);
  const { notify } = useToast();

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const loaded = await store.load();
      dataRef.current = loaded;
      setData(loaded);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    }
  }, [store]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: Dataset) => {
      setSaveState('saving');
      try {
        await store.save(next);
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        notify(
          `Gagal menyimpan: ${err instanceof Error ? err.message : 'koneksi bermasalah'}`,
          'bad'
        );
      }
    },
    [notify, store]
  );

  const scheduleSave = useCallback(
    (next: Dataset) => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        void persist(next);
      }, 350);
    },
    [persist]
  );

  const update = useCallback(
    (mutate: (draft: Dataset) => void) => {
      const next = structuredClone(dataRef.current);
      mutate(next);
      dataRef.current = next;
      setData(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  const replaceAll = useCallback(
    (next: Dataset) => {
      dataRef.current = next;
      setData(next);
      void persist(next);
    },
    [persist]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      status,
      error,
      data,
      update,
      replaceAll,
      reload: () => void load(),
      saveState,
      storeMode: store.mode
    }),
    [status, error, data, update, replaceAll, load, saveState, store.mode]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
