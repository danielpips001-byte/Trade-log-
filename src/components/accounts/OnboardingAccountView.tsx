import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { AccountCurrency, AccountType } from '../../types/trading';
import { getCurrencySymbol } from '../../utils/calculations';
import { TradeLogLogo } from '../brand/TradeLogLogo';
import { PWAInstallControl } from '../pwa/PWAInstallControl';
import {
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
  const { addAccount, switchWorkspace, workspaceId, isSignedOut } = useTrading();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Live');
  const [currency, setCurrency] = useState<AccountCurrency>('USD');
  const [startingBalance, setStartingBalance] = useState('10000');

  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync Key restore (expanded automatically when user explicitly signed out)
  const [showRestore, setShowRestore] = useState(isSignedOut);
  const [showCreateForm, setShowCreateForm] = useState(!isSignedOut);
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
      setRestoreError('Enter your Sync Key to restore your trading journal.');
      return;
    }

    setIsRestoring(true);
    try {
      await switchWorkspace(syncKeyInput);
      onAccountCreated?.('Journal restored & auto-sync enabled');
    } catch (err: any) {
      setRestoreError(err?.message || 'Could not restore journal with that Sync Key.');
    } finally {
      setIsRestoring(false);
    }
  };

  const renderRestoreCard = (prominent: boolean) => (
    <div className={prominent ? 'liquid-glass-surface rounded-3xl overflow-hidden' : 'liquid-glass-card rounded-2xl overflow-hidden'}>
      {prominent ? (
        <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
          <TradeLogLogo size="md" className="mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Restore Your Journal
            </h2>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              You signed out of TradeLog. Enter your Sync Key to restore your accounts and trade history.
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowRestore(!showRestore);
            setRestoreError(null);
          }}
          className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-neutral-300" />
            <span>New phone or have a Sync Key? Restore your journal</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              showRestore ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}

      <AnimatePresence initial={false}>
        {(prominent || showRestore) && (
          <motion.form
            initial={prominent ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleRestoreSubmit}
            className={prominent ? 'p-6 space-y-3' : 'px-4 pb-4 pt-2 space-y-2.5 border-t border-white/[0.06]'}
          >
            {restoreError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className={prominent ? 'space-y-3' : 'flex gap-2'}>
              <input
                type="text"
                value={syncKeyInput}
                onChange={(e) => setSyncKeyInput(e.target.value.toUpperCase())}
                placeholder="Enter Sync Key (e.g. TL-7K9P4M2X)"
                autoFocus={prominent}
                className={
                  prominent
                    ? 'w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm font-mono uppercase text-white placeholder-neutral-500'
                    : 'flex-1 liquid-glass-input rounded-full px-3.5 py-2 text-xs font-mono uppercase text-white placeholder-neutral-500'
                }
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isRestoring}
                className={
                  prominent
                    ? 'w-full py-3.5 px-5 rounded-full liquid-glass-primary disabled:opacity-60 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer min-h-[48px]'
                    : 'px-4 py-2 rounded-full liquid-glass-pill disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]'
                }
              >
                {isRestoring && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{prominent ? 'Restore Journal' : 'Restore'}</span>
                {prominent && !isRestoring && <ArrowRight className="w-4 h-4" />}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );

  const renderCreateCard = (collapsible: boolean) => (
    <div className={collapsible ? 'liquid-glass-card rounded-2xl overflow-hidden' : 'liquid-glass-surface rounded-3xl overflow-hidden'}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setErrorMsg(null);
          }}
          className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
        >
          <span>Or start a fresh journal (create a new account)</span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              showCreateForm ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : (
        <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
          <TradeLogLogo size="md" className="mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Add Your Trading Account
            </h2>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Set up your first account to start logging trades, calculating exact risk, and tracking performance.
            </p>
          </div>
        </div>
      )}

      {(!collapsible || showCreateForm) && (
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium">
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
              autoFocus={!collapsible}
              className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors"
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
                className={`py-2.5 px-3 rounded-full text-xs font-bold border transition-colors cursor-pointer min-h-[42px] ${
                  currency === 'USD'
                    ? 'liquid-glass-primary'
                    : 'liquid-glass-pill text-neutral-300'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => handleCurrencySelect('NGN')}
                className={`py-2.5 px-3 rounded-full text-xs font-bold border transition-colors cursor-pointer min-h-[42px] ${
                  currency === 'NGN'
                    ? 'liquid-glass-primary'
                    : 'liquid-glass-pill text-neutral-300'
                }`}
              >
                NGN (₦)
              </button>
              <select
                value={currency}
                onChange={(e) => handleCurrencySelect(e.target.value as AccountCurrency)}
                aria-label="Select currency"
                className="liquid-glass-input rounded-full px-3 py-2 text-xs font-semibold text-neutral-200 min-h-[42px] cursor-pointer"
              >
                {ALL_CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-[#18191D] text-white">
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
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-3 text-sm text-white cursor-pointer"
              >
                <option value="Live" className="bg-[#18191D] text-white">Live</option>
                <option value="Demo" className="bg-[#18191D] text-white">Demo</option>
                <option value="Prop Firm" className="bg-[#18191D] text-white">Prop Firm</option>
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
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-3 text-sm font-mono font-bold text-white tabular-nums"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={isCreating}
              className="w-full py-3.5 px-5 rounded-full liquid-glass-primary disabled:opacity-60 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[48px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Start Journaling</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-white/25 selection:text-white">
      {/* Frosted Glass Minimal Header */}
      <header className="sticky top-0 z-30 liquid-glass-bar border-x-0 border-t-0 px-4 h-15 flex items-center justify-center pt-safe">
        <div className="max-w-lg w-full flex items-center justify-between">
          <TradeLogLogo size="md" showWordmark />

          <span className="text-[11px] font-mono text-neutral-300 liquid-glass-subcard px-3 py-1 rounded-full">
            {isSignedOut ? 'Signed Out' : workspaceId}
          </span>
        </div>
      </header>

      {/* Main Centered Onboarding / Restore Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="w-full max-w-md space-y-4"
        >
          {isSignedOut ? (
            <>
              {renderRestoreCard(true)}
              {renderCreateCard(true)}
            </>
          ) : (
            <>
              {renderCreateCard(false)}
              {renderRestoreCard(false)}
            </>
          )}

          {/* Discreet Install TradeLog option (hidden if already running in standalone mode) */}
          <PWAInstallControl variant="onboarding" />
        </motion.div>
      </main>
    </div>
  );
};
