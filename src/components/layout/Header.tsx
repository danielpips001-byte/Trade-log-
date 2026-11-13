import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { TradeLogLogo } from '../brand/TradeLogLogo';
import { Calendar, List, CircleUserRound, ChevronDown } from 'lucide-react';
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

  const handleGoHome = () => {
    setSelectedTradeId(null);
    setActiveTab('journal');
  };

  return (
    <header className="sticky top-0 z-30 liquid-glass-bar border-x-0 border-t-0 px-3 py-2 pt-safe">
      <div className="max-w-4xl w-full mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-h-[44px]">
        {/* Left Zone: Custom TG Monogram + TradeLog Wordmark */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={handleGoHome}
          aria-label="TradeLog home"
          className="justify-self-start flex items-center rounded-full py-1 pr-2 hover:bg-white/[0.05] transition-colors cursor-pointer min-h-[40px]"
        >
          <TradeLogLogo size="sm" showWordmark />
        </motion.button>

        {/* Center Zone: Pill-shaped Translucent Account Selector */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsAccountModalOpen(true)}
          className="justify-self-center flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill transition-colors cursor-pointer min-h-[40px] max-w-[180px] sm:max-w-[240px]"
        >
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[9px] font-medium text-neutral-400 leading-none uppercase tracking-wider">
              Account
            </span>
            <span className="text-[13px] font-bold text-white leading-tight truncate max-w-[115px] sm:max-w-[170px]">
              {selectedAccountId === 'all' ? 'All Accounts' : (activeAccount?.name || 'Select')}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-neutral-300 shrink-0">
            {selectedAccountId === 'all' ? 'ALL' : activeAccount?.currency || ''}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </motion.button>

        {/* Right Zone: Calendar Toggle & Account Manager Glass Controls */}
        <div className="justify-self-end flex items-center gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleCalendar}
            aria-label={journalViewMode === 'calendar' ? 'Switch to weekly journal view' : 'Open monthly calendar view'}
            title={journalViewMode === 'calendar' ? 'Weekly List' : 'Monthly Calendar'}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              activeTab === 'journal' && journalViewMode === 'calendar'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'liquid-glass-pill text-white/90 hover:text-white'
            }`}
          >
            {activeTab === 'journal' && journalViewMode === 'calendar' ? (
              <List className="w-4 h-4" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAccountModalOpen(true)}
            aria-label="Manage trading accounts"
            title="Trading Accounts"
            className="w-10 h-10 flex items-center justify-center rounded-full liquid-glass-pill text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <CircleUserRound className="w-4.5 h-4.5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
};
