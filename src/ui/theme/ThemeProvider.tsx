import { createContext, useContext, type ReactNode } from 'react';

import { theme, type Theme } from './index';

/**
 * Şu an tek bir açık tema var. Provider, ileride koyu tema / dinamik tema
 * eklemeyi prop-drilling olmadan mümkün kılmak için bilinçli bir soyutlama.
 */
const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
