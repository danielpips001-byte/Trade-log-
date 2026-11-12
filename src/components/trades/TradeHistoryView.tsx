import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { ChevronRight, CheckCircle, ShieldAlert, Target, Sparkles, AlertCircle } from 'lucide-react';
import { CloseTradeModal } from './CloseTradeModal';
import { Trade } from '../../types/trading';
import { getCurrencySymbol } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';

export const TradeHistoryView: React.FC = () => {
  const { filteredTrades, setSelectedTradeId, activeAccount, setActiveTab } = useTrading();
  const [filter, setFilter] = useState<'All' | 'Wins' | 'Losses' | 'Breakeven'>('All');
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);

  const displayCurrency = getCurrencySymbol(activeAccount?.currency);

  const springCard = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25
  };

  const springPill = {
    type: 'spring' as const,
    stiffness: 500,
    damping: 28
  };

  // 1. Separate Open Trades from Closed Trades
  const openTrades = useMemo(() => {
    return filteredTrades
      .filter(t => t.status === 'Open')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTrades]);

  // 2. Closed Trades with Pill Filter
  const closedTrades = useMemo(() => {
    return filteredTrades
      .filter(t => t.status === 'Closed')
      .filter(t => {
        if (filter === 'Wins') return (t.realizedPnl || 0) > 0;
        if (filter === 'Losses') return (t.realizedPnl || 0) < 0;
        if (filter === 'Breakeven') return (t.realizedPnl || 0) === 0 || t.closeOutcome === 'Breakeven';
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTrades, filter]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
      
      {/* SECTION 1: PROMINENT OPEN TRADES SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider font-mono">
              Open Trades ({openTrades.length})
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-medium">
            Active Positions
          </span>
        </div>

        {openTrades.length > 0 ? (
          <div className="space-y-3">
            {openTrades.map(trade => (
              <motion.div
                key={trade.id}
                whileHover={{ y: -2 }}
                transition={springCard}
                className="p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-amber-200/90 shadow-[0_4px_24px_-2px_rgba(245,158,11,0.08)] space-y-3.5 transition-shadow hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
              >
                {/* Header Row: Direction + Asset + Lots */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      trade.direction === 'BUY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    }`}>
                      {trade.direction}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg font-mono text-neutral-950 tracking-tight">
                          {trade.asset}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">
                          {trade.lotSize} lots
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500 block">
                        Entry: {trade.entryPrice} · {trade.date}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 uppercase tracking-wide">
                    ACTIVE OPEN
                  </span>
                </div>

                {/* Levels & Projections */}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#F9FAFB] p-3 rounded-2xl border border-neutral-200/70">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-semibold">STOP LOSS</span>
                    <span className="text-rose-600 font-bold tabular-nums">
                      {trade.stopLoss ? trade.stopLoss : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-semibold">TAKE PROFIT</span>
                    <span className="text-emerald-600 font-bold tabular-nums">
                      {trade.takeProfit ? trade.takeProfit : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-semibold">RISK : REWARD</span>
                    <span className="text-neutral-900 font-bold tabular-nums">
                      {trade.riskRewardRatio ? `1 : ${trade.riskRewardRatio}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions: View Details & Close Trade Pill with Spring Tap */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={springPill}
                    onClick={() => setSelectedTradeId(trade.id)}
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 px-2 py-1 transition-colors cursor-pointer"
                  >
                    View Details →
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.02 }}
                    transition={springPill}
                    onClick={() => setTradeToClose(trade)}
                    className="px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Close Trade</span>
                  </motion.button>
                </div>

              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white/70 border border-dashed border-neutral-300 text-center space-y-2">
            <p className="text-xs font-medium text-neutral-500">No open trades currently active.</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('add')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-950 hover:underline cursor-pointer"
            >
              + Record new open trade
            </motion.button>
          </div>
        )}
      </div>

      {/* SECTION 2: CLOSED TRADES HISTORY */}
      <div className="space-y-3 pt-3 border-t border-neutral-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider font-mono">
            Closed Trades History
          </h2>
          
          {/* iOS-Style Pill Filters with Spring Feedback */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-neutral-200/90 shadow-sm text-xs">
            {(['All', 'Wins', 'Losses', 'Breakeven'] as const).map(tab => (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.92 }}
                transition={springPill}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-full transition-colors text-[11px] font-semibold cursor-pointer ${
                  filter === tab
                    ? 'bg-neutral-950 text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {tab}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Closed Trades List */}
        <div className="space-y-2.5">
          {closedTrades.length > 0 ? (
            closedTrades.map(trade => {
              const isWin = (trade.realizedPnl || 0) > 0;
              const isLoss = (trade.realizedPnl || 0) < 0;

              return (
                <motion.div
                  key={trade.id}
                  whileHover={{ y: -1.5, scale: 1.003 }}
                  whileTap={{ scale: 0.985 }}
                  transition={springCard}
                  onClick={() => setSelectedTradeId(trade.id)}
                  className="p-4 rounded-3xl bg-white/90 hover:bg-white border border-black/[0.05] hover:border-neutral-300 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer transition-shadow"
                >
                  {/* Left: Direction + Asset + Outcome */}
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      trade.direction === 'BUY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    }`}>
                      {trade.direction}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono text-neutral-950">{trade.asset}</span>
                        {trade.closeOutcome && (
                          <span className="text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full font-medium">
                            {trade.closeOutcome}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {trade.closedDate || trade.date} · {trade.lotSize} lots
                      </span>
                    </div>
                  </div>

                  {/* Right: Realized P/L */}
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className={`text-sm font-bold font-mono tabular-nums block ${
                        isWin
                          ? 'text-emerald-600'
                          : isLoss
                          ? 'text-rose-600'
                          : 'text-neutral-700'
                      }`}>
                        {trade.realizedPnl >= 0 ? '+' : ''}{displayCurrency}{Math.abs(trade.realizedPnl).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 block">
                        Realized
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-12 text-xs font-medium text-neutral-500 bg-white/70 rounded-3xl border border-dashed border-neutral-300">
              No closed trades found matching filter.
            </div>
          )}
        </div>
      </div>

      {/* Close Trade Modal with spring animation */}
      <AnimatePresence>
        {tradeToClose && (
          <CloseTradeModal
            trade={tradeToClose}
            onClose={() => setTradeToClose(null)}
            onClosedSuccess={() => setTradeToClose(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
