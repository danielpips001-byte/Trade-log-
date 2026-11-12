import React from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { CalendarView } from './components/calendar/CalendarView';
import { TradeHistoryView } from './components/trades/TradeHistoryView';
import { AddTradeView } from './components/addTrade/AddTradeView';
import { JournalView } from './components/journal/JournalView';
import { AccountsView } from './components/accounts/AccountsView';
import { TradeDetailPage } from './components/trades/TradeDetailPage';
import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
  const { activeTab, selectedTradeId, setSelectedTradeId } = useTrading();

  // Subtle spring configuration matching iOS 26 physics
  const springTransition = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 30,
    mass: 0.8
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white overflow-x-hidden">
      
      {/* Top Brand & Liquid Glass Account Switcher */}
      <Header />

      {/* Main Viewport Content with subtle spring transitions */}
      <main className="flex-1 pb-28">
        <AnimatePresence mode="wait">
          {selectedTradeId ? (
            <motion.div
              key={`detail-${selectedTradeId}`}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={springTransition}
            >
              <TradeDetailPage 
                tradeId={selectedTradeId} 
                onBack={() => setSelectedTradeId(null)} 
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.995 }}
              transition={springTransition}
            >
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'trades' && <TradeHistoryView />}
              {activeTab === 'add' && <AddTradeView />}
              {activeTab === 'journal' && <JournalView />}
              {activeTab === 'accounts' && <AccountsView />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating 5-Item Bottom Navigation with Prominent Center Add Button */}
      <BottomNav />

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
