import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 liquid-glass-popover text-amber-200 border-amber-400/30 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span>Offline — Reconnect to sync changes</span>
    </div>
  );
};
