import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { AccountCurrency } from '../../types/trading';
import {
  calculateLotSize,
  countStepDecimals,
  formatMoney,
  getCurrencySymbol
} from '../../utils/calculations';
import {
  Plus,
  Check,
  Trash2,
  Shield,
  Calculator,
  BookOpen,
  Wallet,
  X,
  Loader2,
  AlertCircle,
  Sliders,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_RULES = [
  'Never trade without a Stop Loss',
  'Risk maximum 1% per trade setup',
  'Stop trading after 2 consecutive losses',
  'Wait for 15m candle close before entry'
];

const SUPPORTED_CURRENCIES: AccountCurrency[] = ['USD', 'NGN', 'EUR', 'GBP', 'AUD', 'JPY'];

export const ToolsView: React.FC = () => {
  const {
    rules,
    addRule,
    toggleRule,
    deleteRule,
    journalEntries,
    addJournalEntry,
    deleteJournalEntry,
    accounts,
    activeAccount,
    setIsAccountModalOpen,
    selectedCalendarDate,
    instrumentSpecs,
    deleteInstrumentSpec,
    exchangeRates,
    saveExchangeRate,
    deleteExchangeRate,
    setSpecModalSymbol
  } = useTrading();

  // Sub-section tabs inside Tools
  const [section, setSection] = useState<'rules' | 'notes' | 'calculator' | 'specs'>('rules');

  // Rules state
  const [ruleInput, setRuleInput] = useState('');
  const [ruleBusy, setRuleBusy] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const ruleInputRef = useRef<HTMLInputElement>(null);

  // Journal note modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteDate, setNoteDate] = useState(selectedCalendarDate || new Date().toISOString().split('T')[0]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteEmotions, setNoteEmotions] = useState('');
  const [noteLessons, setNoteLessons] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Upgraded Position Size Calculator state
  const defaultCalcAccount = activeAccount || accounts[0];
  const [calcAccountId, setCalcAccountId] = useState(defaultCalcAccount?.id || '');
  const [calcSymbol, setCalcSymbol] = useState('EURUSD');
  const [calcBalance, setCalcBalance] = useState(
    defaultCalcAccount?.currentBalance ? defaultCalcAccount.currentBalance.toString() : '10000'
  );
  const [calcCurrency, setCalcCurrency] = useState<AccountCurrency>(
    defaultCalcAccount?.currency || 'USD'
  );
  const [riskMode, setRiskMode] = useState<'percent' | 'amount'>('percent');
  const [riskValue, setRiskValue] = useState('1.0');
  const [calcEntry, setCalcEntry] = useState('1.1000');
  const [calcSl, setCalcSl] = useState('1.0950');
  const [calcTp, setCalcTp] = useState('');
  const [manualLotInput, setManualLotInput] = useState<string>('');
  const [quickRateInput, setQuickRateInput] = useState<string>('');
  const [savingQuickRate, setSavingQuickRate] = useState(false);
  const [calcActionError, setCalcActionError] = useState<string | null>(null);

  // Sync balance & currency when active account changes
  useEffect(() => {
    const targetAcc = activeAccount || accounts.find(a => a.id === calcAccountId) || accounts[0];
    if (targetAcc) {
      setCalcAccountId(targetAcc.id);
      setCalcBalance(targetAcc.currentBalance.toString());
      setCalcCurrency(targetAcc.currency);
    }
  }, [activeAccount?.id]);

  const handleCalcAccountChange = (accId: string) => {
    setCalcAccountId(accId);
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      setCalcBalance(acc.currentBalance.toString());
      setCalcCurrency(acc.currency);
      setManualLotInput('');
    }
  };

  // Exchange Rate Editor state (Specs & Rates tab)
  const [rateFrom, setRateFrom] = useState('USD');
  const [rateTo, setRateTo] = useState('NGN');
  const [rateVal, setRateVal] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [rateErr, setRateErr] = useState<string | null>(null);

  const handleAddRule = async (textToSave?: string) => {
    setRuleError(null);
    const val = (textToSave !== undefined ? textToSave : ruleInput).trim();
    if (!val) {
      setRuleError('Type a trading rule first, or tap a preset below.');
      ruleInputRef.current?.focus();
      return;
    }

    setRuleBusy(true);
    try {
      await addRule(val);
      if (textToSave === undefined) setRuleInput('');
    } catch (err: any) {
      setRuleError(err?.message || 'Failed to add trading rule.');
    } finally {
      setRuleBusy(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError(null);
    if (!noteTitle.trim()) {
      setNoteError('Please enter a headline for your reflection.');
      return;
    }

    setNoteBusy(true);
    try {
      await addJournalEntry({
        date: noteDate,
        title: noteTitle.trim(),
        notes: noteBody.trim(),
        emotions: noteEmotions.trim() || undefined,
        lessons: noteLessons.trim() || undefined
      });
      setNoteTitle('');
      setNoteBody('');
      setNoteEmotions('');
      setNoteLessons('');
      setIsNoteModalOpen(false);
    } catch (err: any) {
      setNoteError(err?.message || 'Failed to save reflection.');
    } finally {
      setNoteBusy(false);
    }
  };

  const cleanCalcSymbol = calcSymbol.toUpperCase().trim();
  const activeSpec = instrumentSpecs[cleanCalcSymbol];
  const lotDecimals = activeSpec ? countStepDecimals(activeSpec.lotStep) : 2;

  const lotCalcResult = useMemo(() => {
    const balance = parseFloat(calcBalance) || 0;
    const rVal = parseFloat(riskValue) || 0;
    const entry = parseFloat(calcEntry) || 0;
    const sl = parseFloat(calcSl) || 0;
    const tp = calcTp.trim() ? parseFloat(calcTp) : undefined;
    const manualParsed = manualLotInput.trim() !== '' ? parseFloat(manualLotInput) : null;

    return calculateLotSize({
      symbol: cleanCalcSymbol,
      accountBalance: balance,
      accountCurrency: calcCurrency,
      riskMode,
      riskValue: rVal,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp !== undefined && !isNaN(tp) ? tp : undefined,
      specsMap: instrumentSpecs,
      exchangeRates,
      manualLotOverride: manualParsed !== null && !isNaN(manualParsed) ? manualParsed : null
    });
  }, [
    cleanCalcSymbol,
    calcBalance,
    calcCurrency,
    riskMode,
    riskValue,
    calcEntry,
    calcSl,
    calcTp,
    instrumentSpecs,
    exchangeRates,
    manualLotInput
  ]);

  const handleSaveQuickRate = async () => {
    if (!lotCalcResult.missingConversion) return;
    const val = parseFloat(quickRateInput);
    if (isNaN(val) || val <= 0) {
      setCalcActionError('Enter a valid positive exchange rate.');
      return;
    }
    setSavingQuickRate(true);
    setCalcActionError(null);
    try {
      await saveExchangeRate(lotCalcResult.missingConversion.suggestedKey, val);
      setQuickRateInput('');
    } catch (err: any) {
      setCalcActionError(err?.message || 'Failed to save rate.');
    } finally {
      setSavingQuickRate(false);
    }
  };

  const handleAddExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateErr(null);
    const from = rateFrom.toUpperCase().trim();
    const to = rateTo.toUpperCase().trim();
    const num = parseFloat(rateVal);
    if (!from || !to || from === to) {
      setRateErr('Select two different currencies.');
      return;
    }
    if (isNaN(num) || num <= 0) {
      setRateErr('Enter a positive conversion rate.');
      return;
    }

    setRateBusy(true);
    try {
      await saveExchangeRate(`${from}_${to}`, num);
      setRateVal('');
    } catch (err: any) {
      setRateErr(err?.message || 'Failed to save exchange rate.');
    } finally {
      setRateBusy(false);
    }
  };

  const missingPairParts = lotCalcResult.missingConversion?.suggestedKey.split('_') || [];
  const savedSpecsList = useMemo(
    () => Object.values(instrumentSpecs).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [instrumentSpecs]
  );
  const savedRatesList = useMemo(
    () => Object.entries(exchangeRates).sort(([a], [b]) => a.localeCompare(b)),
    [exchangeRates]
  );

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 pb-24 space-y-3.5">
      {/* Segmented Tool Selector */}
      <div className="bg-[#262626] p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-white/[0.04] shadow-md">
        <button
          type="button"
          onClick={() => setSection('rules')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px] ${
            section === 'rules' ? 'bg-[#2196F3] text-white' : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Rules ({rules.filter(r => r.isActive).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('notes')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px] ${
            section === 'notes' ? 'bg-[#2196F3] text-white' : 'text-neutral-300 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Reflections</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('calculator')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px] ${
            section === 'calculator' ? 'bg-[#2196F3] text-white' : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Lot Calc</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('specs')}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px] ${
            section === 'specs' ? 'bg-[#2196F3] text-white' : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Specs &amp; Rates</span>
        </button>
      </div>

      {/* SECTION 1: TRADING RULES */}
      {section === 'rules' && (
        <div className="space-y-3">
          <div className="bg-[#262626] rounded-xl p-4 border border-white/[0.04] shadow-md space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-white">Trading Rules &amp; Discipline</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Tap any rule to check it off before entering a session.
              </p>
            </div>

            {ruleError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ruleError}</span>
              </div>
            )}

            {/* Add Rule Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddRule();
              }}
              className="flex gap-2"
            >
              <input
                ref={ruleInputRef}
                type="text"
                value={ruleInput}
                onChange={(e) => {
                  setRuleInput(e.target.value);
                  if (ruleError) setRuleError(null);
                }}
                placeholder="Write a new trading rule..."
                className="flex-1 bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#2196F3]"
              />
              <button
                type="submit"
                disabled={ruleBusy}
                className="px-4 py-2.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[42px]"
              >
                {ruleBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Add Rule</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_RULES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={ruleBusy}
                  onClick={() => handleAddRule(preset)}
                  className="text-[11px] bg-[#1C1C1C] hover:bg-[#333333] border border-white/[0.06] text-neutral-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-[#2196F3]" />
                  <span>{preset}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-[#262626] rounded-xl px-4 py-3.5 border border-white/[0.04] shadow-sm flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer min-h-[36px]"
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                        rule.isActive
                          ? 'bg-[#2196F3] border-[#2196F3] text-white'
                          : 'border-neutral-500 bg-transparent'
                      }`}
                    >
                      {rule.isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-medium leading-snug ${
                        rule.isActive ? 'text-white font-semibold' : 'text-neutral-500 line-through'
                      }`}
                    >
                      {rule.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteRule(rule.id)}
                    aria-label="Delete rule"
                    className="p-2 text-neutral-500 hover:text-[#EF4444] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-[#262626] rounded-xl p-6 text-center text-xs text-neutral-400 border border-white/[0.04]">
                No trading rules yet. Add one above to stay disciplined.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: JOURNAL REFLECTIONS */}
      {section === 'notes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#262626] rounded-xl px-4 py-3.5 border border-white/[0.04]">
            <div>
              <h2 className="text-sm font-bold text-white">Daily Reflections</h2>
              <span className="text-[11px] text-neutral-400">Market analysis, emotions &amp; lessons</span>
            </div>
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>

          {journalEntries.length > 0 ? (
            journalEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#262626] rounded-xl p-4 border border-white/[0.04] shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-neutral-400 block">{entry.date}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{entry.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteJournalEntry(entry.id)}
                    aria-label="Delete reflection"
                    className="p-2 text-neutral-500 hover:text-[#EF4444] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {entry.notes && (
                  <p className="text-xs text-neutral-300 leading-relaxed">{entry.notes}</p>
                )}

                {(entry.emotions || entry.lessons) && (
                  <div className="pt-2 border-t border-white/[0.06] space-y-1 text-[11px]">
                    {entry.emotions && (
                      <div className="text-neutral-300">
                        <span className="text-neutral-500 font-semibold">Emotions: </span>
                        {entry.emotions}
                      </div>
                    )}
                    {entry.lessons && (
                      <div className="text-[#2ECC71]">
                        <span className="text-emerald-400/70 font-semibold">Lesson: </span>
                        {entry.lessons}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-[#262626] rounded-xl p-6 text-center text-xs text-neutral-400 border border-white/[0.04]">
              No reflections recorded yet. Tap &quot;New Note&quot; to log your thoughts.
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: UPGRADED POSITION SIZE & RISK CALCULATOR */}
      {section === 'calculator' && (
        <div className="bg-[#262626] rounded-xl p-4 border border-white/[0.04] shadow-md space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Position Size Calculator</h2>
              <span className="text-[11px] text-neutral-400">
                Calculates risk &amp; reward in {calcCurrency} ({getCurrencySymbol(calcCurrency)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#333333] hover:bg-[#404040] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Wallet className="w-3.5 h-3.5 text-[#2196F3]" />
              <span>Accounts</span>
            </button>
          </div>

          {/* Account Picker inside Calculator */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Trading Account
              </label>
              <select
                value={calcAccountId}
                onChange={(e) => handleCalcAccountChange(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#2196F3]"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.type} · {a.currency} ({formatMoney(a.currentBalance, a.currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Symbol & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">Instrument Symbol</label>
              {cleanCalcSymbol && (
                <button
                  type="button"
                  onClick={() => setSpecModalSymbol(cleanCalcSymbol)}
                  className="text-[11px] font-semibold text-[#2196F3] hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{activeSpec ? `Edit ${cleanCalcSymbol} Spec` : `Configure ${cleanCalcSymbol}`}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={calcSymbol}
              onChange={(e) => {
                setCalcSymbol(e.target.value);
                setManualLotInput('');
              }}
              placeholder="e.g. EURUSD, USDJPY, XAUUSD"
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-white uppercase focus:outline-none focus:border-[#2196F3]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {savedSpecsList.slice(0, 8).map(sp => (
                <button
                  key={sp.symbol}
                  type="button"
                  onClick={() => {
                    setCalcSymbol(sp.symbol);
                    setManualLotInput('');
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                    cleanCalcSymbol === sp.symbol
                      ? 'bg-[#2196F3] text-white'
                      : 'bg-[#1C1C1C] text-neutral-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {sp.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Balance, Currency, Risk Mode & Risk Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Account Balance
              </label>
              <input
                type="number"
                step="any"
                value={calcBalance}
                onChange={(e) => setCalcBalance(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#2196F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Account Currency
              </label>
              <select
                value={calcCurrency}
                onChange={(e) => setCalcCurrency(e.target.value as AccountCurrency)}
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#2196F3]"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c}>
                    {c} ({getCurrencySymbol(c)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Risk ({riskMode === 'percent' ? '%' : getCurrencySymbol(calcCurrency)})
                </label>
                <div className="flex bg-[#1C1C1C] rounded p-0.5 border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRiskMode('percent')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      riskMode === 'percent' ? 'bg-[#2196F3] text-white' : 'text-neutral-400'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiskMode('amount')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      riskMode === 'amount' ? 'bg-[#2196F3] text-white' : 'text-neutral-400'
                    }`}
                  >
                    {getCurrencySymbol(calcCurrency)}
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={riskValue}
                onChange={(e) => {
                  setRiskValue(e.target.value);
                  setManualLotInput('');
                }}
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#2196F3]"
              />
            </div>
          </div>

          {/* Entry Price, Stop Loss & Optional Take Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Entry Price
              </label>
              <input
                type="number"
                step="any"
                value={calcEntry}
                onChange={(e) => setCalcEntry(e.target.value)}
                placeholder="e.g. 1.1000"
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#2196F3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Stop Loss Price
              </label>
              <input
                type="number"
                step="any"
                value={calcSl}
                onChange={(e) => setCalcSl(e.target.value)}
                placeholder="e.g. 1.0950"
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-red-300 tabular-nums focus:outline-none focus:border-[#2196F3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Take Profit (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={calcTp}
                onChange={(e) => setCalcTp(e.target.value)}
                placeholder="For reward est."
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-emerald-300 tabular-nums focus:outline-none focus:border-[#2196F3]"
              />
            </div>
          </div>

          {calcActionError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{calcActionError}</span>
            </div>
          )}

          {/* Missing Spec Prompt */}
          {lotCalcResult.status === 'missing_spec' && lotCalcResult.missingSpecSymbol && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start gap-2 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-bold">Specification Missing for {lotCalcResult.missingSpecSymbol}</p>
                  <p className="text-[11px] text-amber-200/80">
                    Configure contract size, tick size, lot step, and quote currency to compute exact lots.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpecModalSymbol(lotCalcResult.missingSpecSymbol!)}
                className="px-3.5 py-2 rounded-lg bg-[#2196F3] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure {lotCalcResult.missingSpecSymbol}</span>
              </button>
            </div>
          )}

          {/* Missing Conversion Rate Prompt */}
          {lotCalcResult.status === 'missing_conversion' && lotCalcResult.missingConversion && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-start gap-2 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Conversion Rate Required ({lotCalcResult.missingConversion.from} → {lotCalcResult.missingConversion.to})
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
                  className="flex-1 bg-[#1C1C1C] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
                <span className="text-xs font-mono text-white shrink-0">{missingPairParts[1]}</span>
                <button
                  type="button"
                  disabled={savingQuickRate}
                  onClick={handleSaveQuickRate}
                  className="px-3 py-1.5 rounded-lg bg-[#2196F3] text-white text-xs font-bold cursor-pointer"
                >
                  {savingQuickRate ? '...' : 'Save Rate'}
                </button>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {lotCalcResult.status === 'invalid' && lotCalcResult.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              {lotCalcResult.errors[0]}
            </div>
          )}

          {/* Calculated Outputs */}
          {lotCalcResult.status === 'ok' && (
            <div className="space-y-3 pt-1">
              <div className={`grid grid-cols-1 ${lotCalcResult.potentialRewardAmount !== null ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                <div className="bg-[#1C1C1C] rounded-xl p-3.5 border border-[#2196F3]/30">
                  <span className="text-[11px] text-neutral-400 block">
                    Recommended Lot Size
                  </span>
                  <span className="text-lg font-bold font-mono text-[#2196F3] tabular-nums mt-0.5 block">
                    {lotCalcResult.recommendedLots.toFixed(lotDecimals)} lots
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                    Raw: {lotCalcResult.rawLots} · Step {activeSpec?.lotStep}
                  </span>
                </div>

                <div className="bg-[#1C1C1C] rounded-xl p-3.5 border border-white/[0.06]">
                  <span className="text-[11px] text-neutral-400 block">
                    Estimated Risk ({calcCurrency})
                  </span>
                  <span className="text-lg font-bold font-mono text-[#EF4444] tabular-nums mt-0.5 block">
                    {formatMoney(lotCalcResult.exactRiskAmount, calcCurrency)}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                    {lotCalcResult.exactRiskPercent}% of balance (target {lotCalcResult.intendedRiskPercent}%)
                  </span>
                </div>

                {lotCalcResult.potentialRewardAmount !== null && (
                  <div className="bg-[#1C1C1C] rounded-xl p-3.5 border border-[#2ECC71]/25">
                    <span className="text-[11px] text-neutral-400 block">
                      Potential Reward ({calcCurrency})
                    </span>
                    <span className="text-lg font-bold font-mono text-[#2ECC71] tabular-nums mt-0.5 block">
                      {formatMoney(lotCalcResult.potentialRewardAmount, calcCurrency, true)}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                      +{lotCalcResult.potentialRewardPercent}% {lotCalcResult.riskReward ? `· R:R 1:${lotCalcResult.riskReward}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {lotCalcResult.tpInvalidWarning && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-[11px] text-red-300">
                  {lotCalcResult.tpInvalidWarning}
                </div>
              )}

              {/* SL Distance & Broker Limits Summary */}
              <div className="bg-[#1C1C1C] rounded-xl px-3.5 py-2.5 border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-300">
                <span>
                  SL Distance: <strong className="text-white">{lotCalcResult.slDistancePips} {lotCalcResult.unitLabel}</strong>
                </span>
                <span>
                  1.00 Lot Risk: <strong className="text-white">{formatMoney(lotCalcResult.riskPerOneLot, calcCurrency)}</strong>
                </span>
                {activeSpec && (
                  <span className="text-neutral-400">
                    Limits: {activeSpec.minLot}–{activeSpec.maxLot} (step {activeSpec.lotStep})
                  </span>
                )}
              </div>

              {/* Manual Lot Adjustment */}
              <div className="bg-[#1C1C1C] rounded-xl p-3 border border-white/[0.06] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-neutral-200 block">
                    Manual Lot Adjustment (Optional)
                  </span>
                  <span className="text-[10px] text-neutral-400 block">
                    Override lot size to preview exact risk for a custom position
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    step={activeSpec?.lotStep || 0.01}
                    min="0"
                    value={manualLotInput}
                    onChange={(e) => setManualLotInput(e.target.value)}
                    placeholder={lotCalcResult.recommendedLots.toFixed(lotDecimals)}
                    className="w-24 bg-[#262626] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-right tabular-nums focus:outline-none focus:border-[#2196F3]"
                  />
                  {manualLotInput !== '' && (
                    <button
                      type="button"
                      onClick={() => setManualLotInput('')}
                      title="Reset to recommended lot"
                      className="p-1.5 rounded-lg bg-[#262626] text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {lotCalcResult.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 space-y-1">
                  {lotCalcResult.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-200 leading-snug">
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {lotCalcResult.conversionLabel && (
                <p className="text-[10px] font-mono text-neutral-500">
                  Rate Basis: {lotCalcResult.conversionLabel}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: BROKER SPECS & CURRENCY RATES */}
      {section === 'specs' && (
        <div className="space-y-3.5">
          {/* Broker Instrument Specifications */}
          <div className="bg-[#262626] rounded-xl p-4 border border-white/[0.04] shadow-md space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">Broker Instrument Specifications</h2>
                <p className="text-[11px] text-neutral-400">
                  Contract sizes, tick sizes, tick values, and lot limits saved in Firestore
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSpecModalSymbol('')}
                className="px-3 py-2 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Symbol</span>
              </button>
            </div>

            <div className="space-y-2">
              {savedSpecsList.map(spec => (
                <div
                  key={spec.symbol}
                  className="bg-[#1C1C1C] rounded-xl p-3 border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{spec.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-300">
                        {spec.category}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        Quote: {spec.quoteCurrency}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Contract: {spec.contractSize.toLocaleString()}</span>
                      <span>Tick: {spec.tickSize}</span>
                      {spec.pipSize && <span>Pip: {spec.pipSize}</span>}
                      <span>Lots: {spec.minLot}–{spec.maxLot} (step {spec.lotStep})</span>
                    </div>
                    {(spec.tickValueProfit || spec.tickValueLoss) && (
                      <div className="text-[10px] font-mono text-[#2196F3] mt-0.5">
                        Broker Tick Val ({spec.tickValueCurrency || 'USD'}): Profit {spec.tickValueProfit ?? '—'} · Loss {spec.tickValueLoss ?? '—'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSpecModalSymbol(spec.symbol)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-neutral-200 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteInstrumentSpec(spec.symbol)}
                      aria-label={`Delete ${spec.symbol} spec`}
                      className="p-1.5 text-neutral-500 hover:text-[#EF4444] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Currency Conversion Rates */}
          <div className="bg-[#262626] rounded-xl p-4 border border-white/[0.04] shadow-md space-y-3">
            <div>
              <h2 className="text-sm font-bold text-white">Currency Conversion Rates</h2>
              <p className="text-[11px] text-neutral-400">
                User-configured exchange rates used to convert instrument P/L and risk into your account currency
              </p>
            </div>

            {rateErr && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rateErr}</span>
              </div>
            )}

            <form onSubmit={handleAddExchangeRate} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <label className="block text-[10px] text-neutral-400 mb-1">1 Unit Of</label>
                <input
                  type="text"
                  value={rateFrom}
                  onChange={(e) => setRateFrom(e.target.value)}
                  placeholder="USD"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-white uppercase"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] text-neutral-400 mb-1">To Currency</label>
                <input
                  type="text"
                  value={rateTo}
                  onChange={(e) => setRateTo(e.target.value)}
                  placeholder="NGN"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-white uppercase"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-[10px] text-neutral-400 mb-1">Rate</label>
                <input
                  type="number"
                  step="any"
                  value={rateVal}
                  onChange={(e) => setRateVal(e.target.value)}
                  placeholder="e.g. 1650"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white"
                />
              </div>
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={rateBusy}
                  className="w-full py-2 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold cursor-pointer"
                >
                  {rateBusy ? '...' : 'Save'}
                </button>
              </div>
            </form>

            {savedRatesList.length > 0 ? (
              <div className="space-y-1.5">
                {savedRatesList.map(([pairKey, rate]) => {
                  const [f, t] = pairKey.split('_');
                  return (
                    <div
                      key={pairKey}
                      className="bg-[#1C1C1C] rounded-lg px-3 py-2.5 border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-neutral-200">
                        1 <strong className="text-white">{f}</strong> = <strong className="text-[#2196F3]">{rate}</strong> <strong className="text-white">{t}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteExchangeRate(pairKey)}
                        aria-label={`Delete ${pairKey} rate`}
                        className="p-1 text-neutral-500 hover:text-[#EF4444] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#1C1C1C] rounded-lg p-3 text-center text-[11px] text-neutral-400 border border-white/[0.04]">
                No custom exchange rates saved yet. Same-currency pairs and USD-base pairs (e.g. USDJPY on USD account) work automatically; add rates like USD → NGN here when needed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW REFLECTION MODAL */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => !noteBusy && setIsNoteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="bg-[#262626] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#222222]">
                <h3 className="text-base font-bold text-white">New Journal Reflection</h3>
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="p-5 space-y-3.5">
                {noteError && (
                  <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                    {noteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    required
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Headline *</label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Disciplined London session"
                    required
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Analysis &amp; Notes</label>
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={3}
                    placeholder="What happened in the market? How did you execute?"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Emotions</label>
                  <input
                    type="text"
                    value={noteEmotions}
                    onChange={(e) => setNoteEmotions(e.target.value)}
                    placeholder="e.g. Calm, patient"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Lessons / Mistakes</label>
                  <input
                    type="text"
                    value={noteLessons}
                    onChange={(e) => setNoteLessons(e.target.value)}
                    placeholder="e.g. Waited for candle close"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg bg-[#333333] text-xs font-semibold text-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={noteBusy}
                    className="px-5 py-2.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {noteBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Note</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
