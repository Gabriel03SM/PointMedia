import { useEffect, useRef } from 'react';

export function useModalDialog(initialFocusSelector?: string) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    if (initialFocusSelector) element?.querySelector<HTMLElement>(initialFocusSelector)?.focus();
    return () => {
      element?.close();
      // React pode remover o dialog antes do close nativo restaurar o acionador.
      if (trigger?.isConnected) trigger.focus();
    };
  }, [initialFocusSelector]);
  return dialog;
}
