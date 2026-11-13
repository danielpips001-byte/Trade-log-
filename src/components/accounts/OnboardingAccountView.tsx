import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { AccountCurrency, AccountType } from '../../types/trading';
import { getCurrencySymbol } from '../../utils/calculations';
import {
  Wallet,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ALL_CURRENCIES: AccountCurrency[] = ['USD', 'NGN', 'EUR', 'GBP', 'AUD', 'JPY'];

interface OnboardingAccountViewProps {
  onAccountCreated?: (message: string) => void;
}

export const OnboardingAccountView: React.FC<OnboardingAccountViewProps> = ({
  onAccountCreated
}) => {
  const { addAccount, switchWorkspace, workspaceId } = useTrading();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Live');
  const [currency, setCurrency] = useState<AccountCurrency>('USD');
  const [startingBalance, setStartingBalance] = useState('10000');

  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optional Sync Key restore
  const [showRestore, setShowRestore] = useState(false);
  const [syncKeyInput, setSyncKeyInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleCurrencySelect = (nextCurr: AccountCurrency) => {
    setCurrency(nextCurr);
    if (startingBalance === '10000' && nextCurr === 'NGN') {
      setStartingBalance('1000000');
    } else if (startingBalance === '1000000' && nextCurr === 'USD') {
      setStartingBalance('10000');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a name for your trading account.');
      return;
    }
    const parsedBal = parseFloat(startingBalance);
    if (isNaN(parsedBal) || parsedBal < 0) {
      setErrorMsg('Please enter a valid starting balance.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await addAccount({
        name: name.trim(),
        type,
        currency,
        startingBalance: parsedBal
      });
      onAccountCreated?.(`${created.name} (${created.currency}) ready — start journaling`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);
    if (!syncKeyInput.trim()) {
      setRestoreError('Enter your Sync Key to restore an existing journal.');
      return;
    }

    setIsRestoring(true);
    try {
      await switchWorkspace(syncKeyInput);
      onAccountCreated?.('Journal restored from Sync Key');
    } catch (err: any) {
      setRestoreError(err?.message || 'Could not restore journal with that Sync Key.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#3D3D3D] text-white flex flex-col font-sans selection:bg-[#2196F3] selection:text-white">
      {/* Clean Minimal Top Bar */}
      <header className="sticky top-0 z-30 bg-[#222222] border-b border-white/[0.07] px-4 h-14 flex items-center justify-center pt-safe">
        <div className="max-w-lg w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2196F3]/15 border border-[#2196F3]/30 flex items-center justify-center text-[#2196F3]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">TradeLog</h1>
              <span className="text-[11px] text-neutral-400 leading-tight block">
                Personal Trading Journal
              </span>
            </div>
          </div>

          <span className="text-[11px] font-mono text-neutral-400 bg-[#1C1C1C] px-2.5 py-1 rounded-md border border-white/[0.06]">
            {workspaceId}
          </span>
        </div>
      </header>

      {/* Main Centered Onboarding Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="w-full max-w-md space-y-4"
        >
          <div className="bg-[#262626] border border-white/[0.07] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="px-5 py-5 border-b border-white/[0.06] bg-[#222222]">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Add Your Trading Account
              </h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Set up your first account to start logging trades, calculating exact risk, and tracking performance.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Account Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Personal Live, Exness NGN, Demo Account"
                  required
                  autoFocus
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#2196F3] transition-colors"
                />
              </div>

              {/* Account Currency */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Account Currency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCurrencySelect('USD')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[42px] ${
                      currency === 'USD'
                        ? 'bg-[#2196F3] text-white border-[#2196F3]'
                        : 'bg-[#1C1C1C] text-neutral-300 border-white/10 hover:border-white/25'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencySelect('NGN')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[42px] ${
                      currency === 'NGN'
                        ? 'bg-[#2196F3] text-white border-[#2196F3]'
                        : 'bg-[#1C1C1C] text-neutral-300 border-white/10 hover:border-white/25'
                    }`}
                  >
                    NGN (₦)
                  </button>
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencySelect(e.target.value as AccountCurrency)}
                    aria-label="Select currency"
                    className="bg-[#1C1C1C] border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-200 focus:outline-none focus:border-[#2196F3] min-h-[42px]"
                  >
                    {ALL_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c} ({getCurrencySymbol(c)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Type & Starting Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#2196F3]"
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
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-3 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#2196F3]"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={isCreating}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(33,150,243,0.35)] transition-colors cursor-pointer min-h-[48px]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account & Start Journaling</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>

          {/* Optional Sync Key Restore */}
          <div className="bg-[#262626]/80 border border-white/[0.06] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowRestore(!showRestore);
                setRestoreError(null);
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-[#2196F3]" />
                <span>Already have a Sync Key? Restore your journal</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                  showRestore ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {showRestore && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleRestoreSubmit}
                  className="px-4 pb-4 pt-1 space-y-2.5 border-t border-white/[0.05]"
                >
                  {restoreError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={syncKeyInput}
                      onChange={(e) => setSyncKeyInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TL-7K9P4M2X"
                      className="flex-1 bg-[#1C1C1C] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono uppercase text-white placeholder-neutral-500 focus:outline-none focus:border-[#2196F3]"
                    />
                    <button
                      type="submit"
                      disabled={isRestoring}
                      className="px-4 py-2 rounded-lg bg-[#333333] hover:bg-[#404040] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                    >
                      {isRestoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Restore</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
