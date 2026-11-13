import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Account, AccountType, AccountCurrency } from '../../types/trading';
import {
  aggregateMultiCurrencyAccounts,
  formatMoney,
  getCurrencySymbol
} from '../../utils/calculations';
import {
  X,
  Check,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Wallet,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ALL_CURRENCIES: AccountCurrency[] = ['USD', 'NGN', 'EUR', 'GBP', 'AUD', 'JPY'];

export const AccountsModal: React.FC = () => {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    addAccount,
    updateAccount,
    deleteAccount,
    exchangeRates,
    saveExchangeRate,
    isAccountModalOpen,
    setIsAccountModalOpen
  } = useTrading();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Live');
  const [currency, setCurrency] = useState<AccountCurrency>('USD');
  const [startingBalance, setStartingBalance] = useState('10000');

  // Edit account state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AccountType>('Live');
  const [editCurrency, setEditCurrency] = useState<AccountCurrency>('USD');
  const [editBalance, setEditBalance] = useState('');

  // Reporting currency for All Accounts total card
  const [reportingCurrency, setReportingCurrency] = useState<'USD' | 'NGN'>('USD');
  const [quickRateInput, setQuickRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const portfolioSummary = useMemo(
    () => aggregateMultiCurrencyAccounts(accounts, exchangeRates, reportingCurrency),
    [accounts, exchangeRates, reportingCurrency]
  );

  const handleClose = () => {
    setErrorMsg(null);
    setEditingId(null);
    setMode('list');
    setIsAccountModalOpen(false);
  };

  const handleCreateCurrencySelect = (nextCurr: AccountCurrency) => {
    setCurrency(nextCurr);
    if (startingBalance === '10000' && nextCurr === 'NGN') {
      setStartingBalance('1000000');
    } else if (startingBalance === '1000000' && nextCurr === 'USD') {
      setStartingBalance('10000');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }
    const parsedBal = parseFloat(startingBalance);
    if (isNaN(parsedBal) || parsedBal < 0) {
      setErrorMsg('Please enter a valid starting balance.');
      return;
    }

    setIsSaving(true);
    try {
      await addAccount({
        name: name.trim(),
        type,
        currency,
        startingBalance: parsedBal
      });
      setName('');
      setStartingBalance(currency === 'NGN' ? '1000000' : '10000');
      setMode('list');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create account.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingAccount = (acc: Account) => {
    setErrorMsg(null);
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type);
    setEditCurrency(acc.currency);
    setEditBalance(acc.currentBalance.toString());
  };

  const handleSaveEdit = async (acc: Account) => {
    setErrorMsg(null);
    if (!editName.trim()) {
      setErrorMsg('Account name cannot be empty.');
      return;
    }
    const val = parseFloat(editBalance);
    if (isNaN(val) || val < 0) {
      setErrorMsg('Please enter a valid current balance.');
      return;
    }
    setIsSaving(true);
    try {
      await updateAccount(acc.id, {
        name: editName.trim(),
        type: editType,
        currency: editCurrency,
        currentBalance: val
      });
      setEditingId(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (accId: string) => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      await deleteAccount(accId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuickRate = async (pairKey: string) => {
    const val = parseFloat(quickRateInput);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Enter a valid positive exchange rate.');
      return;
    }
    setSavingRate(true);
    setErrorMsg(null);
    try {
      await saveExchangeRate(pairKey, val);
      setQuickRateInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save exchange rate.');
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <AnimatePresence>
      {isAccountModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-[#262626] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#222222]">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-[#2196F3]" />
                <h2 className="text-base font-bold text-white">
                  {mode === 'list' ? 'Trading Accounts' : 'Create Account'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {mode === 'list' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('create');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Account</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('list');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#333333] hover:bg-[#3F3F3F] text-neutral-200 text-xs font-semibold cursor-pointer min-h-[36px]"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close modal"
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {mode === 'create' ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Exness NGN, FTMO USD, Live Portfolio"
                      required
                      autoFocus
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#2196F3]"
                    />
                  </div>

                  {/* Quick USD / NGN Selection + Other Currencies */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Account Currency
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateCurrencySelect('USD')}
                        className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          currency === 'USD'
                            ? 'bg-[#2196F3] text-white border-[#2196F3]'
                            : 'bg-[#1C1C1C] text-neutral-300 border-white/10 hover:border-white/25'
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateCurrencySelect('NGN')}
                        className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          currency === 'NGN'
                            ? 'bg-[#2196F3] text-white border-[#2196F3]'
                            : 'bg-[#1C1C1C] text-neutral-300 border-white/10 hover:border-white/25'
                        }`}
                      >
                        NGN (₦)
                      </button>
                      <select
                        value={currency}
                        onChange={(e) => handleCreateCurrencySelect(e.target.value as AccountCurrency)}
                        aria-label="Select currency"
                        className="bg-[#1C1C1C] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-semibold text-neutral-200 focus:outline-none focus:border-[#2196F3]"
                      >
                        {ALL_CURRENCIES.map(c => (
                          <option key={c} value={c}>
                            {c} ({getCurrencySymbol(c)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Account Type
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as AccountType)}
                        className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2196F3]"
                      >
                        <option value="Live">Live</option>
                        <option value="Demo">Demo</option>
                        <option value="Prop Firm">Prop Firm</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Starting Balance ({getCurrencySymbol(currency)})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={startingBalance}
                        onChange={(e) => setStartingBalance(e.target.value)}
                        required
                        className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#2196F3]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMode('list')}
                      className="px-4 py-2.5 rounded-lg bg-[#333333] hover:bg-[#404040] text-neutral-200 text-xs font-semibold cursor-pointer min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Create Account</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {/* All Accounts Option & Separate Currency Subtotals */}
                  {accounts.length > 1 && (
                    <div
                      className={`rounded-xl p-4 border transition-colors space-y-3 ${
                        selectedAccountId === 'all'
                          ? 'bg-[#2E2E2E] border-[#2196F3]'
                          : 'bg-[#1F1F1F] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          onClick={() => {
                            setSelectedAccountId('all');
                            handleClose();
                          }}
                          className="flex items-center gap-2.5 flex-1 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#2196F3]/15 flex items-center justify-center text-[#2196F3] shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">All Accounts Dashboard</h3>
                            <span className="text-[11px] text-neutral-400">
                              {accounts.length} accounts · Currencies tracked separately
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId('all');
                            handleClose();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                            selectedAccountId === 'all'
                              ? 'bg-[#2196F3]/20 text-[#2196F3]'
                              : 'bg-[#333333] hover:bg-[#404040] text-neutral-200'
                          }`}
                        >
                          {selectedAccountId === 'all' && <Check className="w-3.5 h-3.5" />}
                          <span>{selectedAccountId === 'all' ? 'Active' : 'View All'}</span>
                        </button>
                      </div>

                      {/* Separate Currency Totals (Never mixed!) */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                        {portfolioSummary.subtotalsByCurrency.map(sub => (
                          <div key={sub.currency} className="bg-[#181818] rounded-lg p-2.5 border border-white/[0.04]">
                            <span className="text-[10px] font-semibold text-neutral-400 block">
                              {sub.currency} ({sub.accountCount} {sub.accountCount === 1 ? 'acct' : 'accts'})
                            </span>
                            <span className="text-sm font-bold font-mono text-white tabular-nums block mt-0.5">
                              {formatMoney(sub.currentBalance, sub.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Converted Overall Total (only when mixed currencies & explicit rate provided) */}
                      {!portfolioSummary.isSingleCurrency && (
                        <div className="bg-[#181818] rounded-lg p-2.5 border border-white/[0.05] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-neutral-400 font-semibold">
                              Converted Total
                            </span>
                            <div className="flex bg-[#262626] rounded p-0.5 border border-white/10 text-[10px]">
                              {(['USD', 'NGN'] as const).map(rc => (
                                <button
                                  key={rc}
                                  type="button"
                                  onClick={() => setReportingCurrency(rc)}
                                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                    reportingCurrency === rc ? 'bg-[#2196F3] text-white' : 'text-neutral-400'
                                  }`}
                                >
                                  {rc} ({getCurrencySymbol(rc)})
                                </button>
                              ))}
                            </div>
                          </div>

                          {portfolioSummary.convertedTotal.ok ? (
                            <div>
                              <span className="text-sm font-bold font-mono text-white tabular-nums block">
                                {formatMoney(
                                  portfolioSummary.convertedTotal.totalCurrentBalance,
                                  portfolioSummary.convertedTotal.reportingCurrency
                                )}
                              </span>
                              {portfolioSummary.convertedTotal.ratesUsed.length > 0 && (
                                <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                                  Rate: {portfolioSummary.convertedTotal.ratesUsed.join(' · ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="text-[11px] text-amber-300 block">
                                Enter {portfolioSummary.convertedTotal.missingConversions[0].from} →{' '}
                                {portfolioSummary.convertedTotal.missingConversions[0].to} rate to compute combined total:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono text-neutral-200 shrink-0">
                                  1 {portfolioSummary.convertedTotal.missingConversions[0].suggestedKey.split('_')[0]} =
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={quickRateInput}
                                  onChange={(e) => setQuickRateInput(e.target.value)}
                                  placeholder="Rate"
                                  className="flex-1 bg-[#262626] border border-white/15 rounded px-2 py-1 text-xs font-mono text-white"
                                />
                                <span className="text-[11px] font-mono text-neutral-200 shrink-0">
                                  {portfolioSummary.convertedTotal.missingConversions[0].suggestedKey.split('_')[1]}
                                </span>
                                <button
                                  type="button"
                                  disabled={savingRate}
                                  onClick={() =>
                                    !portfolioSummary.convertedTotal.ok &&
                                    handleSaveQuickRate(portfolioSummary.convertedTotal.missingConversions[0].suggestedKey)
                                  }
                                  className="px-2.5 py-1 rounded bg-[#2196F3] text-white text-[11px] font-bold cursor-pointer"
                                >
                                  {savingRate ? '...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Account Cards */}
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    const netChange = acc.currentBalance - acc.startingBalance;
                    const pctChange = acc.startingBalance > 0
                      ? (netChange / acc.startingBalance) * 100
                      : 0;
                    const isEditingThis = editingId === acc.id;

                    return (
                      <div
                        key={acc.id}
                        className={`rounded-xl p-4 border transition-colors ${
                          isSelected
                            ? 'bg-[#2E2E2E] border-[#2196F3]'
                            : 'bg-[#1F1F1F] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            onClick={() => {
                              setSelectedAccountId(acc.id);
                              handleClose();
                            }}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-0.5">
                              <span>{acc.type}</span>
                              <span>·</span>
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono font-bold text-[10px]">
                                {acc.currency} ({getCurrencySymbol(acc.currency)})
                              </span>
                              <span>·</span>
                              <span>Since {acc.createdAt}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(acc.id);
                              handleClose();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                              isSelected
                                ? 'bg-[#2196F3]/20 text-[#2196F3]'
                                : 'bg-[#333333] hover:bg-[#404040] text-neutral-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{isSelected ? 'Active' : 'Select'}</span>
                          </button>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-neutral-400 block">Balance</span>
                            <span className="text-lg font-bold font-mono text-white tabular-nums">
                              {formatMoney(acc.currentBalance, acc.currency)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-neutral-400 block">Net Return</span>
                            <span
                              className={`text-xs font-bold font-mono tabular-nums ${
                                netChange >= 0 ? 'text-[#2ECC71]' : 'text-[#EF4444]'
                              }`}
                            >
                              {formatMoney(netChange, acc.currency, true)} ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%)
                            </span>
                          </div>
                        </div>

                        {isEditingThis ? (
                          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-neutral-400 mb-1">Name</label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-[#141414] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2196F3]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-neutral-400 mb-1">Type</label>
                                <select
                                  value={editType}
                                  onChange={(e) => setEditType(e.target.value as AccountType)}
                                  className="w-full bg-[#141414] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2196F3]"
                                >
                                  <option value="Live">Live</option>
                                  <option value="Demo">Demo</option>
                                  <option value="Prop Firm">Prop Firm</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-neutral-400 mb-1">Currency</label>
                                <select
                                  value={editCurrency}
                                  onChange={(e) => setEditCurrency(e.target.value as AccountCurrency)}
                                  className="w-full bg-[#141414] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#2196F3]"
                                >
                                  {ALL_CURRENCIES.map(c => (
                                    <option key={c} value={c}>
                                      {c} ({getCurrencySymbol(c)})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-neutral-400 mb-1">
                                  Balance ({getCurrencySymbol(editCurrency)})
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editBalance}
                                  onChange={(e) => setEditBalance(e.target.value)}
                                  className="w-full bg-[#141414] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:border-[#2196F3]"
                                />
                              </div>
                            </div>

                            {editCurrency !== acc.currency && (
                              <p className="text-[10px] text-amber-300">
                                Changing currency updates the label to {editCurrency} ({getCurrencySymbol(editCurrency)}) without converting your numeric balance.
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 rounded-lg bg-[#333333] text-neutral-300 text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveEdit(acc)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#2196F3] text-white text-xs font-semibold cursor-pointer"
                              >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2.5 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => startEditingAccount(acc)}
                              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer py-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Account</span>
                            </button>
                            {accounts.length > 1 && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleDelete(acc.id)}
                                className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 cursor-pointer py-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
