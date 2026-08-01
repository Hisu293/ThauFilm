import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'thaufilm_color_mode';
const ColorModeContext = createContext(null);

const initialMode = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.colorMode = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    isDark: mode === 'dark',
    setMode,
    toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [mode]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error('useColorMode must be used inside ColorModeProvider');
  return context;
};

export default ColorModeContext;
