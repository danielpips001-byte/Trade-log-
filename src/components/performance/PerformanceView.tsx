import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types/trading';
import { ChevronDown, ListFilter, Layers, AlertTriangle } from 'lucide-react';
import {
  aggregateMultiCurrencyAccounts,
  formatMoney,
  getCurrencySymbol,
  resolveConversionRate
} from '../../utils/calculations';

type TimeframeOption = 'all' | 'ytd' | 'month' | 'week';
type SortKey = 'return' | 'winRate' | 'trades';

export const PerformanceView: React.FC = () => {
  const {
    filteredTrades,
    selectedAccountId,
    setSelectedAccountId,
    activeAccount,
    accounts,
    exchangeRates,
    saveExchangeRate
  } = useTrading();

  const [timeframe, setTimeframe] = useState<TimeframeOption>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('return');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const [reportingCurrency, setReportingCurrency] = useState<'USD' | 'NGN'>('USD');
  const [quickRateInput, setQuickRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const isAllAccounts = selectedAccountId === 'all';
  const startingBalance = activeAccount?.startingBalance || accounts[0]?.startingBalance || 100000;
  const currency = activeAccount?.currency || accounts[0]?.currency || 'USD';

  const portfolioSummary = useMemo(
    () => aggregateMultiCurrencyAccounts(accounts, exchangeRates, reportingCurrency),
    [accounts, exchangeRates, reportingCurrency]
  );

  const getTradeStartingBalance = (trade: Trade) => {
    const acc = accounts.find((a) => a.id === trade.accountId);
    return acc?.startingBalance || startingBalance || 100000;
  };

  const getTradePct = (trade: Trade) => {
    const base = getTradeStartingBalance(trade);
    return base > 0 ? ((trade.realizedPnl || 0) / base) * 100 : 0;
  };

  const allClosedTrades = useMemo(() => {
    return filteredTrades
      .filter((t) => t.status === 'Closed')
      .sort((a, b) => (a.closedDate || a.date).localeCompare(b.closedDate || b.date));
  }, [filteredTrades]);

  const scopedTrades = useMemo(() => {
    if (timeframe === 'all') return allClosedTrades;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return allClosedTrades.filter((t) => {
      const dt = new Date((t.closedDate || t.date) + 'T00:00:00');
      if (timeframe === 'ytd') return dt.getFullYear() === currentYear;
      if (timeframe === 'month') return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
      if (timeframe === 'week') {
        const diffDays = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      return true;
    });
  }, [allClosedTrades, timeframe]);

  // Scoped P/L strictly grouped by currency (and optionally converted when rates exist)
  const scopedCurrencyPnl = useMemo(() => {
    const map = new Map<string, number>();
    scopedTrades.forEach((t) => {
      const accCurr = accounts.find((a) => a.id === t.accountId)?.currency || currency;
      map.set(accCurr, Number(((map.get(accCurr) || 0) + (t.realizedPnl || 0)).toFixed(2)));
    });
    const byCurrency = Array.from(map.entries()).map(([curr, amount]) => ({ curr, amount }));

    let convertedTotal: number | null = null;
    if (isAllAccounts) {
      let sum = 0;
      let allOk = true;
      for (const item of byCurrency) {
        const conv = resolveConversionRate(item.curr, reportingCurrency, exchangeRates);
        if (!conv.ok) {
          allOk = false;
          break;
        }
        sum += item.amount * conv.rate;
      }
      if (allOk) {
        convertedTotal = Number(sum.toFixed(2));
      }
    }

    return { byCurrency, convertedTotal };
  }, [scopedTrades, accounts, currency, isAllAccounts, reportingCurrency, exchangeRates]);

  // Core metrics computation (currency-safe across single & multi-account modes)
  const stats = useMemo(() => {
    const allTimePct = allClosedTrades.reduce((s, t) => s + getTradePct(t), 0);

    const nowYear = new Date().getFullYear();
    const ytdPct = allClosedTrades
      .filter((t) => new Date((t.closedDate || t.date) + 'T00:00:00').getFullYear() === nowYear)
      .reduce((s, t) => s + getTradePct(t), 0);

    const weekBuckets = new Set<string>();
    scopedTrades.forEach((t) => {
      const dt = new Date((t.closedDate || t.date) + 'T00:00:00');
      const day = dt.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(dt);
      mon.setDate(dt.getDate() + diff);
      weekBuckets.add(mon.toISOString().split('T')[0]);
    });

    const scopedPnl = scopedTrades.reduce((s, t) => s + (t.realizedPnl || 0), 0);
    const scopedPct = scopedTrades.reduce((s, t) => s + getTradePct(t), 0);
    const weeklyAvgPct = weekBuckets.size > 0 ? scopedPct / weekBuckets.size : 0;

    const totalCount = scopedTrades.length;
    const perTradePct = totalCount > 0 ? scopedPct / totalCount : 0;

    const winners = scopedTrades.filter((t) => t.realizedPnl > 0);
    const losers = scopedTrades.filter((t) => t.realizedPnl < 0);

    const avgWinnerPct =
      winners.length > 0
        ? winners.reduce((s, t) => s + getTradePct(t), 0) / winners.length
        : 0;
    const avgLoserPct =
      losers.length > 0
        ? losers.reduce((s, t) => s + getTradePct(t), 0) / losers.length
        : 0;

    const winRate = totalCount > 0 ? Math.round((winners.length / totalCount) * 100) : 0;

    let runningPct = 0;
    let peakPct = 0;
    let maxDrawdownPct = 0;
    let hwmPct = 0;

    const curvePoints: { label: string; pct: number; pnl: number }[] = [];
    scopedTrades.forEach((t) => {
      const dateStr = t.closedDate || t.date;
      const d = new Date(dateStr + 'T00:00:00');
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      runningPct += getTradePct(t);
      if (runningPct > peakPct) peakPct = runningPct;
      if (runningPct > hwmPct) hwmPct = runningPct;
      const dd = runningPct - peakPct;
      if (dd < maxDrawdownPct) maxDrawdownPct = dd;
      curvePoints.push({ label, pct: runningPct, pnl: t.realizedPnl || 0 });
    });

    return {
      scopedPct,
      scopedPnl,
      allTimePct,
      ytdPct,
      weeklyAvgPct,
      perTradePct,
      avgWinnerPct,
      avgLoserPct,
      winnersCount: winners.length,
      losersCount: losers.length,
      winRate,
      maxDrawdownPct,
      hwmPct,
      curvePoints
    };
  }, [allClosedTrades, scopedTrades, accounts, startingBalance]);

  // Symbol Breakdown
  const symbolRows = useMemo(() => {
    const map = new Map<string, { symbol: string; w: number; l: number; returnPct: number; count: number }>();
    scopedTrades.forEach((t) => {
      const cur = map.get(t.asset) || { symbol: t.asset, w: 0, l: 0, returnPct: 0, count: 0 };
      if (t.realizedPnl > 0) cur.w += 1;
      else if (t.realizedPnl < 0) cur.l += 1;
      cur.returnPct += getTradePct(t);
      cur.count += 1;
      map.set(t.asset, cur);
    });

    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      winRate: r.count > 0 ? Math.round((r.w / r.count) * 100) : 0
    }));

    return rows.sort((a, b) => {
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      if (sortBy === 'trades') return b.count - a.count;
      return b.returnPct - a.returnPct;
    });
  }, [scopedTrades, accounts, startingBalance, sortBy]);

  const activeSymbolRow =
    symbolRows.find((r) => r.symbol === selectedSymbol) || symbolRows[0] || null;

  // Best Days of Week
  const bestDays = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const map = new Map<string, { day: string; trades: number; totalPct: number }>();

    scopedTrades.forEach((t) => {
      const dt = new Date((t.closedDate || t.date) + 'T00:00:00');
      const dayName = dayNames[dt.getDay()];
      const cur = map.get(dayName) || { day: dayName, trades: 0, totalPct: 0 };
      cur.trades += 1;
      cur.totalPct += getTradePct(t);
      map.set(dayName, cur);
    });

    return Array.from(map.values())
      .map((d) => ({
        ...d,
        avgReturn: d.trades > 0 ? d.totalPct / d.trades : 0
      }))
      .sort((a, b) => b.avgReturn - a.avgReturn);
  }, [scopedTrades, accounts, startingBalance]);

  // Build SVG Curve
  const chartData = useMemo(() => {
    const pts = stats.curvePoints;
    if (pts.length === 0) {
      return {
        path: 'M 44 150 L 330 150',
        coords: [] as { x: number; y: number; label: string; pct: number }[],
        minVal: 0,
        maxVal: 2,
        midVal: 1
      };
    }

    const rawValues = [0, ...pts.map((p) => p.pct)];
    const minRaw = Math.min(...rawValues, 0);
    const maxRaw = Math.max(...rawValues, 0.5);
    const pad = Math.max((maxRaw - minRaw) * 0.15, 0.2);
    const minVal = minRaw < 0 ? minRaw - pad : 0;
    const maxVal = maxRaw + pad;
    const midVal = (minVal + maxVal) / 2;

    const leftX = 48;
    const rightX = 336;
    const topY = 16;
    const bottomY = 166;
    const range = maxVal - minVal || 1;

    const allSeries = [{ label: pts[0].label, pct: 0 }, ...pts];
    const coords = allSeries.map((pt, i) => {
      const x =
        allSeries.length === 1
          ? leftX
          : leftX + (i / (allSeries.length - 1)) * (rightX - leftX);
      const y = bottomY - ((pt.pct - minVal) / range) * (bottomY - topY);
      return { x, y, label: pt.label, pct: pt.pct };
    });

    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      path += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return { path, coords, minVal, maxVal, midVal };
  }, [stats.curvePoints]);

  const cycleSort = () => {
    setSortBy((prev) => (prev === 'return' ? 'winRate' : prev === 'winRate' ? 'trades' : 'return'));
  };

  const handleSaveQuickRate = async (pairKey: string) => {
    const val = parseFloat(quickRateInput);
    if (isNaN(val) || val <= 0) return;
    setSavingRate(true);
    try {
      await saveExchangeRate(pairKey, val);
      setQuickRateInput('');
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 pb-24 space-y-3">
      {/* 0. All Accounts Multi-Currency Breakdown (Only shown when viewing All Accounts) */}
      {isAllAccounts && (
        <div className="bg-[#262626] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2196F3]" />
              <div>
                <h2 className="text-xs font-bold text-white">All Accounts Portfolio</h2>
                <span className="text-[10px] text-neutral-400">
                  Each currency is tracked separately; totals convert only with explicit rates
                </span>
              </div>
            </div>
            {!portfolioSummary.isSingleCurrency && (
              <div className="flex bg-[#1C1C1C] rounded-lg p-0.5 border border-white/10 text-[10px] shrink-0">
                {(['USD', 'NGN'] as const).map((rc) => (
                  <button
                    key={rc}
                    type="button"
                    onClick={() => setReportingCurrency(rc)}
                    className={`px-2 py-1 rounded font-bold cursor-pointer ${
                      reportingCurrency === rc ? 'bg-[#2196F3] text-white' : 'text-neutral-400'
                    }`}
                  >
                    {rc} ({getCurrencySymbol(rc)})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separate Currency Subtotals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {portfolioSummary.subtotalsByCurrency.map((sub) => (
              <div
                key={sub.currency}
                className="bg-[#1C1C1C] rounded-lg p-3 border border-white/[0.05] flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-semibold text-neutral-400 block">
                    {sub.currency} Accounts ({sub.accountCount})
                  </span>
                  <span className="text-sm font-bold font-mono text-white tabular-nums">
                    {formatMoney(sub.currentBalance, sub.currency)}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold font-mono tabular-nums ${
                    sub.netReturn >= 0 ? 'text-[#2ECC71]' : 'text-[#EF4444]'
                  }`}
                >
                  {formatMoney(sub.netReturn, sub.currency, true)}
                </span>
              </div>
            ))}
          </div>

          {/* Converted Combined Total (if multi-currency) */}
          {!portfolioSummary.isSingleCurrency && (
            <div className="bg-[#1C1C1C] rounded-lg p-3 border border-[#2196F3]/25">
              {portfolioSummary.convertedTotal.ok ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-400 block">
                      Converted Total ({portfolioSummary.convertedTotal.reportingCurrency})
                    </span>
                    <span className="text-sm font-bold font-mono text-white tabular-nums">
                      {formatMoney(
                        portfolioSummary.convertedTotal.totalCurrentBalance,
                        portfolioSummary.convertedTotal.reportingCurrency
                      )}
                    </span>
                    {portfolioSummary.convertedTotal.ratesUsed.length > 0 && (
                      <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                        Using {portfolioSummary.convertedTotal.ratesUsed.join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block">Converted Net</span>
                    <span
                      className={`text-xs font-bold font-mono tabular-nums ${
                        portfolioSummary.convertedTotal.totalNetReturn >= 0
                          ? 'text-[#2ECC71]'
                          : 'text-[#EF4444]'
                      }`}
                    >
                      {formatMoney(
                        portfolioSummary.convertedTotal.totalNetReturn,
                        portfolioSummary.convertedTotal.reportingCurrency,
                        true
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Enter {portfolioSummary.convertedTotal.missingConversions[0].from} →{' '}
                      {portfolioSummary.convertedTotal.missingConversions[0].to} rate to view combined{' '}
                      {reportingCurrency} total:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white shrink-0">
                      1 {portfolioSummary.convertedTotal.missingConversions[0].suggestedKey.split('_')[0]} =
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={quickRateInput}
                      onChange={(e) => setQuickRateInput(e.target.value)}
                      placeholder="Rate"
                      className="flex-1 bg-[#262626] border border-white/15 rounded px-2.5 py-1 text-xs font-mono text-white"
                    />
                    <span className="text-xs font-mono text-white shrink-0">
                      {portfolioSummary.convertedTotal.missingConversions[0].suggestedKey.split('_')[1]}
                    </span>
                    <button
                      type="button"
                      disabled={savingRate}
                      onClick={() =>
                        !portfolioSummary.convertedTotal.ok &&
                        handleSaveQuickRate(portfolioSummary.convertedTotal.missingConversions[0].suggestedKey)
                      }
                      className="px-3 py-1 rounded bg-[#2196F3] text-white text-xs font-bold cursor-pointer"
                    >
                      {savingRate ? '...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Per-Account Breakdown Rows */}
          <div className="divide-y divide-white/[0.05] border-t border-white/[0.06] pt-1">
            {accounts.map((acc) => {
              const net = acc.currentBalance - acc.startingBalance;
              const pct = acc.startingBalance > 0 ? (net / acc.startingBalance) * 100 : 0;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  className="w-full py-2 flex items-center justify-between text-left hover:bg-white/[0.03] rounded px-1 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{acc.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-200">
                        {acc.currency}
                      </span>
                      <span className="text-[10px] text-neutral-400">{acc.type}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-xs font-bold text-white block">
                      {formatMoney(acc.currentBalance, acc.currency)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        net >= 0 ? 'text-[#2ECC71]' : 'text-[#EF4444]'
                      }`}
                    >
                      {formatMoney(net, acc.currency, true)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Timeframe Dropdown & Headline Return (Exact match to IMG_3533) */}
      <div className="bg-[#262626] rounded-xl px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04] flex items-center justify-between">
        <div className="relative flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
            aria-label="Select performance timeframe"
            className="appearance-none bg-transparent text-sm font-bold text-white pr-8 py-1 cursor-pointer focus:outline-none"
          >
            <option value="all" className="bg-[#262626] text-white">All time</option>
            <option value="ytd" className="bg-[#262626] text-white">Year-to-date</option>
            <option value="month" className="bg-[#262626] text-white">This Month</option>
            <option value="week" className="bg-[#262626] text-white">This Week</option>
          </select>
          <ChevronDown className="w-4 h-4 text-white/80 pointer-events-none -ml-6" />
        </div>

        <div className="text-right">
          <span className="text-sm font-bold font-mono text-white tabular-nums">
            {stats.scopedPct >= 0 ? '' : '-'}{Math.abs(stats.scopedPct).toFixed(2)}%
          </span>
          {!isAllAccounts ? (
            <span className="text-[10px] font-mono text-neutral-400 block tabular-nums">
              {formatMoney(stats.scopedPnl, currency, true)}
            </span>
          ) : scopedCurrencyPnl.convertedTotal !== null && !portfolioSummary.isSingleCurrency ? (
            <span className="text-[10px] font-mono text-neutral-400 block tabular-nums">
              {formatMoney(scopedCurrencyPnl.convertedTotal, reportingCurrency, true)} ({reportingCurrency})
            </span>
          ) : scopedCurrencyPnl.byCurrency.length > 0 ? (
            <span className="text-[10px] font-mono text-neutral-400 block tabular-nums">
              {scopedCurrencyPnl.byCurrency
                .map((item) => formatMoney(item.amount, item.curr, true))
                .join(' · ')}
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. Equity Curve Chart Card (Exact match to IMG_3533) */}
      <div className="bg-[#262626] rounded-xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
            {chartData.maxVal >= 0 ? '+' : ''}{chartData.maxVal.toFixed(1)}%
          </span>
          {hoverIdx !== null && chartData.coords[hoverIdx] && (
            <span className="text-[11px] font-mono font-bold text-[#2196F3] tabular-nums">
              {chartData.coords[hoverIdx].label} · {chartData.coords[hoverIdx].pct >= 0 ? '+' : ''}
              {chartData.coords[hoverIdx].pct.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="relative w-full h-48">
          <svg viewBox="0 0 350 190" className="w-full h-full overflow-visible">
            {/* Y-axis labels */}
            <text x="4" y="22" className="fill-neutral-400 text-[10px] font-mono">
              +{chartData.maxVal.toFixed(1)}%
            </text>
            <text x="4" y="94" className="fill-neutral-400 text-[10px] font-mono">
              {chartData.midVal >= 0 ? '+' : ''}{chartData.midVal.toFixed(1)}%
            </text>
            <text x="4" y="168" className="fill-neutral-400 text-[10px] font-mono">
              {chartData.minVal.toFixed(1)}%
            </text>

            {/* Horizontal gridlines */}
            <line x1="48" y1="18" x2="340" y2="18" stroke="#3B3B3B" strokeWidth="1" />
            <line x1="48" y1="91" x2="340" y2="91" stroke="#3B3B3B" strokeWidth="1" />
            <line x1="48" y1="166" x2="340" y2="166" stroke="#525252" strokeWidth="1" />

            {/* Equity line */}
            <path
              d={chartData.path}
              fill="none"
              stroke="#2196F3"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Interactive hover dots */}
            {chartData.coords.map((pt, i) => (
              <g key={i} onMouseEnter={() => setHoverIdx(i)} onClick={() => setHoverIdx(i)}>
                <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" className="cursor-pointer" />
                {hoverIdx === i && (
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#2196F3" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
              </g>
            ))}

            {/* X-axis labels */}
            {chartData.coords.length > 0 && (() => {
              const step = Math.max(1, Math.floor(chartData.coords.length / 4));
              return chartData.coords
                .filter((_, idx) => idx === 0 || idx === chartData.coords.length - 1 || idx % step === 0)
                .slice(0, 5)
                .map((pt, i) => (
                  <text
                    key={i}
                    x={pt.x}
                    y="185"
                    textAnchor="middle"
                    className="fill-neutral-300 text-[10px] font-medium"
                  >
                    {pt.label}
                  </text>
                ));
            })()}
          </svg>
        </div>
      </div>

      {/* 3. 3x3 Stat Grid (Exact 9 metrics from IMG_3532 & IMG_3533) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">All Time</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.allTimePct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Year-to-date</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.ytdPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Weekly</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.weeklyAvgPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Per Trade</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.perTradePct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Average Winner</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.avgWinnerPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Average Loser</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.avgLoserPct.toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Winners</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.winnersCount}
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Losers</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.losersCount}
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Win Rate</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.winRate}%
          </span>
        </div>
      </div>

      {/* 4. 2-Col Risk Cards (Max Drawdown | High Water Mark) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#262626] rounded-xl py-3.5 px-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">Max Drawdown</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            {stats.maxDrawdownPct === 0 ? '-0.00%' : `${stats.maxDrawdownPct.toFixed(2)}%`}
          </span>
        </div>

        <div className="bg-[#262626] rounded-xl py-3.5 px-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-neutral-300 block mb-1">High Water Mark</span>
          <span className="text-[17px] font-bold font-mono text-white tabular-nums">
            +{stats.hwmPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 5. Symbol Data Card (Exact match to IMG_3532) */}
      <div className="bg-[#262626] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
        <h3 className="text-xs font-bold text-white text-center mb-3">Symbol Data</h3>
        {activeSymbolRow ? (
          <div className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-5">
              <select
                value={activeSymbolRow.symbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                aria-label="Inspect symbol"
                className="w-full bg-transparent border-b border-white/30 pb-1 text-sm font-bold text-white focus:outline-none focus:border-[#2196F3] cursor-pointer"
              >
                {symbolRows.map((r) => (
                  <option key={r.symbol} value={r.symbol} className="bg-[#262626] text-white">
                    {r.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-[10px] text-neutral-300 block">W</span>
              <span className="text-sm font-bold font-mono text-white tabular-nums">{activeSymbolRow.w}</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-[10px] text-neutral-300 block">L</span>
              <span className="text-sm font-bold font-mono text-white tabular-nums">{activeSymbolRow.l}</span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-[10px] text-neutral-300 block">Win</span>
              <span className="text-sm font-bold font-mono text-white tabular-nums">{activeSymbolRow.winRate}%</span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-[10px] text-neutral-300 block">Return</span>
              <span className="text-sm font-bold font-mono text-white tabular-nums">
                {activeSymbolRow.returnPct.toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 text-center py-2">No closed symbol data yet.</p>
        )}
      </div>

      {/* 6. Ranked Symbol Table Card (Exact match to IMG_3532) */}
      <div className="bg-[#262626] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            aria-label="Toggle symbol breakdown"
            className="p-1 text-white/80 hover:text-white cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isTableExpanded ? '' : '-rotate-90'}`} />
          </button>

          <button
            type="button"
            onClick={cycleSort}
            title={`Sorted by ${sortBy} (tap to switch)`}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2196F3] cursor-pointer py-1 px-2 rounded hover:bg-white/[0.04]"
          >
            <span className="text-neutral-400 font-normal">Sort: {sortBy === 'winRate' ? 'Win %' : sortBy}</span>
            <ListFilter className="w-4 h-4 text-[#2196F3]" />
          </button>
        </div>

        {isTableExpanded && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-12 text-[11px] font-semibold text-neutral-300 pb-1">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Symbol</div>
              <div className="col-span-1 text-center">W</div>
              <div className="col-span-1 text-center">L</div>
              <div className="col-span-3 text-center">Win Rate</div>
              <div className="col-span-2 text-right">Return</div>
            </div>

            {symbolRows.length > 0 ? (
              symbolRows.map((row, idx) => (
                <button
                  key={row.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(row.symbol)}
                  className="w-full grid grid-cols-12 items-center py-1 text-left hover:bg-white/[0.04] rounded transition-colors cursor-pointer"
                >
                  <div className="col-span-1 text-sm font-bold font-mono text-white tabular-nums">{idx + 1}</div>
                  <div className="col-span-4 text-sm font-bold text-white truncate pr-2">{row.symbol}</div>
                  <div className="col-span-1 text-sm font-bold font-mono text-white text-center tabular-nums">{row.w}</div>
                  <div className="col-span-1 text-sm font-bold font-mono text-white text-center tabular-nums">{row.l}</div>
                  <div className="col-span-3 text-sm font-bold font-mono text-white text-center tabular-nums">{row.winRate}%</div>
                  <div className="col-span-2 text-sm font-bold font-mono text-white text-right tabular-nums">
                    {row.returnPct.toFixed(1)}%
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-neutral-400 text-center py-3">Close trades to populate symbol rankings.</p>
            )}
          </div>
        )}
      </div>

      {/* 7. Best Days of Week Card (Exact match to IMG_3532) */}
      <div className="bg-[#262626] rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/[0.04]">
        <h3 className="text-xs font-bold text-white text-center mb-3">Best Days of Week</h3>
        <div className="space-y-1.5">
          <div className="grid grid-cols-12 text-[11px] font-semibold text-neutral-300 pb-1">
            <div className="col-span-6">Day</div>
            <div className="col-span-3 text-center">Trades</div>
            <div className="col-span-3 text-right">Avg Return</div>
          </div>

          {bestDays.length > 0 ? (
            bestDays.map((row) => (
              <div key={row.day} className="grid grid-cols-12 items-center py-0.5">
                <div className="col-span-6 text-sm font-bold text-white">{row.day}</div>
                <div className="col-span-3 text-sm font-bold font-mono text-white text-center tabular-nums">
                  {row.trades}
                </div>
                <div className="col-span-3 text-sm font-bold font-mono text-white text-right tabular-nums">
                  {row.avgReturn.toFixed(2)}%
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-400 text-center py-3">No weekday statistics available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
