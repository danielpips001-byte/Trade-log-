import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types/trading';
import { formatMoney } from '../../utils/calculations';
import { CloseTradeModal } from '../trades/CloseTradeModal';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  ListFilter, 
  Plus, 
  X, 
  CheckCircle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeekGroup {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  trades: Trade[];
  hasOpen: boolean;
  closedPnl: number;
  pctReturn: number;
}

function getMondayAndSunday(dateStr: string): { key: string; label: string; startDate: string; endDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(dt);
  mon.setDate(dt.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const fmt = (dateObj: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
  };

  const toISO = (dateObj: Date) => {
    const yy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const startISO = toISO(mon);
  const endISO = toISO(sun);
  return {
    key: startISO,
    label: `${fmt(mon)} - ${fmt(sun)}, ${sun.getFullYear()}`,
    startDate: startISO,
    endDate: endISO
  };
}

export const MyJournalView: React.FC = () => {
  const {
    filteredTrades,
    selectedAccountId,
    activeAccount,
    accounts,
    setSelectedTradeId,
    setIsAddTradeModalOpen,
    journalViewMode,
    setJournalViewMode,
    selectedCalendarDate,
    setSelectedCalendarDate,
    setActiveTab
  } = useTrading();

  // UI states
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'wins' | 'losses' | 'breakeven'>('all');
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);

  // Calendar state
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedCalendarDate ? new Date(selectedCalendarDate + 'T00:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const startingBalance = activeAccount?.startingBalance || accounts[0]?.startingBalance || 100000;
  const isAllAccounts = selectedAccountId === 'all';

  // Apply search & filter
  const visibleTrades = useMemo(() => {
    return filteredTrades.filter((t) => {
      if (statusFilter === 'open' && t.status !== 'Open') return false;
      if (statusFilter === 'wins' && !(t.status === 'Closed' && t.realizedPnl > 0)) return false;
      if (statusFilter === 'losses' && !(t.status === 'Closed' && t.realizedPnl < 0)) return false;
      if (statusFilter === 'breakeven' && !(t.status === 'Closed' && t.realizedPnl === 0)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSymbol = t.asset.toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        const matchDir = t.direction.toLowerCase().includes(q);
        if (!matchSymbol && !matchNotes && !matchDir) return false;
      }
      return true;
    });
  }, [filteredTrades, statusFilter, searchQuery]);

  const getTradeAccount = (trade: Trade) => {
    return accounts.find(a => a.id === trade.accountId);
  };

  const getTradeCurrency = (trade: Trade) => {
    return getTradeAccount(trade)?.currency || activeAccount?.currency || 'USD';
  };

  const getTradeBaseBalance = (trade: Trade) => {
    return getTradeAccount(trade)?.startingBalance || startingBalance || 100000;
  };

  // Group into Weekly Accordions
  const weekGroups = useMemo<WeekGroup[]>(() => {
    const map = new Map<string, WeekGroup>();
    visibleTrades.forEach((t) => {
      const info = getMondayAndSunday(t.date);
      let group = map.get(info.key);
      if (!group) {
        group = {
          key: info.key,
          label: info.label,
          startDate: info.startDate,
          endDate: info.endDate,
          trades: [],
          hasOpen: false,
          closedPnl: 0,
          pctReturn: 0
        };
        map.set(info.key, group);
      }
      group.trades.push(t);
      if (t.status === 'Open') {
        group.hasOpen = true;
      } else {
        const base = getTradeBaseBalance(t);
        const tradePct = base > 0 ? ((t.realizedPnl || 0) / base) * 100 : 0;
        group.closedPnl += t.realizedPnl || 0;
        group.pctReturn += tradePct;
      }
    });

    const list = Array.from(map.values());
    return list.sort((a, b) => b.key.localeCompare(a.key));
  }, [visibleTrades, accounts, activeAccount, startingBalance]);

  const toggleWeek = (key: string) => {
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Calendar Calculations
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const monthName = viewMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

  const dayStatsMap = useMemo(() => {
    const map = new Map<string, { netPct: number; count: number; hasOpen: boolean }>();
    filteredTrades.forEach((t) => {
      const cur = map.get(t.date) || { netPct: 0, count: 0, hasOpen: false };
      if (t.status === 'Open') {
        cur.hasOpen = true;
      } else {
        const base = getTradeBaseBalance(t);
        const tradePct = base > 0 ? ((t.realizedPnl || 0) / base) * 100 : 0;
        cur.netPct += tradePct;
      }
      cur.count += 1;
      map.set(t.date, cur);
    });
    return map;
  }, [filteredTrades, accounts, activeAccount, startingBalance]);

  const selectedDayTrades = useMemo(() => {
    return filteredTrades.filter((t) => t.date === selectedCalendarDate);
  }, [filteredTrades, selectedCalendarDate]);

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 pb-28 space-y-3 relative min-h-[calc(100vh-120px)]">
      {/* Search Bar (when toggled by Search FAB) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 bg-[#262626] border border-white/[0.08] rounded-xl px-3.5 py-2 shadow-md"
          >
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, BUY/SELL, or notes..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Banner */}
      {statusFilter !== 'all' && (
        <div className="flex items-center justify-between bg-[#262626] border border-[#2196F3]/40 rounded-xl px-3.5 py-2 text-xs">
          <span className="text-neutral-200 font-medium">
            Filter: <strong className="text-[#2196F3] uppercase">{statusFilter}</strong> ({visibleTrades.length})
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="text-neutral-400 hover:text-white font-semibold cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* VIEW MODE A: WEEKLY ACCORDIONS (Matches IMG_3531) */}
      {journalViewMode === 'weekly' && (
        <div className="space-y-3">
          {weekGroups.length > 0 ? (
            weekGroups.map((week, idx) => {
              // Expand newest week by default if no manual toggle recorded yet, or if filter/search active
              const isExpanded =
                searchQuery.trim().length > 0 || statusFilter !== 'all'
                  ? true
                  : expandedWeeks[week.key] !== undefined
                  ? expandedWeeks[week.key]
                  : idx === 0;

              const hasClosed = week.trades.some(t => t.status === 'Closed');
              const pctFormatted = `${Math.abs(week.pctReturn).toFixed(2)}%`;

              return (
                <div
                  key={week.key}
                  className="bg-[#262626] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04] overflow-hidden"
                >
                  {/* Week Header Row (exact layout from IMG_3531) */}
                  <button
                    type="button"
                    onClick={() => toggleWeek(week.key)}
                    className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer min-h-[56px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[15px] font-bold text-white tracking-tight truncate">
                        {week.label}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          week.hasOpen ? 'bg-[#2196F3]' : 'bg-[#F59E0B]'
                        }`}
                        title={week.hasOpen ? 'Contains open trades' : 'All trades settled'}
                      />
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      {hasClosed && (
                        <span
                          className={`text-[14px] font-bold font-mono tabular-nums ${
                            week.pctReturn > 0
                              ? 'text-[#2ECC71]'
                              : week.pctReturn < 0
                              ? 'text-[#EF4444]'
                              : 'text-neutral-300'
                          }`}
                        >
                          {week.pctReturn < 0 ? '-' : ''}{pctFormatted}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-5 h-5 text-white/80 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Week Trades List */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/[0.06] bg-[#1F1F1F] divide-y divide-white/[0.05]"
                      >
                        {week.trades.map((trade) => {
                          const isOpen = trade.status === 'Open';
                          const curr = getTradeCurrency(trade);
                          const baseBal = getTradeBaseBalance(trade);
                          const pct = baseBal > 0 ? (trade.realizedPnl / baseBal) * 100 : 0;

                          return (
                            <div
                              key={trade.id}
                              onClick={() => setSelectedTradeId(trade.id)}
                              className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white">{trade.asset}</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      trade.direction === 'BUY'
                                        ? 'bg-[#2ECC71]/15 text-[#2ECC71]'
                                        : 'bg-[#EF4444]/15 text-[#EF4444]'
                                    }`}
                                  >
                                    {trade.direction}
                                  </span>
                                  {isOpen && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2196F3]/20 text-[#2196F3]">
                                      OPEN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span>{trade.date}</span>
                                  <span>·</span>
                                  <span>{trade.lotSize} lots</span>
                                  <span>·</span>
                                  <span>@{trade.entryPrice}</span>
                                  {isAllAccounts && getTradeAccount(trade) && (
                                    <>
                                      <span>·</span>
                                      <span className="text-neutral-300 font-sans">
                                        {getTradeAccount(trade)!.name} ({curr})
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {isOpen ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTradeToClose(trade);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[34px]"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Close</span>
                                  </button>
                                ) : (
                                  <div className="text-right">
                                    <span
                                      className={`text-sm font-bold font-mono tabular-nums block ${
                                        trade.realizedPnl > 0
                                          ? 'text-[#2ECC71]'
                                          : trade.realizedPnl < 0
                                          ? 'text-[#EF4444]'
                                          : 'text-neutral-300'
                                      }`}
                                    >
                                      {formatMoney(trade.realizedPnl, curr, true)}
                                    </span>
                                    <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="bg-[#262626] rounded-xl p-8 text-center border border-white/[0.06] space-y-3">
              {filteredTrades.length === 0 ? (
                <>
                  <p className="text-base font-bold text-white">
                    Ready to start journaling
                  </p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Record your first position to track live risk, reward, and account performance.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-neutral-300">
                  No trades match this search or filter.
                </p>
              )}
              <button
                type="button"
                onClick={() => setIsAddTradeModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold cursor-pointer min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Trade</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE B: MONTHLY CALENDAR VIEW (Toggled by top-left Calendar icon) */}
      {journalViewMode === 'calendar' && (
        <div className="space-y-3">
          {/* Calendar Header */}
          <div className="bg-[#262626] rounded-xl p-4 border border-white/[0.06] shadow-md">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                className="p-2 rounded-lg bg-[#1C1C1C] hover:bg-[#333333] text-white cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#2196F3]" />
                <span>{monthName}</span>
              </h2>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                className="p-2 rounded-lg bg-[#1C1C1C] hover:bg-[#333333] text-white cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-neutral-400 mb-1.5">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 rounded-lg bg-[#1E1E1E]/40" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const stat = dayStatsMap.get(dateStr);
                const isSelected = selectedCalendarDate === dateStr;
                const pct = stat ? stat.netPct : 0;

                let cellBg = 'bg-[#1D1D1D] border-white/[0.04] text-neutral-300';
                if (stat) {
                  if (pct > 0.0001) {
                    cellBg = 'bg-[#2ECC71]/15 border-[#2ECC71]/40 text-white';
                  } else if (pct < -0.0001) {
                    cellBg = 'bg-[#EF4444]/15 border-[#EF4444]/40 text-white';
                  } else {
                    cellBg = 'bg-[#2A2A2A] border-white/10 text-white';
                  }
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedCalendarDate(dateStr)}
                    className={`h-14 rounded-lg border p-1 flex flex-col items-center justify-between transition-all cursor-pointer relative ${cellBg} ${
                      isSelected ? 'ring-2 ring-[#2196F3]' : ''
                    }`}
                  >
                    <span className="text-[11px] font-bold self-start leading-none">{dayNum}</span>
                    {stat?.hasOpen && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2196F3] absolute top-1.5 right-1.5" />
                    )}
                    {stat && Math.abs(pct) > 0.0001 && (
                      <span
                        className={`text-[10px] font-mono font-bold tabular-nums leading-none ${
                          pct > 0 ? 'text-[#2ECC71]' : 'text-[#EF4444]'
                        }`}
                      >
                        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Trades */}
          <div className="bg-[#262626] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white font-mono">{selectedCalendarDate}</h3>
                <span className="text-[11px] text-neutral-400">
                  {selectedDayTrades.length} {selectedDayTrades.length === 1 ? 'trade' : 'trades'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTradeModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Trade</span>
              </button>
            </div>

            {selectedDayTrades.length > 0 ? (
              <div className="divide-y divide-white/[0.05]">
                {selectedDayTrades.map((trade) => {
                  const isOpen = trade.status === 'Open';
                  const curr = getTradeCurrency(trade);
                  return (
                    <div
                      key={trade.id}
                      onClick={() => setSelectedTradeId(trade.id)}
                      className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.04] cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{trade.asset}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            trade.direction === 'BUY' ? 'bg-[#2ECC71]/15 text-[#2ECC71]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}>
                            {trade.direction}
                          </span>
                          {isOpen && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2196F3]/20 text-[#2196F3]">
                              OPEN
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {trade.lotSize} lots · @{trade.entryPrice}
                        </span>
                      </div>

                      {isOpen ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTradeToClose(trade);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#2196F3] text-white text-xs font-bold cursor-pointer"
                        >
                          Close
                        </button>
                      ) : (
                        <span className={`text-sm font-bold font-mono tabular-nums ${
                          trade.realizedPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#EF4444]'
                        }`}>
                          {formatMoney(trade.realizedPnl, curr, true)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-neutral-400">
                No trades recorded on {selectedCalendarDate}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Popover */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            className="fixed bottom-48 right-18 z-40 bg-[#222222] border border-white/10 rounded-xl shadow-2xl p-2 w-44 space-y-1"
          >
            {(['all', 'open', 'wins', 'losses', 'breakeven'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setStatusFilter(f);
                  setIsFilterOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                  statusFilter === f
                    ? 'bg-[#2196F3] text-white'
                    : 'text-neutral-200 hover:bg-white/[0.06]'
                }`}
              >
                {f === 'all' ? 'All Trades' : f}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus FAB Popup Card (Exact reference style from IMG_3531!) */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsPlusMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="fixed bottom-24 right-20 z-40 bg-[#222222] border border-white/[0.08] rounded-lg shadow-[0_12px_32px_rgba(0,0,0,0.65)] py-2 w-60"
            >
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsAddTradeModalOpen(true);
                }}
                className="w-full text-left px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Manual Trade Entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setJournalViewMode(journalViewMode === 'weekly' ? 'calendar' : 'weekly');
                }}
                className="w-full text-left px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                {journalViewMode === 'weekly' ? 'Monthly Calendar View' : 'Weekly Accordions View'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setActiveTab('tools');
                }}
                className="w-full text-left px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Rules & Journal Tools
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Stack (Exact bottom-right layout from IMG_3531) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-center gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            setIsFilterOpen(false);
            setIsPlusMenuOpen(false);
          }}
          aria-label="Search trades"
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors cursor-pointer ${
            isSearchOpen ? 'bg-[#2196F3] text-white' : 'bg-[#6E6E6E] hover:bg-[#7D7D7D] text-white'
          }`}
        >
          <Search className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsFilterOpen(!isFilterOpen);
            setIsPlusMenuOpen(false);
          }}
          aria-label="Filter trades"
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors cursor-pointer ${
            isFilterOpen || statusFilter !== 'all' ? 'bg-[#2196F3] text-white' : 'bg-[#6E6E6E] hover:bg-[#7D7D7D] text-white'
          }`}
        >
          <ListFilter className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            setIsPlusMenuOpen(!isPlusMenuOpen);
            setIsFilterOpen(false);
          }}
          aria-label="Add trade menu"
          className="w-13 h-13 rounded-full bg-[#2196F3] hover:bg-[#1E88E5] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(33,150,243,0.45)] cursor-pointer"
        >
          <Plus className={`w-6 h-6 transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>

      {/* Close Trade Modal */}
      {tradeToClose && (
        <CloseTradeModal
          trade={tradeToClose}
          onClose={() => setTradeToClose(null)}
        />
      )}
    </div>
  );
};
