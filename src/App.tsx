import React, { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { MyJournalView } from './components/journal/MyJournalView';
import { PerformanceView } from './components/performance/PerformanceView';
import { ToolsView } from './components/tools/ToolsView';
import { AccountsModal } from './components/accounts/AccountsModal';
import { OnboardingAccountView } from './components/accounts/OnboardingAccountView';
import { AddTradeModal } from './components/trades/AddTradeModal';
import { TradeDetailModal } from './components/trades/TradeDetailModal';
import { InstrumentSpecModal } from './components/specs/InstrumentSpecModal';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { TradeLogLogo } from './components/brand/TradeLogLogo';
import { usePWAInstall } from './hooks/usePWAInstall';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
  const { activeTab, accounts, isSignedOut, isHydratingSession } = useTrading();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  usePWAInstall();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-white/25 selection:text-white overflow-x-hidden">
      <OfflineBanner />
      {/* Global Confirmation Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 liquid-glass-popover text-white px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isHydratingSession && !isSignedOut && accounts.length === 0 ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
          <div className="liquid-glass-surface rounded-3xl px-7 py-6 flex flex-col items-center gap-3 text-center max-w-xs w-full">
            <TradeLogLogo size="md" />
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin mt-1" />
            <div>
              <p className="text-sm font-bold text-white">Auto-syncing your journal</p>
              <p className="text-xs text-neutral-400 mt-1">
                Loading your accounts and trades...
              </p>
            </div>
          </div>
        </div>
      ) : isSignedOut || accounts.length === 0 ? (
        <OnboardingAccountView onAccountCreated={showToast} />
      ) : (
        <>
          {/* Top Bar */}
          <Header />

          {/* Main Content */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'tools' && <ToolsView />}
                {activeTab === 'journal' && <MyJournalView />}
                {activeTab === 'performance' && <PerformanceView />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Fixed 3-Tab Bottom Navigation */}
          <BottomNav />

          {/* Global Modals */}
          <AccountsModal />
          <AddTradeModal onSavedSuccess={showToast} />
          <TradeDetailModal />
          <InstrumentSpecModal />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
