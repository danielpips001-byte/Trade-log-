import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { ChevronLeft, ChevronRight, BarChart2, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { SimpleAnalyticsModal } from '../analytics/SimpleAnalyticsModal';
import { CloseTradeModal } from '../trades/CloseTradeModal';
import { Trade } from '../../types/trading';
import { getCurrencySymbol } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';

export const CalendarView: React.FC = () => {
  const { 
    filteredTrades, 
    activeAccount, 
    selectedCalendarDate, 
    setSelectedCalendarDate,
    setSelectedTradeId,
    setActiveTab
  } = useTrading();

  // Reference date: November 2026
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 10, 1));
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const springButton = {
    type: 'spring' as const,
    stiffness: 450,
    damping: 25
  };

  // Monthly closed trades only
  const monthTrades = useMemo(() => {
    return filteredTrades.filter(t => t.date.startsWith(monthPrefix) && t.status !== 'Open');
  }, [filteredTrades, monthPrefix]);

  // Open trades list across the active account
  const openTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status === 'Open');
  }, [filteredTrades]);

  // Monthly summary stats strictly from realized/closed trades
  const totalTrades = monthTrades.length;
  const totalProfit = monthTrades
    .filter(t => (t.realizedPnl || 0) > 0)
    .reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
  const totalLoss = Math.abs(
    monthTrades
      .filter(t => (t.realizedPnl || 0) < 0)
      .reduce((sum, t) => sum + (t.realizedPnl || 0), 0)
  );
  const netPnl = totalProfit - totalLoss;

  const displayCurrency = getCurrencySymbol(activeAccount?.currency);

  // Day stats map for calendar (closed trades only)
  const dayStatsMap = useMemo(() => {
    const map = new Map<string, { netPnl: number; count: number; hasOpen: boolean }>();
    filteredTrades.forEach(t => {
      const cur = map.get(t.date) || { netPnl: 0, count: 0, hasOpen: false };
      if (t.status === 'Open') {
        cur.hasOpen = true;
      } else {
        cur.netPnl += (t.realizedPnl || 0);
        cur.count += 1;
      }
      map.set(t.date, cur);
    });
    return map;
  }, [filteredTrades]);

  // Calendar dates math
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Selected date trades
  const selectedDateTrades = useMemo(() => {
    return filteredTrades.filter(t => t.date === selectedCalendarDate);
  }, [filteredTrades, selectedCalendarDate]);

  // Performance line chart points (chronological balance over time)
  const chartPoints = useMemo(() => {
    const sorted = [...filteredTrades]
      .filter(t => t.status !== 'Open')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let bal = activeAccount?.startingBalance || 100000;
    const points: { date: string; balance: number }[] = [{ date: 'Start', balance: bal }];

    sorted.forEach(t => {
      bal += (t.realizedPnl || 0);
      points.push({ date: t.date.slice(5), balance: bal });
    });

    return points;
  }, [filteredTrades, activeAccount]);

  // Clean SVG chart path generator
  const svgChart = useMemo(() => {
    if (chartPoints.length < 2) return null;
    const balances = chartPoints.map(p => p.balance);
    const minB = Math.min(...balances);
    const maxB = Math.max(...balances);
    const range = maxB - minB || 1000;

    const w = 400;
    const h = 75;

    const pts = chartPoints.map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * (w - 16) + 8;
      const y = h - 12 - ((p.balance - minB) / range) * (h - 24);
      return { x, y };
    });

    const pathD = pts.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;

    return { pathD, areaD, current: balances[balances.length - 1] };
  }, [chartPoints]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      
      {/* Active Open Positions Quick Banner with Spring Press */}
      {openTrades.length > 0 && (
        <motion.div 
          whileHover={{ y: -1.5 }}
          whileTap={{ scale: 0.985 }}
          transition={springButton}
          onClick={() => setActiveTab('trades')}
          className="bg-amber-50/80 backdrop-blur-md border border-amber-200/90 hover:border-amber-300 p-4 rounded-3xl flex items-center justify-between cursor-pointer transition-colors shadow-[0_2px_12px_rgba(245,158,11,0.08)]"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <div>
              <span className="text-xs font-bold text-amber-950 block">
                {openTrades.length} Active Open {openTrades.length === 1 ? 'Position' : 'Positions'}
              </span>
              <span className="text-[11px] text-amber-800 font-mono">
                {openTrades.map(t => `${t.asset} (${t.direction})`).join(' · ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded-full">
            <span>Manage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </motion.div>
      )}

      {/* 1. Monthly Summary Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-500 font-mono tracking-wider">
            {monthNames[month].toUpperCase()} PERFORMANCE
          </span>
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={springButton}
            onClick={() => setShowAnalyticsModal(true)}
            className="flex items-center gap-1 text-xs text-neutral-800 hover:text-neutral-950 font-semibold bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </motion.button>
        </div>

        {/* Net PnL Headline */}
        <div className="mb-4">
          <div className="text-xs text-neutral-500 mb-0.5 font-medium">Monthly Realised Net P/L</div>
          <div className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight ${
            netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {netPnl >= 0 ? '+' : ''}{displayCurrency}{Math.abs(netPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* 3 Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-100 text-center">
          <div>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block font-mono">CLOSED TRADES</span>
            <span className="text-base font-bold font-mono text-neutral-950 mt-0.5 block">{totalTrades}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block font-mono">TOTAL PROFIT</span>
            <span className="text-base font-bold font-mono text-emerald-600 tabular-nums mt-0.5 block">
              +{displayCurrency}{totalProfit.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block font-mono">TOTAL LOSS</span>
            <span className="text-base font-bold font-mono text-rose-600 tabular-nums mt-0.5 block">
              -{displayCurrency}{totalLoss.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Performance Line Chart */}
      {svgChart && (
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 font-mono tracking-wider">BALANCE TRAJECTORY</span>
            <span className="text-xs font-mono font-bold text-neutral-950 tabular-nums">
              {displayCurrency}{svgChart.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-full h-20 relative">
            <svg viewBox="0 0 400 75" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="chartGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={svgChart.areaD} fill="url(#chartGradLight)" />
              <path d={svgChart.pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* 3. Monthly Calendar */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] rounded-3xl p-5">
        
        {/* Month Navigation with Spring Buttons */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-neutral-950 font-mono">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full">
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={springButton}
              onClick={prevMonth}
              className="p-1.5 rounded-full hover:bg-white text-neutral-700 transition-colors cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={springButton}
              onClick={nextMonth}
              className="p-1.5 rounded-full hover:bg-white text-neutral-700 transition-colors cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="text-[10px] font-semibold text-neutral-400 py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Previous month trailing days */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`prev-${i}`}
              className="h-13 sm:h-15 rounded-2xl bg-neutral-50/60 p-1.5 opacity-30 select-none border border-neutral-100"
            >
              <span className="text-[10px] font-mono text-neutral-400">
                {daysInPrevMonth - firstDayOfWeek + i + 1}
              </span>
            </div>
          ))}

          {/* Active days in month with subtle spring press */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const stats = dayStatsMap.get(dateStr);
            const isSelected = selectedCalendarDate === dateStr;
            const hasClosed = stats && stats.count > 0;
            const isProfit = hasClosed && stats.netPnl > 0;
            const isLoss = hasClosed && stats.netPnl < 0;
            const hasOpen = stats?.hasOpen;

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.93 }}
                transition={springButton}
                onClick={() => setSelectedCalendarDate(dateStr)}
                className={`h-13 sm:h-15 rounded-2xl p-1.5 text-left flex flex-col justify-between transition-colors cursor-pointer relative ${
                  isSelected ? 'ring-2 ring-neutral-950 shadow-md z-10' : ''
                } ${
                  isProfit
                    ? 'bg-emerald-50/90 border border-emerald-200/90 hover:bg-emerald-100/90'
                    : isLoss
                    ? 'bg-rose-50/90 border border-rose-200/90 hover:bg-rose-100/90'
                    : 'bg-[#F9FAFB] border border-neutral-200/70 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-mono font-bold ${
                    isSelected ? 'text-neutral-950 font-extrabold' : isProfit ? 'text-emerald-800' : isLoss ? 'text-rose-800' : 'text-neutral-600'
                  }`}>
                    {dayNum}
                  </span>
                  {hasOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs" title="Has open trade" />
                  )}
                </div>

                {hasClosed ? (
                  <span className={`text-[9px] font-mono font-bold tabular-nums truncate block ${
                    isProfit ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-neutral-800'
                  }`}>
                    {stats.netPnl > 0 ? '+' : ''}${Math.round(Math.abs(stats.netPnl))}
                  </span>
                ) : hasOpen ? (
                  <span className="text-[8px] font-mono font-bold text-amber-700 block truncate">
                    OPEN
                  </span>
                ) : (
                  <span className="h-2" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-4 pt-3 border-t border-neutral-100 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Loss
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Open
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={springButton}
            onClick={() => setActiveTab('add')}
            className="text-neutral-950 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Trade
          </motion.button>
        </div>

      </div>

      {/* 4. Selected Day Details */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
          <span className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
            {selectedCalendarDate} TRADES
          </span>
          <span className="text-xs text-neutral-500 font-medium">
            {selectedDateTrades.length} recorded
          </span>
        </div>

        {selectedDateTrades.length > 0 ? (
          <div className="space-y-2.5">
            {selectedDateTrades.map(trade => (
              <motion.div
                key={trade.id}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                transition={springButton}
                className="w-full text-left p-3.5 rounded-2xl bg-neutral-50/80 hover:bg-neutral-100 border border-neutral-200/70 flex items-center justify-between transition-colors"
              >
                <div 
                  onClick={() => setSelectedTradeId(trade.id)}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    trade.direction === 'BUY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {trade.direction}
                  </span>
                  <div>
                    <span className="text-xs font-mono font-bold text-neutral-950 block">{trade.asset}</span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {trade.time || '—'} · {trade.lotSize || 1} lot
                      {trade.closeOutcome && ` · ${trade.closeOutcome}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  {trade.status === 'Open' ? (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      transition={springButton}
                      onClick={() => setTradeToClose(trade)}
                      className="px-3 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-medium text-[11px] shadow-sm transition-colors cursor-pointer"
                    >
                      Close Trade
                    </motion.button>
                  ) : (
                    <div onClick={() => setSelectedTradeId(trade.id)} className="cursor-pointer">
                      <span className={`text-xs font-bold font-mono tabular-nums ${
                        trade.realizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {trade.realizedPnl >= 0 ? '+' : ''}{displayCurrency}{Math.abs(trade.realizedPnl).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-neutral-500 font-medium">
            No trades recorded for this date.
          </div>
        )}
      </div>

      {/* Simple Analytics Modal with Spring Animation */}
      <AnimatePresence>
        {showAnalyticsModal && (
          <SimpleAnalyticsModal onClose={() => setShowAnalyticsModal(false)} />
        )}
      </AnimatePresence>

      {/* Close Trade Modal with Spring Animation */}
      <AnimatePresence>
        {tradeToClose && (
          <CloseTradeModal
            trade={tradeToClose}
            onClose={() => setTradeToClose(null)}
            onClosedSuccess={() => setTradeToClose(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
