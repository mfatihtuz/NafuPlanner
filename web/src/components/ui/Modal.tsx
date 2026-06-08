import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { tr } from '@/i18n/tr';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Alt eylem cubugu (ornek: Vazgec / Kaydet). */
  footer?: ReactNode;
  /** Govde ic boslugunu kaldirir (tam genislik liste vb. icin). */
  bare?: boolean;
}

/**
 * Mobilde alttan acilan sheet, genis ekranda ortalanmis pencere.
 * Kapanma: arka plana dokunma, Escape, kapat dugmesi.
 */
export function Modal({ open, onClose, title, children, footer, bare = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape ile kapat + acikken arka plani kaydirma kilidi.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Acildiginda odagi panele tasi.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-stormy_teal-100/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              'relative z-10 flex max-h-[90dvh] w-full flex-col bg-[var(--surface)] shadow-sheet outline-none',
              'rounded-t-3xl sm:max-w-md sm:rounded-3xl',
              'pb-safe',
            )}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {/* Mobil tutamac cizgisi */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-[var(--border)]" />
            </div>

            {/* Baslik bos olsa da kapat dugmesi her zaman erisilebilir kalir. */}
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
              <h2 className="text-lg font-semibold text-[var(--heading)]">{title}</h2>
              <IconButton
                label={tr.common.close}
                icon={<X className="h-5 w-5" />}
                onClick={onClose}
                size="sm"
              />
            </div>

            <div className={cn('overflow-y-auto', bare ? '' : 'px-5 py-2')}>{children}</div>

            {footer ? (
              <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
