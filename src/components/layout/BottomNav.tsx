import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Wrench, DollarSign, TrendingUp } from 'lucide-react';
import { ActiveTab } from '../../types/trading';
import { motion } from 'motion/react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setSelectedTradeId } = useTrading();

  const handleSelect = (tab: ActiveTab) => {
    setSelectedTradeId(null);
    setActiveTab(tab);
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'tools',
      label: 'Tools',
      icon: <Wrench className="w-4.5 h-4.5" />
    },
    {
      id: 'journal',
      label: 'My Journal',
      icon: <DollarSign className="w-4.5 h-4.5" />
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <TrendingUp className="w-4.5 h-4.5" />
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-[max(12px,env(safe-area-inset-bottom,12px))]">
      <nav className="max-w-md mx-auto pointer-events-auto liquid-glass-bar rounded-full p-1.5">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                onClick={() => handleSelect(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-full cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-white/[0.16] text-white border border-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                    : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
