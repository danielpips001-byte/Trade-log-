import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, Smartphone } from 'lucide-react';

interface PWAInstallControlProps {
  variant?: 'settings' | 'onboarding';
}

export const PWAInstallControl: React.FC<PWAInstallControlProps> = ({
  variant = 'settings'
}) => {
  const { isInstallable, isInstalled, isIOS, isIOSChrome, install } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Never show installation UI if TradeLog is already running as an installed standalone app
  if (isInstalled) {
    return null;
  }

  // Only render when native install prompt is available or device is iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  const containerClass =
    variant === 'onboarding'
      ? 'liquid-glass-card rounded-2xl p-3.5 space-y-2.5'
      : 'liquid-glass-subcard rounded-2xl p-3.5 space-y-2.5';

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSInstructions((prev) => !prev);
    }
  };

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Smartphone className="w-4 h-4 text-neutral-300 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block">
              Install TradeLog App
            </span>
            <span className="text-[11px] text-neutral-400 block">
              {isInstallable
                ? 'Launch from your home screen in standalone mode'
                : 'Add TradeLog to your iPhone or iPad Home Screen'}
            </span>
          </div>
        </div>

        {isInstallable ? (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-full liquid-glass-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[34px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install TradeLog</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-full liquid-glass-pill text-xs font-semibold text-neutral-200 flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[34px]"
          >
            <Share className="w-3.5 h-3.5" />
            <span>{showIOSInstructions ? 'Hide Steps' : 'Install TradeLog'}</span>
          </button>
        )}
      </div>

      {isIOS && showIOSInstructions && (
        <div className="pt-2.5 border-t border-white/[0.08] space-y-2 text-[11px] text-neutral-300 leading-relaxed">
          <p className="font-semibold text-white">
            How to install on {isIOSChrome ? 'Chrome for iOS' : 'iPhone / iPad'}:
          </p>
          <ol className="space-y-1.5 list-decimal list-inside text-neutral-300">
            <li>
              Tap the <strong className="text-white inline-flex items-center gap-1"><Share className="w-3 h-3 inline" /> Share</strong> button in {isIOSChrome ? "Chrome's address bar" : "the browser toolbar"}.
            </li>
            <li>
              Scroll down the Share menu and tap <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3 h-3 inline" /> Add to Home Screen</strong>.
            </li>
            <li>
              Confirm the name <strong className="text-white">TradeLog</strong> and tap <strong className="text-white">Add</strong>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
