import React, { useState, useMemo, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { TradeDirection } from '../../types/trading';
import {
  calculateTradeMetrics,
  formatMoney,
  formatRiskReward
} from '../../utils/calculations';
import {
  X,
  Calculator,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Target,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddTradeModalProps {
  onSavedSuccess?: (message: string) => void;
}

export const AddTradeModal: React.FC<AddTradeModalProps> = ({ onSavedSuccess }) => {
  const {
    accounts,
    selectedAccountId,
    addTrade,
    isAddTradeModalOpen,
    setIsAddTradeModalOpen,
    selectedCalendarDate,
    instrumentSpecs,
    exchangeRates,
    saveExchangeRate,
    setSpecModalSymbol
  } = useTrading();

  const [accountId, setAccountId] = useState(
    selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id || ''
  );
  const [symbol, setSymbol] = useState('XAUUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [lotSize, setLotSize] = useState('1.0');
  const [date, setDate] = useState(selectedCalendarDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [quickRateInput, setQuickRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickSymbols = useMemo(() => {
    const saved = Object.keys(instrumentSpecs);
    const defaults = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'XAGUSD'];
    const merged = Array.from(new Set([...defaults, ...saved]));
    return merged.slice(0, 10);
  }, [instrumentSpecs]);

  useEffect(() => {
    if (isAddTradeModalOpen) {
      setAccountId(selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id || '');
      if (selectedCalendarDate) {
        setDate(selectedCalendarDate);
      }
      setErrorMessage(null);
      setQuickRateInput('');
    }
  }, [isAddTradeModalOpen, selectedAccountId, accounts, selectedCalendarDate]);

  const selectedAccount = accounts.find(a => a.id === accountId) || accounts[0];
  const accountCurrency = selectedAccount?.currency || 'USD';
  const cleanSymbol = symbol.trim().toUpperCase();
  const hasSpec = Boolean(cleanSymbol && instrumentSpecs[cleanSymbol]);

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const sl = stopLoss.trim() ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit.trim() ? parseFloat(takeProfit) : undefined;
    const lots = parseFloat(lotSize) || 0;

    return calculateTradeMetrics({
      symbol: cleanSymbol,
      direction,
      entryPrice: entry,
      stopLoss: sl !== undefined && !isNaN(sl) ? sl : undefined,
      takeProfit: tp !== undefined && !isNaN(tp) ? tp : undefined,
      lotSize: lots,
      accountCurrency,
      specsMap: instrumentSpecs,
      exchangeRates
    });
  }, [
    cleanSymbol,
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    lotSize,
    accountCurrency,
    instrumentSpecs,
    exchangeRates
  ]);

  const handleSaveQuickRate = async () => {
    if (!calculations.missingConversion) return;
    const val = parseFloat(quickRateInput);
    if (isNaN(val) || val <= 0) {
      setErrorMessage('Enter a valid positive exchange rate.');
      return;
    }
    setSavingRate(true);
    setErrorMessage(null);
    try {
      await saveExchangeRate(calculations.missingConversion.suggestedKey, val);
      setQuickRateInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save exchange rate.');
    } finally {
      setSavingRate(false);
    }
  };

  const handleSaveTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!cleanSymbol) {
      setErrorMessage('Please enter an instrument symbol (e.g. XAUUSD, EURUSD, USDJPY).');
      return;
    }

    const parsedEntry = parseFloat(entryPrice);
    if (isNaN(parsedEntry) || parsedEntry <= 0) {
      setErrorMessage('Please enter a valid entry price greater than 0.');
      return;
    }

    const parsedLots = parseFloat(lotSize);
    if (isNaN(parsedLots) || parsedLots <= 0) {
      setErrorMessage('Please enter a valid lot size (e.g. 0.1, 1.0).');
      return;
    }

    const targetAccountId = accountId || accounts[0]?.id;
    if (!targetAccountId) {
      setErrorMessage('Please create or select a trading account first.');
      return;
    }

    const parsedSl = stopLoss.trim() ? parseFloat(stopLoss) : undefined;
    const parsedTp = takeProfit.trim() ? parseFloat(takeProfit) : undefined;

    if (parsedSl !== undefined && !isNaN(parsedSl)) {
      if (direction === 'BUY' && parsedSl >= parsedEntry) {
        setErrorMessage('For a BUY trade, Stop Loss must be below the Entry Price.');
        return;
      }
      if (direction === 'SELL' && parsedSl <= parsedEntry) {
        setErrorMessage('For a SELL trade, Stop Loss must be above the Entry Price.');
        return;
      }
    }

    if (parsedTp !== undefined && !isNaN(parsedTp)) {
      if (direction === 'BUY' && parsedTp <= parsedEntry) {
        setErrorMessage('For a BUY trade, Take Profit must be above the Entry Price.');
        return;
      }
      if (direction === 'SELL' && parsedTp >= parsedEntry) {
        setErrorMessage('For a SELL trade, Take Profit must be below the Entry Price.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const saved = await addTrade({
        accountId: targetAccountId,
        asset: cleanSymbol,
        direction,
        entryPrice: parsedEntry,
        stopLoss: parsedSl,
        takeProfit: parsedTp,
        lotSize: parsedLots,
        realizedPnl: 0,
        status: 'Open',
        date,
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        notes: notes.trim() || undefined,
        estimatedProfit: calculations.status === 'ok' && calculations.estimatedProfit !== null ? calculations.estimatedProfit : undefined,
        estimatedLoss: calculations.status === 'ok' && calculations.estimatedRisk !== null ? calculations.estimatedRisk : undefined,
        riskRewardRatio: calculations.status === 'ok' && calculations.riskReward !== null ? calculations.riskReward : undefined,
        pipsToSl: calculations.slPips > 0 ? calculations.slPips : undefined,
        pipsToTp: calculations.tpPips > 0 ? calculations.tpPips : undefined,
        isEstimate: calculations.status !== 'ok'
      });

      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
      setNotes('');
      setIsAddTradeModalOpen(false);
      if (onSavedSuccess) {
        onSavedSuccess(`Saved ${saved.asset} (${saved.direction}) as Open`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save trade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const missingPairParts = calculations.missingConversion?.suggestedKey.split('_') || [];

  return (
    <AnimatePresence>
      {isAddTradeModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isSubmitting && setIsAddTradeModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="liquid-glass-surface rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div>
                <h2 className="text-base font-bold text-white">Manual Trade Entry</h2>
                <p className="text-[11px] text-neutral-400">Saves automatically as an Open trade</p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsAddTradeModalOpen(false)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-white cursor-pointer flex items-center justify-center"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTrade} className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Account & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-xs text-white cursor-pointer"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} className="bg-[#18191D] text-white">
                        {a.name} ({a.currency} · {formatMoney(a.currentBalance, a.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Symbol & Direction */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Instrument Symbol *</label>
                  {cleanSymbol && (
                    <button
                      type="button"
                      onClick={() => setSpecModalSymbol(cleanSymbol)}
                      className="text-[11px] font-semibold text-neutral-200 hover:text-white liquid-glass-pill px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{hasSpec ? `Edit ${cleanSymbol} Spec` : `Configure ${cleanSymbol}`}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. XAUUSD, EURUSD, USDJPY, US30"
                  required
                  className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-sm font-mono font-bold text-white uppercase"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickSymbols.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSymbol(s)}
                      className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        cleanSymbol === s
                          ? 'liquid-glass-primary'
                          : 'liquid-glass-pill text-neutral-300 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction & Lot Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-1 liquid-glass-subcard p-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => setDirection('BUY')}
                      className={`py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        direction === 'BUY'
                          ? 'bg-[#34D399] text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SELL')}
                      className={`py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        direction === 'SELL'
                          ? 'bg-[#F87171] text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Lot Size *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    placeholder="1.0"
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-sm font-mono font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Entry, Stop Loss, Take Profit */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Entry *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2.5 text-xs font-mono font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional"
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2.5 text-xs font-mono font-bold text-red-300 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Take Profit
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional"
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2.5 text-xs font-mono font-bold text-emerald-300 tabular-nums"
                  />
                </div>
              </div>

              {/* Missing Instrument Spec Prompt */}
              {calculations.status === 'missing_spec' && calculations.missingSpecSymbol && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2 text-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-bold">Broker Specification Missing for {calculations.missingSpecSymbol}</p>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        Configure contract size, tick size, and quote currency to avoid inaccurate estimates.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpecModalSymbol(calculations.missingSpecSymbol!)}
                    className="px-4 py-2 rounded-full liquid-glass-primary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure {calculations.missingSpecSymbol} Spec</span>
                  </button>
                </div>
              )}

              {/* Missing Currency Conversion Prompt */}
              {calculations.status === 'missing_conversion' && calculations.missingConversion && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2 text-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-bold">
                        Conversion Rate Needed ({calculations.missingConversion.from} → {calculations.missingConversion.to})
                      </p>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        Enter the current exchange rate to convert monetary values into {accountCurrency}:
                      </p>
                    </div>
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
                    <span className="text-xs font-mono text-white shrink-0">
                      {missingPairParts[1]}
                    </span>
                    <button
                      type="button"
                      disabled={savingRate}
                      onClick={handleSaveQuickRate}
                      className="px-3.5 py-1.5 rounded-full liquid-glass-primary text-xs font-bold cursor-pointer shrink-0"
                    >
                      {savingRate ? 'Saving...' : 'Save Rate'}
                    </button>
                  </div>
                </div>
              )}

              {/* Invalid Price Placement Notice (No fake R:R shown) */}
              {calculations.status === 'invalid_prices' && calculations.errors.length > 0 && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-3.5 space-y-1">
                  {calculations.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 text-red-200 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Accurate Calculations */}
              {calculations.status === 'ok' && (calculations.estimatedRisk !== null || calculations.estimatedProfit !== null) && (
                <div className="liquid-glass-subcard rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                      <Calculator className="w-3.5 h-3.5 text-white" />
                      <span>Risk &amp; Reward Projection</span>
                    </span>
                    <span className="font-mono font-bold text-white">
                      Risk-to-Reward: {calculations.riskReward ? formatRiskReward(calculations.riskReward) : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5">
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <ShieldAlert className="w-3 h-3 text-[#F87171]" />
                        <span>
                          Risk ({calculations.slPips} {calculations.unitLabel})
                        </span>
                      </div>
                      <span className="text-sm font-bold font-mono text-[#F87171] tabular-nums block mt-0.5">
                        {calculations.estimatedRisk !== null
                          ? formatMoney(calculations.estimatedRisk, accountCurrency)
                          : '—'}
                      </span>
                    </div>

                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5">
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <Target className="w-3 h-3 text-[#34D399]" />
                        <span>
                          Potential Profit ({calculations.tpPips} {calculations.unitLabel})
                        </span>
                      </div>
                      <span className="text-sm font-bold font-mono text-[#34D399] tabular-nums block mt-0.5">
                        {calculations.estimatedProfit !== null
                          ? formatMoney(calculations.estimatedProfit, accountCurrency)
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {(calculations.riskConversionLabel || calculations.profitConversionLabel) && (
                    <div className="text-[10px] font-mono text-neutral-500 pt-0.5">
                      Rate Basis: {calculations.riskConversionLabel || calculations.profitConversionLabel}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Trade Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Setup reason, timeframe, execution thoughts..."
                  className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 resize-none"
                />
              </div>

              {/* Submit Bar */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddTradeModalOpen(false)}
                  className="px-4 py-2.5 rounded-full liquid-glass-pill text-neutral-200 text-xs font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full liquid-glass-primary disabled:opacity-60 text-xs font-bold flex items-center gap-2 cursor-pointer min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Trade</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
