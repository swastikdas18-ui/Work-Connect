import React, { useEffect, useState, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showStatusChange, setShowStatusChange] = useState(false);
  const isFirstMount = useRef(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    // Suppress initial mount toast if already online
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (!isOnline) {
        wasOffline.current = true;
        setShowStatusChange(true);
      }
      return;
    }

    if (!isOnline) {
      wasOffline.current = true;
      setShowStatusChange(true);
    } else if (wasOffline.current) {
      // Only show when transitioning from offline to online
      setShowStatusChange(true);
      const timer = setTimeout(() => {
        setShowStatusChange(false);
        wasOffline.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showStatusChange) return null;

  return (
    <div className={`fixed bottom-16 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-medium text-white shadow-xl transition-all duration-300 ${
      isOnline ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online. Sync completed!</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode – Simulating offline state safely.</span>
        </>
      )}
    </div>
  );
};
