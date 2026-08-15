export interface AppSettings {
  mock_mode_enabled: boolean;
}

export const fetchAppSettings = async (): Promise<AppSettings> => {
  const res = await fetch('/api/app-settings');
  if (!res.ok) {
    return { mock_mode_enabled: false };
  }
  return res.json();
};
