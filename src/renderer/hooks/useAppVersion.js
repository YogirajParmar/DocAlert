import { useState, useEffect } from 'react';
import packageJson from '../../../package.json';

const { ipcRenderer } =
  typeof window !== 'undefined' && window.require
    ? window.require('electron')
    : { ipcRenderer: null };

export const useAppVersion = () => {
  const [version, setVersion] = useState(
    () => (ipcRenderer ? null : packageJson.version)
  );

  useEffect(() => {
    if (!ipcRenderer) return;

    ipcRenderer
      .invoke('get-app-version')
      .then(setVersion)
      .catch((error) => {
        console.error('Error fetching app version:', error);
        setVersion(packageJson.version);
      });
  }, []);

  return version;
};
