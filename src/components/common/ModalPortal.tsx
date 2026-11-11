import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders any modal or popup directly into document.body via React Portal
 * so it is always fixed and centered in the user's current screen viewport (100dvh)
 * regardless of page scroll position or parent CSS transforms/containers.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return <>{children}</>;
  }

  return createPortal(children, document.body);
};
