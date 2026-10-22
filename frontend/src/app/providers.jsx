import React from 'react';

/**
 * Top-level application providers wrapper.
 * Will encompass AuthProvider and RoomProvider in subsequent phases.
 */
export function AppProviders({ children }) {
  return <>{children}</>;
}

export default AppProviders;
