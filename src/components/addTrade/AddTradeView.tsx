import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Calculator, ArrowRight, ShieldAlert, Target, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { TradeDirection } from '../../types/trading';
import { calculateTradeEstimates, getCurrencySymbol } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';

export const AddTradeView: React.FC = () => {
  const { accounts, selectedAccountId, addTrade, setActiveTab, selectedCalendarDate } = useTrading();

  // Core required fields
  const [accountId, setAccountId] = useState(
    selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id || ''
  );
  const [symbol, setSymbol] = useState('XAUUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [entryPrice, setEntryPrice] = useState('2650.00');
  const [stopLoss, setStopLoss] = useState('2640.00');
  const [takeProfit, setTakeProfit] = useState('2680.00');
  const [lotSize, setLotSize] = useState('1.0');
  const [date, setDate] = useState(selectedCalendarDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Common quick symbol chips for 1-tap mobile selection
  const commonSymbols = ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'US30', 'NAS100', 'BTCUSD'];

  // Current active account
  const selectedAccount = accounts.find(a => a.id === accountId) || accounts[0];
  const currencySymbol = getCurrencySymbol(selectedAccount?.currency);

  // Real-Time Automatic Calculations
  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;
    const lots = parseFloat(lotSize) || 0;

    return calculateTradeEstimates(symbol, direction, entry, sl, tp, lots);
  }, [symbol, direction, entryPrice, stopLoss, takeProfit, lotSize]);

  // Handle Form Submission
  const handleSaveTrade = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validation
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) {
      setErrorMessage('Please enter an instrument symbol (e.g. XAUUSD, XAGUSD, GBPUSD).');
      return;
    }

    const parsedEntry = parseFloat(entryPrice);
    if (isNaN(parsedEntry) || parsedEntry <= 0) {
      setErrorMessage('Please enter a valid entry price greater than 0.');
      return;
    }

    const parsedLots = parseFloat(lotSize);
    if (isNaN(parsedLots) || parsedLots <= 0) {
      setErrorMessage('Please enter a valid lot size (e.g. 1.0).');
      return;
    }

    const targetAccountId = accountId || accounts[0]?.id;
    if (!targetAccountId) {
      setErrorMessage('Please select or create a trading account first.');
      return;
    }

    const parsedSl = stopLoss.trim() ? parseFloat(stopLoss) : undefined;
    const parsedTp = takeProfit.trim() ? parseFloat(takeProfit) : undefined;

    // Check logical SL/TP direction
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
      // 2. Perform Save to Firestore
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
        estimatedProfit: calculations?.estimatedProfit,
        estimatedLoss: calculations?.estimatedLoss,
        riskRewardRatio: calculations?.riskReward
      });

      // 3. Clear errors and show success message only after Firebase confirms
      setSuccessMessage(`Trade ${saved.asset} (${saved.direction}) saved as OPEN in your journal.`);

      // Redirect to Trades tab after brief display so user sees confirmation
      setTimeout(() => {
        setActiveTab('trades');
      }, 850);
    } catch (err: any) {
      console.error('Error in handleSaveTrade:', err);
      setErrorMessage(err?.message || 'Failed to save trade. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const springButton = {
    type: 'spring' as const,
    stiffness: 450,
    damping: 25
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
      
      {/* Top Header Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-black/[0.05] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Manual Trade Entry</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Newly saved trades automatically receive status <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full text-[11px]">OPEN</span>
            </p>
          </div>
          <span className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 shadow-inner">
            <Calculator className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Main Glass Form Container */}
      <form onSubmit={handleSaveTrade} className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-5 sm:p-6 space-y-4">
        
        {/* Error Alert Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={springButton}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Cannot Save Trade</span>
                <span>{errorMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={springButton}
              className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1 font-medium">
                {successMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Account Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider text-[11px]">
              Trading Account *
            </label>
            {selectedAccount && (
              <span className="text-xs font-mono font-medium text-emerald-600">
                Bal: {currencySymbol}{selectedAccount.currentBalance.toLocaleString()}
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-neutral-200/90 rounded-2xl px-3.5 py-3 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all appearance-none cursor-pointer"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.type} · {a.currency})</option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Symbol with Quick iOS Pill Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider text-[11px]">
              Instrument Symbol *
            </label>
            <span className="text-[11px] text-neutral-400">e.g. XAGUSD, XAUUSD, US30</span>
          </div>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Type symbol (e.g. XAUUSD, XAGUSD, GBPUSD)"
            required
            disabled={isSubmitting}
            className="w-full bg-[#F8F9FA] border border-neutral-200/90 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all uppercase tracking-wider"
          />
          {/* Quick 1-tap chips with spring press */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
            {commonSymbols.map(sym => (
              <motion.button
                type="button"
                key={sym}
                whileTap={{ scale: 0.92 }}
                transition={springButton}
                onClick={() => setSymbol(sym)}
                disabled={isSubmitting}
                className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border transition-colors shrink-0 cursor-pointer ${
                  symbol === sym
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {sym}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 3. Direction Pill Selector (BUY / SELL) with Spring Touch */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider text-[11px]">
            Direction *
          </label>
          <div className="grid grid-cols-2 gap-2 bg-[#F5F6F8] p-1 rounded-full border border-neutral-200/80">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={springButton}
              onClick={() => setDirection('BUY')}
              disabled={isSubmitting}
              className={`py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                direction === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>BUY (LONG)</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={springButton}
              onClick={() => setDirection('SELL')}
              disabled={isSubmitting}
              className={`py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                direction === 'SELL'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>SELL (SHORT)</span>
            </motion.button>
          </div>
        </div>

        {/* 4. Entry Price & Lot Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 text-[11px]">
              ENTRY PRICE *
            </label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="e.g. 2650.00"
              required
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-neutral-200/90 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 tabular-nums transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 text-[11px]">
              LOT SIZE *
            </label>
            <input
              type="number"
              step="any"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              placeholder="1.0"
              required
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-neutral-200/90 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 tabular-nums transition-all"
            />
          </div>
        </div>

        {/* 5. Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-rose-700 mb-1 flex items-center justify-between text-[11px]">
              <span>STOP LOSS</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            </label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="e.g. 2640.00"
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-rose-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-rose-700 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 tabular-nums transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-emerald-700 mb-1 flex items-center justify-between text-[11px]">
              <span>TAKE PROFIT</span>
              <Target className="w-3.5 h-3.5 text-emerald-500" />
            </label>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="e.g. 2680.00"
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-emerald-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 tabular-nums transition-all"
            />
          </div>
        </div>

        {/* 6. AUTOMATIC REAL-TIME CALCULATIONS CARD */}
        <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-neutral-800" />
              <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider font-mono">
                Live Trade Projections
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">
              {calculations?.isEstimate ? 'CFD Index (Est.)' : 'Contract Specs'}
            </span>
          </div>

          {calculations ? (
            <div className="space-y-3">
              {/* Projected Profit / Loss Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                    Est. Profit (if TP hit)
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums block mt-0.5">
                    +{currencySymbol}{calculations.estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {calculations.isEstimate && <span className="text-[10px] font-normal text-emerald-600 ml-1">(Est.)</span>}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono block mt-0.5">
                    +{calculations.pipsToTp} {calculations.unitLabel} distance
                  </span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider block">
                    Est. Loss (if SL hit)
                  </span>
                  <span className="text-base font-bold font-mono text-rose-700 tabular-nums block mt-0.5">
                    -{currencySymbol}{calculations.estimatedLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {calculations.isEstimate && <span className="text-[10px] font-normal text-rose-600 ml-1">(Est.)</span>}
                  </span>
                  <span className="text-[10px] text-rose-600 font-mono block mt-0.5">
                    -{calculations.pipsToSl} {calculations.unitLabel} distance
                  </span>
                </div>
              </div>

              {/* Risk-Reward & Distance stats */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center border-t border-neutral-200/60">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Risk:Reward</span>
                  <span className="text-xs font-bold font-mono text-neutral-900 tabular-nums">
                    {calculations.riskReward > 0 ? `1 : ${calculations.riskReward}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">SL Distance</span>
                  <span className="text-xs font-mono text-neutral-700 tabular-nums">
                    {calculations.distanceToSl} ({calculations.pipsToSl} {calculations.unitLabel})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">TP Distance</span>
                  <span className="text-xs font-mono text-neutral-700 tabular-nums">
                    {calculations.distanceToTp} ({calculations.pipsToTp} {calculations.unitLabel})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-neutral-500 font-medium">
              Enter Entry Price and Stop Loss or Take Profit to see real-time projections.
            </div>
          )}
        </div>

        {/* 7. Date & Optional Trade Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 text-[11px]">
              DATE
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-neutral-200/90 rounded-2xl px-3 py-2 text-xs text-neutral-900 font-mono focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 text-[11px]">
              NOTES (OPTIONAL)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Setup context or strategy..."
              disabled={isSubmitting}
              className="w-full bg-[#F8F9FA] border border-neutral-200/90 rounded-2xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* 8. Prominent Pill Save Trade CTA with Spring Press */}
        <div className="pt-2">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.01 }}
            transition={springButton}
            disabled={isSubmitting}
            onClick={(e) => {
              if (!isSubmitting) handleSaveTrade(e);
            }}
            className="w-full py-4 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs tracking-wider uppercase transition-colors shadow-md shadow-neutral-950/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Trade to Firebase...</span>
              </>
            ) : (
              <>
                <span>Save Trade to Journal</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </motion.button>
        </div>

      </form>

    </div>
  );
};
