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
      icon: <Wrench className="w-5 h-5" />
    },
    {
      id: 'journal',
      label: 'My Journal',
      icon: <DollarSign className="w-5 h-5" />
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <TrendingUp className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#222222] border-t border-white/[0.08] pb-safe">
      <div className="max-w-4xl mx-auto grid grid-cols-3 h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              onClick={() => handleSelect(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[44px] cursor-pointer transition-colors ${
                isActive ? 'text-[#2196F3]' : 'text-[#9E9E9E] hover:text-neutral-200'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
