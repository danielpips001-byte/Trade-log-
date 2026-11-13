import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level store ensures beforeinstallprompt is captured even before settings UI mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
const listeners = new Set<() => void>();

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isMediaStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
  const isNavigatorStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidTwa = document.referrer.startsWith('android-app://');
  return isMediaStandalone || isNavigatorStandalone || isAndroidTwa;
}

if (typeof window !== 'undefined') {
  globalIsInstalled = checkIsStandalone();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((notify) => notify());
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    listeners.forEach((notify) => notify());
  });

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const onDisplayModeChange = () => {
    globalIsInstalled = checkIsStandalone();
    if (globalIsInstalled) {
      globalDeferredPrompt = null;
    }
    listeners.forEach((notify) => notify());
  };
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onDisplayModeChange);
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? checkIsStandalone() || globalIsInstalled : false
  );
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSChrome, setIsIOSChrome] = useState(false);

  useEffect(() => {
    const sync = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(checkIsStandalone() || globalIsInstalled);
    };

    sync();
    listeners.add(sync);

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);
    setIsIOSChrome(iosDevice && /crios/.test(ua));

    return () => {
      listeners.delete(sync);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = globalDeferredPrompt || deferredPrompt;
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      globalIsInstalled = true;
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      listeners.forEach((notify) => notify());
      return true;
    }
    return false;
  };

  return {
    isInstallable: !isInstalled && !!deferredPrompt,
    isInstalled,
    isIOS,
    isIOSChrome,
    install
  };
}
