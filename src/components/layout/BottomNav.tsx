import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Calendar, ListOrdered, Plus, BookOpen, Wallet } from 'lucide-react';
import { ActiveTab } from '../../types/trading';
import { motion } from 'motion/react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useTrading();

  const springConfig = {
    type: 'spring' as const,
    stiffness: 500,
    damping: 28
  };

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none pb-safe">
      <div className="max-w-md mx-auto bg-white/90 backdrop-blur-2xl border border-black/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.1)] rounded-full px-3 py-2 pointer-events-auto flex items-center justify-between">
        
        {/* 1. Calendar */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={springConfig}
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors rounded-full cursor-pointer ${
            activeTab === 'calendar' 
              ? 'text-neutral-950 font-bold' 
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Calendar className={`w-5 h-5 ${activeTab === 'calendar' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Calendar</span>
        </motion.button>

        {/* 2. Trades */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={springConfig}
          onClick={() => setActiveTab('trades')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors rounded-full cursor-pointer ${
            activeTab === 'trades' 
              ? 'text-neutral-950 font-bold' 
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <ListOrdered className={`w-5 h-5 ${activeTab === 'trades' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Trades</span>
        </motion.button>

        {/* 3. Center Prominent Add Button with spring tap & hover */}
        <div className="px-2 -my-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            transition={springConfig}
            onClick={() => setActiveTab('add')}
            className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
              activeTab === 'add'
                ? 'bg-neutral-950 text-white ring-4 ring-neutral-200 shadow-neutral-950/30'
                : 'bg-neutral-950 hover:bg-neutral-800 text-white shadow-neutral-950/25'
            }`}
            aria-label="Add Trade"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </motion.button>
        </div>

        {/* 4. Journal */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={springConfig}
          onClick={() => setActiveTab('journal')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors rounded-full cursor-pointer ${
            activeTab === 'journal' 
              ? 'text-neutral-950 font-bold' 
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${activeTab === 'journal' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Journal</span>
        </motion.button>

        {/* 5. Accounts */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={springConfig}
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors rounded-full cursor-pointer ${
            activeTab === 'accounts' 
              ? 'text-neutral-950 font-bold' 
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'accounts' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Accounts</span>
        </motion.button>

      </div>
    </nav>
  );
};
