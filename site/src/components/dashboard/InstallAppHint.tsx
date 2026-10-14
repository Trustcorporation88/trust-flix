'use client';

import { useEffect, useState } from 'react';
import { FiDownload, FiShare, FiX } from 'react-icons/fi';

const DISMISS_KEY = 'sf_install_hint_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Convite para instalar o site na tela inicial do celular (abre direto em Publicar). */
export function InstallAppHint() {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    if (standalone || !mobile || localStorage.getItem(DISMISS_KEY)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    if (ios) setVisible(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-flow-500/30 bg-flow-50 p-3 text-sm text-flow-900 sm:hidden">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Poste pelo celular como um app</p>
        {isIos ? (
          <p className="mt-1 text-xs">
            No Safari, toque em <FiShare className="inline" /> <strong>Compartilhar</strong> →{' '}
            <strong>Adicionar à Tela de Início</strong>. O ícone abre direto nesta tela.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs">Instale o atalho na tela inicial — abre direto nesta tela.</p>
            <button
              type="button"
              onClick={async () => {
                if (!promptEvent) return;
                await promptEvent.prompt();
                await promptEvent.userChoice;
                dismiss();
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-flow-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <FiDownload /> Instalar
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} className="rounded p-1 text-flow-800/60" aria-label="Dispensar">
        <FiX />
      </button>
    </div>
  );
}
