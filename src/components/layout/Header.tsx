import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { ChevronDown, Check, TrendingUp } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';

export const Header: React.FC = () => {
  const { accounts, selectedAccountId, setSelectedAccountId, activeAccount, setActiveTab, firestoreStatus } = useTrading();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayCurrency = getCurrencySymbol(activeAccount?.currency);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.05] px-4 py-3 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <button 
          onClick={() => setActiveTab('calendar')}
          className="text-left font-bold text-lg tracking-tight text-neutral-900 flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-neutral-950 flex items-center justify-center text-white shadow-sm">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-neutral-950">Trade<span className="text-neutral-500 font-semibold">Log</span></span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`Cloud: ${firestoreStatus}`} />
        </button>

        {/* Minimal Liquid Glass Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/90 border border-neutral-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-xs hover:border-neutral-400 transition-all cursor-pointer"
          >
            <div className="text-right">
              <span className="font-semibold text-neutral-900 block max-w-[120px] truncate text-xs">
                {selectedAccountId === 'all' ? 'All Accounts' : activeAccount?.name}
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold tabular-nums">
                {displayCurrency}{(activeAccount?.currentBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-60 rounded-3xl bg-white/95 backdrop-blur-2xl border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-50 p-2 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Switch Trading Account
                </div>
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all cursor-pointer ${
                      selectedAccountId === acc.id 
                        ? 'bg-neutral-900 text-white font-medium shadow-sm' 
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold truncate max-w-[140px]">{acc.name}</p>
                      <p className={`text-[10px] font-mono ${selectedAccountId === acc.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {acc.type} · ${acc.currentBalance.toLocaleString()}
                      </p>
                    </div>
                    {selectedAccountId === acc.id && <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
