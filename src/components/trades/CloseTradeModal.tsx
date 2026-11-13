import React, { useState, useEffect, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { X, Check, AlertCircle, Loader2, AlertTriangle, Sliders } from 'lucide-react';
import { Trade, CloseOutcome } from '../../types/trading';
import { calculateRealizedTradePnl, getCurrencySymbol, formatMoney } from '../../utils/calculations';
import { motion } from 'motion/react';

interface Props {
  trade: Trade;
  onClose: () => void;
  onClosedSuccess?: () => void;
}

export const CloseTradeModal: React.FC<Props> = ({ trade, onClose, onClosedSuccess }) => {
  const {
    closeTrade,
    accounts,
    instrumentSpecs,
    exchangeRates,
    saveExchangeRate,
    setSpecModalSymbol
  } = useTrading();
  const account = accounts.find(a => a.id === trade.accountId);
  const accountCurrency = account?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(accountCurrency);

  const [outcome, setOutcome] = useState<CloseOutcome>('Take Profit Hit');
  const [exitPrice, setExitPrice] = useState<string>(
    trade.takeProfit?.toString() || trade.entryPrice.toString()
  );
  const [commission, setCommission] = useState<string>('0');
  const [swap, setSwap] = useState<string>('0');
  const [manualNetPnl, setManualNetPnl] = useState<string | null>(null);

  const [closedDate, setClosedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closedAt, setClosedAt] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );
  const [notes, setNotes] = useState<string>('');
  const [quickRateInput, setQuickRateInput] = useState<string>('');
  const [savingRate, setSavingRate] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setManualNetPnl(null);
    if (outcome === 'Take Profit Hit' && trade.takeProfit) {
      setExitPrice(trade.takeProfit.toString());
    } else if (outcome === 'Stop Loss Hit' && trade.stopLoss) {
      setExitPrice(trade.stopLoss.toString());
    } else if (outcome === 'Breakeven') {
      setExitPrice(trade.entryPrice.toString());
    }
  }, [outcome, trade]);

  const pnlCalc = useMemo(() => {
    const exitNum = parseFloat(exitPrice) || 0;
    const commNum = parseFloat(commission) || 0;
    const swapNum = parseFloat(swap) || 0;

    return calculateRealizedTradePnl({
      symbol: trade.asset,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: exitNum,
      lotSize: trade.lotSize,
      commission: commNum,
      swap: swapNum,
      accountCurrency,
      specsMap: instrumentSpecs,
      exchangeRates
    });
  }, [trade, exitPrice, commission, swap, accountCurrency, instrumentSpecs, exchangeRates]);

  const effectiveNetPnlStr =
    manualNetPnl !== null
      ? manualNetPnl
      : pnlCalc.status === 'ok'
      ? pnlCalc.netPnl.toFixed(2)
      : '0.00';

  const pnlNum = parseFloat(effectiveNetPnlStr) || 0;

  const handleSaveQuickRate = async () => {
    if (!pnlCalc.missingConversion) return;
    const val = parseFloat(quickRateInput);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Enter a valid positive exchange rate.');
      return;
    }
    setSavingRate(true);
    setErrorMsg(null);
    try {
      await saveExchangeRate(pnlCalc.missingConversion.suggestedKey, val);
      setQuickRateInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save exchange rate.');
    } finally {
      setSavingRate(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const exitNum = parseFloat(exitPrice);
    const commNum = Math.abs(parseFloat(commission) || 0);
    const swapNum = parseFloat(swap) || 0;
    const netNum = parseFloat(effectiveNetPnlStr);

    if (isNaN(exitNum) || exitNum <= 0) {
      setErrorMsg('Please enter a valid exit price.');
      return;
    }
    if (isNaN(netNum)) {
      setErrorMsg('Please enter a valid realized P/L amount.');
      return;
    }

    setIsClosing(true);
    try {
      await closeTrade(trade.id, {
        outcome,
        exitPrice: exitNum,
        realizedPnl: Number(netNum.toFixed(2)),
        grossRealizedPnl: pnlCalc.status === 'ok' ? pnlCalc.grossPnl : Number((netNum + commNum - swapNum).toFixed(2)),
        commission: Number(commNum.toFixed(2)),
        swap: Number(swapNum.toFixed(2)),
        closedDate,
        closedAt,
        notes: notes.trim() || undefined
      });
      if (onClosedSuccess) onClosedSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to close trade. Please check connection.');
    } finally {
      setIsClosing(false);
    }
  };

  const missingPairParts = pnlCalc.missingConversion?.suggestedKey.split('_') || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !isClosing && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="liquid-glass-surface rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div>
            <h3 className="text-base font-bold text-white">Close Trade</h3>
            <span className="text-xs text-neutral-400 font-mono">
              {trade.asset} · {trade.direction} · {trade.lotSize} Lots · Entry {trade.entryPrice}
            </span>
          </div>
          <button
            type="button"
            disabled={isClosing}
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-white cursor-pointer flex items-center justify-center"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Outcome Pills */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Take Profit Hit', 'Stop Loss Hit', 'Breakeven', 'Closed Manually'] as CloseOutcome[]).map(opt => {
                const isSelected = outcome === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOutcome(opt)}
                    className={`px-3 py-2.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      isSelected
                        ? opt === 'Take Profit Hit'
                          ? 'bg-[#34D399] text-neutral-950 border-[#34D399]'
                          : opt === 'Stop Loss Hit'
                          ? 'bg-[#F87171] text-neutral-950 border-[#F87171]'
                          : 'liquid-glass-primary'
                        : 'liquid-glass-pill text-neutral-300 hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Missing Spec or Conversion Prompts */}
          {pnlCalc.status === 'missing_spec' && pnlCalc.missingSpecSymbol && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>No specification saved for {pnlCalc.missingSpecSymbol}. Configure it for automatic P/L calculation, or enter realized P/L manually below.</span>
              </div>
              <button
                type="button"
                onClick={() => setSpecModalSymbol(pnlCalc.missingSpecSymbol!)}
                className="px-3.5 py-1.5 rounded-full liquid-glass-primary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure {pnlCalc.missingSpecSymbol}</span>
              </button>
            </div>
          )}

          {pnlCalc.status === 'missing_conversion' && pnlCalc.missingConversion && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Rate required ({pnlCalc.missingConversion.from} → {pnlCalc.missingConversion.to}):
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white shrink-0">
                  1 {missingPairParts[0]} =
                </span>
                <input
                  type="number"
                  step="any"
                  value={quickRateInput}
                  onChange={(e) => setQuickRateInput(e.target.value)}
                  placeholder="Rate"
                  className="flex-1 liquid-glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                />
                <span className="text-xs font-mono text-white shrink-0">{missingPairParts[1]}</span>
                <button
                  type="button"
                  disabled={savingRate}
                  onClick={handleSaveQuickRate}
                  className="px-3.5 py-1.5 rounded-full liquid-glass-primary text-xs font-bold cursor-pointer"
                >
                  {savingRate ? '...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Exit Price & Net Realized P/L */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Exit Price</label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => {
                  setExitPrice(e.target.value);
                  setManualNetPnl(null);
                }}
                required
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-sm font-mono font-bold text-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Net Realized P/L ({currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                value={effectiveNetPnlStr}
                onChange={(e) => setManualNetPnl(e.target.value)}
                required
                className={`w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-sm font-mono font-bold tabular-nums ${
                  pnlNum > 0
                    ? '!border-[#34D399]/60 text-[#34D399]'
                    : pnlNum < 0
                    ? '!border-[#F87171]/60 text-[#F87171]'
                    : 'text-white'
                }`}
              />
            </div>
          </div>

          {/* Commission & Swap */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Commission Fee ({currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={commission}
                onChange={(e) => {
                  setCommission(e.target.value);
                  setManualNetPnl(null);
                }}
                placeholder="0.00"
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono text-white tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Swap (+/- {currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                value={swap}
                onChange={(e) => {
                  setSwap(e.target.value);
                  setManualNetPnl(null);
                }}
                placeholder="0.00"
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono text-white tabular-nums"
              />
            </div>
          </div>

          {/* Breakdown Preview */}
          {pnlCalc.status === 'ok' && (
            <div className="liquid-glass-subcard rounded-2xl px-3.5 py-2.5 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-neutral-400">
                <span>Gross Price P/L</span>
                <span className={pnlCalc.grossPnl >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}>
                  {formatMoney(pnlCalc.grossPnl, accountCurrency, true)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Commission</span>
                <span className="text-red-300">-{formatMoney(pnlCalc.commissionFee, accountCurrency)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Swap</span>
                <span className={pnlCalc.swapAmount >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {formatMoney(pnlCalc.swapAmount, accountCurrency, true)}
                </span>
              </div>
            </div>
          )}

          {/* Closed Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Closed Date</label>
              <input
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                required
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Closed Time</label>
              <input
                type="time"
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          {/* Closing Note */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Closing Note (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Reflections on exit timing..."
              className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 resize-none"
            />
          </div>

          {/* Account Balance Settlement Preview */}
          <div className="liquid-glass-subcard rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Net Account Settlement</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                pnlNum > 0 ? 'text-[#34D399]' : pnlNum < 0 ? 'text-[#F87171]' : 'text-neutral-300'
              }`}
            >
              {formatMoney(pnlNum, accountCurrency, true)}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={isClosing}
              onClick={onClose}
              className="px-4 py-2.5 rounded-full liquid-glass-pill text-neutral-200 text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isClosing}
              className="px-5 py-2.5 rounded-full liquid-glass-primary text-xs font-bold flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Confirm Close</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
