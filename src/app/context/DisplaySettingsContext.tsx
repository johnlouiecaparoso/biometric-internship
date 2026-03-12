import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserSettings, saveUserSettings } from '../lib/supabaseApi';

export interface DisplaySettings {
  compactView: boolean;
  show24h: boolean;
  darkMode: boolean;
}

interface DisplaySettingsContextType {
  display: DisplaySettings;
  setDisplay: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  formatTime: (d: Date) => string;
  formatShortTime: (d: Date) => string;
}

const defaults: DisplaySettings = { compactView: false, show24h: false, darkMode: false };

const DisplaySettingsContext = createContext<DisplaySettingsContextType>({
  display: defaults,
  setDisplay: () => {},
  formatTime: () => '',
  formatShortTime: () => '',
});

export function DisplaySettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [display, setDisplay] = useState<DisplaySettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  // Apply / remove the Tailwind dark-mode class whenever darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', display.darkMode);
  }, [display.darkMode]);

  useEffect(() => {
    if (!user) return;
    fetchUserSettings(user.id)
      .then((data) => {
        if (data?.display) {
          setDisplay((prev) => ({ ...prev, ...data.display }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !display.show24h,
    });

  const formatShortTime = (d: Date) =>
    d.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !display.show24h,
    });

  return (
    <DisplaySettingsContext.Provider value={{ display, setDisplay, formatTime, formatShortTime }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  return useContext(DisplaySettingsContext);
}
