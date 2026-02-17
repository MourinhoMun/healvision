import { useState, useCallback, useRef } from 'react';

const CLICKS_NEEDED = 5;
const CLICK_TIMEOUT = 3000; // 3 seconds

export function useDevMode() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const clickCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLogoClick = useCallback(() => {
    clickCountRef.current++;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (clickCountRef.current >= CLICKS_NEEDED) {
      clickCountRef.current = 0;
      setShowPasswordDialog(true);
      return;
    }

    timerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, CLICK_TIMEOUT);
  }, []);

  const closePasswordDialog = useCallback(() => {
    setShowPasswordDialog(false);
  }, []);

  return { showPasswordDialog, handleLogoClick, closePasswordDialog };
}
