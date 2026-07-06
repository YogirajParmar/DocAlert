import React from 'react';
import { useAppVersion } from '../hooks/useAppVersion';

export const AppVersion = () => {
  const version = useAppVersion();

  if (!version) return null;

  return (
    <div
      className='fixed bottom-3 right-4 text-sm text-gray-600 select-none pointer-events-none z-10'
      aria-label={`App version ${version}`}
    >
      v{version}
    </div>
  );
};
