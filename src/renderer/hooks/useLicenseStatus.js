import { useEffect, useState } from 'react';

const { ipcRenderer } =
  typeof window !== 'undefined' && window.require
    ? window.require('electron')
    : { ipcRenderer: null };

const defaultStatus = {
  state: 'checking',
};

export const useLicenseStatus = () => {
  const [status, setStatus] = useState(defaultStatus);

  useEffect(() => {
    if (!ipcRenderer) {
      setStatus({
        state: 'unlocked',
      });
      return undefined;
    }

    let mounted = true;

    ipcRenderer.invoke('license:get-status').then((nextStatus) => {
      if (mounted && nextStatus) {
        setStatus(nextStatus);
      }
    });

    const handleStatus = (_event, nextStatus) => {
      if (mounted && nextStatus) {
        setStatus(nextStatus);
      }
    };

    ipcRenderer.on('license-status-changed', handleStatus);

    return () => {
      mounted = false;
      ipcRenderer.removeListener('license-status-changed', handleStatus);
    };
  }, []);

  return {
    ipcRenderer,
    status,
  };
};
