import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Calendar, List, CircleUserRound } from 'lucide-react';
import { motion } from 'motion/react';

export const Header: React.FC = () => {
  const {
    selectedAccountId,
    activeAccount,
    activeTab,
    setActiveTab,
    journalViewMode,
    setJournalViewMode,
    setIsAccountModalOpen,
    setSelectedTradeId
  } = useTrading();

  const handleToggleCalendar = () => {
    setSelectedTradeId(null);
    if (activeTab !== 'journal') {
      setActiveTab('journal');
      setJournalViewMode('calendar');
    } else {
      setJournalViewMode(journalViewMode === 'weekly' ? 'calendar' : 'weekly');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#222222] border-b border-white/[0.07] px-2 h-14 flex items-center justify-between pt-safe">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        {/* Left Action: Calendar / Weekly Toggle (matches top-left calendar icon in reference) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={handleToggleCalendar}
          aria-label={journalViewMode === 'calendar' ? 'Switch to weekly journal view' : 'Open monthly calendar view'}
          title={journalViewMode === 'calendar' ? 'Weekly List' : 'Monthly Calendar'}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            activeTab === 'journal' && journalViewMode === 'calendar'
              ? 'text-[#2196F3]'
              : 'text-white/90 hover:text-white'
          }`}
        >
          {activeTab === 'journal' && journalViewMode === 'calendar' ? (
            <List className="w-5 h-5" />
          ) : (
            <Calendar className="w-5 h-5" />
          )}
        </motion.button>

        {/* Center Active Account Lockup (exact 2-line hierarchy from reference) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsAccountModalOpen(true)}
          className="flex flex-col items-center justify-center px-3 py-1 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer min-h-[44px]"
        >
          <span className="text-[11px] font-medium text-neutral-300 leading-tight whitespace-nowrap">
            Active account:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-bold text-white leading-tight truncate max-w-[160px]">
              {selectedAccountId === 'all' ? 'All Accounts' : (activeAccount?.name || 'Select Account')}
            </span>
            {selectedAccountId === 'all' ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#2196F3]/20 text-[#2196F3]">
                ALL
              </span>
            ) : activeAccount ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-200">
                {activeAccount.currency}
              </span>
            ) : null}
          </div>
        </motion.button>

        {/* Right Action: Account Manager Icon (matches top-right user icon in reference) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAccountModalOpen(true)}
          aria-label="Manage trading accounts"
          title="Trading Accounts"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white/90 hover:text-white transition-colors cursor-pointer"
        >
          <CircleUserRound className="w-6 h-6" />
        </motion.button>
      </div>
    </header>
  );
};
