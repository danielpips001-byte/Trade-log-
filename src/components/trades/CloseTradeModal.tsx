import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { X, Check, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Trade, CloseOutcome } from '../../types/trading';
import { calculateTradeEstimates, getCurrencySymbol } from '../../utils/calculations';
import { motion } from 'motion/react';

interface Props {
  trade: Trade;
  onClose: () => void;
  onClosedSuccess?: () => void;
}

export const CloseTradeModal: React.FC<Props> = ({ trade, onClose, onClosedSuccess }) => {
  const { closeTrade, accounts } = useTrading();
  const account = accounts.find(a => a.id === trade.accountId);
  const currencySymbol = getCurrencySymbol(account?.currency);

  const [outcome, setOutcome] = useState<CloseOutcome>('Take Profit Hit');
  const [exitPrice, setExitPrice] = useState<string>(trade.takeProfit?.toString() || trade.entryPrice.toString());
  const [realizedPnl, setRealizedPnl] = useState<string>('0');
  const [closedDate, setClosedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closedAt, setClosedAt] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Auto-calculate P/L based on outcome selection
  useEffect(() => {
    if (outcome === 'Take Profit Hit') {
      const tp = trade.takeProfit || trade.entryPrice;
      setExitPrice(tp.toString());
      const calc = calculateTradeEstimates(trade.asset, trade.direction, trade.entryPrice, trade.stopLoss || 0, tp, trade.lotSize);
      setRealizedPnl(calc?.estimatedProfit?.toString() || '0');
    } else if (outcome === 'Stop Loss Hit') {
      const sl = trade.stopLoss || trade.entryPrice;
      setExitPrice(sl.toString());
      const calc = calculateTradeEstimates(trade.asset, trade.direction, trade.entryPrice, sl, trade.takeProfit || 0, trade.lotSize);
      setRealizedPnl(calc?.estimatedLoss ? (-calc.estimatedLoss).toString() : '0');
    } else if (outcome === 'Breakeven') {
      setExitPrice(trade.entryPrice.toString());
      setRealizedPnl('0.00');
    }
  }, [outcome, trade]);

  // Recalculate when manual exit price changes
  const handleExitPriceChange = (val: string) => {
    setExitPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const calc = calculateTradeEstimates(
        trade.asset, 
        trade.direction, 
        trade.entryPrice, 
        trade.direction === 'BUY' ? (trade.entryPrice - 0.001) : (trade.entryPrice + 0.001), 
        num, 
        trade.lotSize
      );
      if (calc) {
        const isProfit = trade.direction === 'BUY' ? (num >= trade.entryPrice) : (num <= trade.entryPrice);
        const amount = isProfit ? calc.estimatedProfit : -calc.estimatedLoss;
        setRealizedPnl(amount.toString());
      }
    }
  };

  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalPnl = parseFloat(realizedPnl) || 0;
    const finalExit = parseFloat(exitPrice) || trade.entryPrice;

    try {
      await closeTrade(trade.id, {
        outcome,
        exitPrice: finalExit,
        realizedPnl: finalPnl,
        closedDate,
        closedAt,
        notes: closeNotes || undefined
      });

      if (onClosedSuccess) onClosedSuccess();
      onClose();
    } catch (err) {
      console.error('Error closing trade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pnlNum = parseFloat(realizedPnl) || 0;

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
        className="bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-3xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 my-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block font-mono">
              SETTLE OPEN POSITION
            </span>
            <h3 className="text-lg font-bold text-neutral-950 font-mono flex items-center gap-2 mt-0.5">
              <span>{trade.asset}</span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                trade.direction === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {trade.direction}
              </span>
              <span className="text-xs text-neutral-500 font-normal">({trade.lotSize} lots)</span>
            </h3>
          </div>
          <motion.button 
            whileTap={{ scale: 0.88 }}
            onClick={onClose} 
            className="p-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <form onSubmit={handleConfirmClose} className="space-y-4">
          
          {/* Closing Outcome Selector: iOS Pill Buttons */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Closing Outcome *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Take Profit Hit', 'Stop Loss Hit', 'Breakeven', 'Closed Manually'] as CloseOutcome[]).map(opt => (
                <motion.button
                  type="button"
                  key={opt}
                  whileTap={{ scale: 0.95 }}
                  transition={springButton}
                  onClick={() => setOutcome(opt)}
                  className={`px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all text-center cursor-pointer ${
                    outcome === opt
                      ? opt === 'Take Profit Hit'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : opt === 'Stop Loss Hit'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 border border-neutral-200/60'
                  }`}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Realized Profit/Loss Banner */}
          <div className={`p-4 rounded-2xl border text-center transition-all ${
            pnlNum > 0
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : pnlNum < 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-neutral-50 border-neutral-200 text-neutral-950'
          }`}>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">
              Settled Return to Balance
            </span>
            <div className={`text-3xl font-bold font-mono tabular-nums ${
              pnlNum > 0 ? 'text-emerald-700' : pnlNum < 0 ? 'text-rose-700' : 'text-neutral-900'
            }`}>
              {pnlNum >= 0 ? '+' : ''}{currencySymbol}{Math.abs(pnlNum).toFixed(2)}
            </div>
            <p className="text-[11px] text-neutral-500 font-medium mt-1">
              Will be applied to {account?.name || 'Trading Account'} balance
            </p>
          </div>

          {/* Exit Price & Manual Realized P/L */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                EXIT PRICE
              </label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => handleExitPriceChange(e.target.value)}
                required
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-950 tabular-nums focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                EXACT P/L ($)
              </label>
              <input
                type="number"
                step="any"
                value={realizedPnl}
                onChange={(e) => setRealizedPnl(e.target.value)}
                required
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-950 tabular-nums focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                CLOSING DATE
              </label>
              <input
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                required
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-mono text-neutral-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                CLOSING TIME
              </label>
              <input
                type="time"
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
                required
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-mono text-neutral-950"
              />
            </div>
          </div>

          {/* Exit Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              CLOSING REFLECTION / NOTES (OPTIONAL)
            </label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Target reached smoothly or closed before CPI news..."
              className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 resize-none focus:outline-none focus:border-black"
            />
          </div>

          {/* Actions with Spring Press */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={springButton}
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              transition={springButton}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs shadow-md shadow-neutral-950/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Settling...' : 'Confirm & Settle Trade'}
            </motion.button>
          </div>

        </form>
      </motion.div>
    </motion.div>
  );
};
