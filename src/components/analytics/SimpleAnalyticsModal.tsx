import React, { useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { X, TrendingUp, TrendingDown, Target, Layers } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';
import { motion } from 'motion/react';

interface Props {
  onClose: () => void;
}

export const SimpleAnalyticsModal: React.FC<Props> = ({ onClose }) => {
  const { filteredTrades, activeAccount } = useTrading();

  const closedTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status !== 'Open');
  }, [filteredTrades]);

  const stats = useMemo(() => {
    const total = closedTrades.length;
    if (total === 0) return { winRate: '0.0', wins: 0, losses: 0, netPnl: 0, profit: 0, loss: 0 };

    const wins = closedTrades.filter(t => (t.realizedPnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.realizedPnl || 0) < 0);

    const profit = wins.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
    const loss = Math.abs(losses.reduce((sum, t) => sum + (t.realizedPnl || 0), 0));
    const netPnl = profit - loss;
    const winRate = ((wins.length / total) * 100).toFixed(1);

    return { winRate, wins: wins.length, losses: losses.length, netPnl, profit, loss, total };
  }, [closedTrades]);

  // Asset breakdown
  const assetStats = useMemo(() => {
    const map = new Map<string, { count: number; pnl: number; wins: number }>();
    closedTrades.forEach(t => {
      const cur = map.get(t.asset) || { count: 0, pnl: 0, wins: 0 };
      cur.count += 1;
      cur.pnl += (t.realizedPnl || 0);
      if ((t.realizedPnl || 0) > 0) cur.wins += 1;
      map.set(t.asset, cur);
    });

    return Array.from(map.entries()).map(([asset, d]) => ({
      asset,
      count: d.count,
      pnl: d.pnl,
      winRate: ((d.wins / d.count) * 100).toFixed(0)
    })).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  const displayCurrency = getCurrencySymbol(activeAccount?.currency);

  const springModal = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 28
  };

  const springButton = {
    type: 'spring' as const,
    stiffness: 450,
    damping: 25
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={springModal}
        className="bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-3xl w-full max-w-md shadow-2xl p-6 my-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-950 font-mono">Performance Analytics</h3>
            <p className="text-xs text-neutral-500 font-medium">{activeAccount?.name || 'All Accounts'}</p>
          </div>
          <motion.button 
            whileTap={{ scale: 0.88 }}
            onClick={onClose} 
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-950 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 4 Core Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200/80">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5 font-mono">
              NET REALISED P/L
            </span>
            <span className={`text-xl font-bold font-mono tabular-nums ${
              stats.netPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {stats.netPnl >= 0 ? '+' : ''}{displayCurrency}{Math.abs(stats.netPnl).toFixed(2)}
            </span>
          </div>

          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200/80">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5 font-mono">
              WIN RATE
            </span>
            <span className="text-xl font-bold font-mono text-neutral-950 tabular-nums">
              {stats.winRate}%
            </span>
            <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
              {stats.wins}W / {stats.losses}L
            </span>
          </div>

          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200/80">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5 font-mono">
              TOTAL PROFIT
            </span>
            <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
              +{displayCurrency}{stats.profit.toFixed(0)}
            </span>
          </div>

          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200/80">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5 font-mono">
              TOTAL LOSS
            </span>
            <span className="text-base font-bold font-mono text-rose-700 tabular-nums">
              -{displayCurrency}{stats.loss.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Asset Performance */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block font-mono">
            Asset Breakdown
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {assetStats.map(item => (
              <div key={item.asset} className="bg-[#F8F9FA] rounded-2xl p-3 border border-neutral-200/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-950 font-mono">{item.asset}</span>
                  <span className="text-[11px] text-neutral-500 ml-2 font-medium">{item.count} trades · {item.winRate}% win</span>
                </div>
                <span className={`font-mono font-bold tabular-nums ${
                  item.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {item.pnl >= 0 ? '+' : ''}${Math.abs(item.pnl).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={springButton}
          onClick={onClose}
          className="w-full py-3 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          Close
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
