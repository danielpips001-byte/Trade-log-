import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Plus, Check, Edit2, X, Wallet } from 'lucide-react';
import { Account, AccountType } from '../../types/trading';
import { getCurrencySymbol } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';

export const AccountsView: React.FC = () => {
  const { 
    accounts, 
    selectedAccountId, 
    setSelectedAccountId, 
    addAccount, 
    updateAccountBalance 
  } = useTrading();

  // Create Account Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Prop Firm');
  const [startingBalance, setStartingBalance] = useState('100000');
  const [currency, setCurrency] = useState<Account['currency']>('USD');

  // Balance Correction Modal
  const [correctingAccount, setCorrectingAccount] = useState<Account | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');

  const springButton = {
    type: 'spring' as const,
    stiffness: 450,
    damping: 25
  };

  const springModal = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 28
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addAccount({
      name: name.trim(),
      type,
      startingBalance: parseFloat(startingBalance) || 0,
      currency
    });

    setName('');
    setStartingBalance('100000');
    setIsAddOpen(false);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingAccount) return;
    const val = parseFloat(newBalanceInput);
    if (!isNaN(val)) {
      await updateAccountBalance(correctingAccount.id, val);
    }
    setCorrectingAccount(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div>
          <h2 className="text-lg font-bold text-neutral-950 font-mono">Trading Portfolios</h2>
          <p className="text-xs text-neutral-500 font-medium">Manage broker accounts and balance settlement</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={springButton}
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Account</span>
        </motion.button>
      </div>

      {/* Account Cards */}
      <div className="space-y-3.5">
        {accounts.map(acc => {
          const isSelected = selectedAccountId === acc.id;
          const currencySymbol = getCurrencySymbol(acc.currency);
          const netChange = acc.currentBalance - acc.startingBalance;

          return (
            <motion.div
              key={acc.id}
              whileHover={{ y: -1.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`p-5 rounded-3xl border transition-shadow ${
                isSelected
                  ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-neutral-950 ring-2 ring-neutral-950'
                  : 'bg-white/85 backdrop-blur-xl border-black/[0.06] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      acc.type === 'Prop Firm'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                        : acc.type === 'Live'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                    }`}>
                      {acc.type}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Started {acc.createdAt}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-950">{acc.name}</h3>
                </div>

                {isSelected ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Active
                  </span>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    transition={springButton}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    Select
                  </motion.button>
                )}
              </div>

              {/* Balance Box */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-neutral-200/80 flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block font-mono">CURRENT BALANCE</span>
                  <span className="text-2xl font-bold font-mono text-neutral-950 tabular-nums">
                    {currencySymbol}{acc.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-neutral-500 block">
                    Starting: {currencySymbol}{acc.startingBalance.toLocaleString()}
                  </span>
                  <span className={`text-xs font-mono font-bold tabular-nums block mt-0.5 ${
                    netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {netChange >= 0 ? '+' : ''}{currencySymbol}{netChange.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={springButton}
                  onClick={() => {
                    setCorrectingAccount(acc);
                    setNewBalanceInput(acc.currentBalance.toString());
                  }}
                  className="text-xs text-neutral-600 hover:text-neutral-950 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Correct Balance
                </motion.button>
              </div>

            </motion.div>
          );
        })}
      </div>

      {/* CREATE ACCOUNT MODAL WITH SPRING TRANSITIONS */}
      <AnimatePresence>
        {isAddOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsAddOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={springModal}
              className="bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-3xl w-full max-w-md shadow-2xl p-6 my-auto space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-950 font-mono">Create Trading Account</h3>
                <motion.button 
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setIsAddOpen(false)} 
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-950 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">ACCOUNT NAME *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. FTMO $100K Phase 1"
                    required
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">ACCOUNT TYPE</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as AccountType)}
                      className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2.5 text-xs text-neutral-950 font-medium focus:outline-none focus:border-black"
                    >
                      <option value="Prop Firm">Prop Firm</option>
                      <option value="Live">Live Real Money</option>
                      <option value="Demo">Demo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">CURRENCY</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Account['currency'])}
                      className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2.5 text-xs text-neutral-950 font-medium focus:outline-none focus:border-black"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">STARTING BALANCE *</label>
                  <input
                    type="number"
                    step="any"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    placeholder="100000"
                    required
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-950 tabular-nums focus:outline-none focus:border-black"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={springButton}
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    transition={springButton}
                    className="px-5 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs cursor-pointer shadow-sm"
                  >
                    Create Account
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BALANCE CORRECTION MODAL WITH SPRING TRANSITIONS */}
      <AnimatePresence>
        {correctingAccount && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setCorrectingAccount(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={springModal}
              className="bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-3xl w-full max-w-sm shadow-2xl p-6 my-auto space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-950 font-mono">Manual Balance Correction</h3>
                <motion.button 
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setCorrectingAccount(null)} 
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-950 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <form onSubmit={handleSaveCorrection} className="space-y-3.5">
                <p className="text-xs text-neutral-600 font-medium">
                  Correct the balance for <strong className="text-neutral-950">{correctingAccount.name}</strong> to match your broker statement.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    EXACT NEW BALANCE ({getCurrencySymbol(correctingAccount.currency)})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newBalanceInput}
                    onChange={(e) => setNewBalanceInput(e.target.value)}
                    required
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-950 tabular-nums focus:outline-none focus:border-black"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={springButton}
                    onClick={() => setCorrectingAccount(null)}
                    className="px-4 py-2 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    transition={springButton}
                    className="px-5 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs cursor-pointer shadow-sm"
                  >
                    Save Balance
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
