import { useEffect } from 'react';
import { useData } from '../state/useData';

/**
 * Tema terang/gelap. Kalau belum pernah dipilih, mengikuti setelan sistem
 * (lewat aturan CSS prefers-color-scheme).
 */
export function useTheme() {
  const { data, update } = useData();
  const theme = data.settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
  }, [theme]);

  const toggleTheme = () => {
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const current = theme ?? (systemDark ? 'dark' : 'light');
    update((draft) => {
      draft.settings.theme = current === 'dark' ? 'light' : 'dark';
    });
  };

  return { theme, toggleTheme };
}
