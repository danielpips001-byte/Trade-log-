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
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
  const { activeTab, accounts } = useTrading();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  return (
    <div className="min-h-screen bg-[#3D3D3D] text-white flex flex-col font-sans selection:bg-[#2196F3] selection:text-white overflow-x-hidden">
      {/* Global Confirmation Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#222222] border border-[#2ECC71]/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {accounts.length === 0 ? (
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
