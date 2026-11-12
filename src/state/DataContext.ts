import { createContext } from 'react';
import type { Dataset, StoreMode } from '../lib/types';

export type Status = 'loading' | 'ready' | 'error';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface DataContextValue {
  status: Status;
  error: string | null;
  data: Dataset;
  update: (mutate: (draft: Dataset) => void) => void;
  replaceAll: (next: Dataset) => void;
  reload: () => void;
  wipe: () => Promise<void>;
  saveState: SaveState;
  storeMode: StoreMode;
}

export const DataContext = createContext<DataContextValue | null>(null);
