import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  Calendar,
  Clock,
  CheckCircle,
  Calculator,
  ShieldAlert,
  Target,
  AlertCircle
} from 'lucide-react';
import { Trade, TradeDirection, TradeStatus, CloseOutcome } from '../../types/trading';
import { CloseTradeModal } from './CloseTradeModal';
import { calculateTradeEstimates, getCurrencySymbol } from '../../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  tradeId: string;
  onBack: () => void;
}

export const TradeDetailPage: React.FC<Props> = ({ tradeId, onBack }) => {
  const { 
    trades, 
    accounts, 
    updateTrade, 
    deleteTrade 
  } = useTrading();

  const trade = trades.find(t => t.id === tradeId);
  const account = accounts.find(a => a.id === trade?.accountId);

  // Close trade modal state
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editAsset, setEditAsset] = useState(trade?.asset || '');
  const [editDirection, setEditDirection] = useState<TradeDirection>(trade?.direction || 'BUY');
  const [editEntry, setEditEntry] = useState(trade?.entryPrice?.toString() || '');
  const [editExit, setEditExit] = useState(trade?.exitPrice?.toString() || '');
  const [editSl, setEditSl] = useState(trade?.stopLoss?.toString() || '');
  const [editTp, setEditTp] = useState(trade?.takeProfit?.toString() || '');
  const [editLots, setEditLots] = useState(trade?.lotSize?.toString() || '1.0');
  const [editPnl, setEditPnl] = useState(trade?.realizedPnl?.toString() || '0');
  const [editStatus, setEditStatus] = useState<TradeStatus>(trade?.status || 'Open');
  const [editOutcome, setEditOutcome] = useState<CloseOutcome | undefined>(trade?.closeOutcome);
  const [editNotes, setEditNotes] = useState(trade?.notes || '');
  const [editDate, setEditDate] = useState(trade?.date || '');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const springButton = {
    type: 'spring' as const,
    stiffness: 450,
    damping: 25
  };

  // Live calculations for trade
  const tradeCalcs = useMemo(() => {
    if (!trade) return null;
    return calculateTradeEstimates(
      trade.asset,
      trade.direction,
      trade.entryPrice,
      trade.stopLoss || 0,
      trade.takeProfit || 0,
      trade.lotSize
    );
  }, [trade]);

  if (!trade) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-neutral-500 text-sm">Trade not found.</p>
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={onBack} 
          className="px-5 py-2.5 rounded-full bg-neutral-950 text-white text-xs font-semibold cursor-pointer"
        >
          Return to Trades
        </motion.button>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(account?.currency);

  // Save Trade Details Edit (handles balance delta safely without double-counting)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry = editEntry ? parseFloat(editEntry) : trade.entryPrice;
    const sl = editSl ? parseFloat(editSl) : undefined;
    const tp = editTp ? parseFloat(editTp) : undefined;
    const lots = editLots ? parseFloat(editLots) : 1;
    const calcs = calculateTradeEstimates(editAsset, editDirection, entry, sl || 0, tp || 0, lots);

    await updateTrade({
      ...trade,
      asset: editAsset.toUpperCase().trim(),
      direction: editDirection,
      entryPrice: entry,
      exitPrice: editExit ? parseFloat(editExit) : undefined,
      stopLoss: sl,
      takeProfit: tp,
      lotSize: lots,
      realizedPnl: editStatus === 'Open' ? 0 : (parseFloat(editPnl) || 0),
      status: editStatus,
      closeOutcome: editOutcome,
      notes: editNotes.trim() || undefined,
      date: editDate,
      estimatedProfit: calcs?.estimatedProfit,
      estimatedLoss: calcs?.estimatedLoss,
      riskRewardRatio: calcs?.riskReward
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      
      {/* Top Bar: Back & Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={springButton}
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trades</span>
        </motion.button>

        <div className="flex items-center gap-2">
          {trade.status === 'Open' && !isEditing && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={springButton}
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Close Trade</span>
            </motion.button>
          )}

          {!isEditing && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={springButton}
              onClick={() => {
                setEditAsset(trade.asset);
                setEditDirection(trade.direction);
                setEditEntry(trade.entryPrice.toString());
                setEditExit(trade.exitPrice?.toString() || '');
                setEditSl(trade.stopLoss?.toString() || '');
                setEditTp(trade.takeProfit?.toString() || '');
                setEditLots(trade.lotSize.toString());
                setEditPnl(trade.realizedPnl.toString());
                setEditStatus(trade.status);
                setEditOutcome(trade.closeOutcome);
                setEditNotes(trade.notes || '');
                setEditDate(trade.date);
                setIsEditing(true);
              }}
              className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-white text-xs font-semibold text-neutral-700 hover:text-neutral-950 border border-neutral-200/90 shadow-sm transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </motion.button>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1.5 text-xs">
              <button 
                onClick={() => setConfirmDelete(false)} 
                className="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => { deleteTrade(trade.id); onBack(); }} 
                className="px-3 py-1.5 rounded-full bg-rose-600 text-white font-medium shadow-sm cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={springButton}
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-full text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete Trade"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Trade Content View vs Edit Mode */}
      {!isEditing ? (
        <div className="space-y-4">
          
          {/* Headline Return Banner Card */}
          <div className={`p-6 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
            trade.status === 'Open'
              ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
              : trade.realizedPnl >= 0
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
              : 'bg-rose-50/70 border-rose-200/80 text-rose-950'
          }`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  trade.direction === 'BUY'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  {trade.direction}
                </span>
                <h1 className="text-2xl font-bold font-mono tracking-tight text-neutral-950">
                  {trade.asset}
                </h1>
                <span className="text-xs text-neutral-600 font-medium">
                  {account?.name || 'Default Account'}
                </span>
              </div>

              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                trade.status === 'Open' 
                  ? 'bg-amber-200/80 text-amber-900' 
                  : 'bg-neutral-200 text-neutral-800'
              }`}>
                {trade.status === 'Open' ? 'OPEN POSITION' : 'SETTLED'}
              </span>
            </div>

            {/* Realized or Projected Status */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                {trade.status === 'Open' ? 'Position Status' : 'Realized Net Result'}
              </span>
              <div className="text-3xl font-bold font-mono tabular-nums mt-0.5">
                {trade.status === 'Open' ? (
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <span className="text-amber-800 text-xl font-semibold">Active & Unsettled</span>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      transition={springButton}
                      onClick={() => setShowCloseModal(true)}
                      className="px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm cursor-pointer"
                    >
                      Close Trade Now
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={trade.realizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {trade.realizedPnl >= 0 ? '+' : ''}{currencySymbol}{Math.abs(trade.realizedPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {trade.closeOutcome && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-neutral-800 border border-neutral-200/80">
                        {trade.closeOutcome}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date Details */}
            <div className="flex items-center justify-between text-xs text-neutral-600 mt-4 pt-3 border-t border-black/[0.06]">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Opened: {trade.date} {trade.time ? `· ${trade.time}` : ''}
              </span>
              {trade.closedDate && (
                <span className="font-medium text-neutral-500">
                  Closed: {trade.closedDate} {trade.closedAt ? `· ${trade.closedAt}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Trade Projections (Auto Calculations Card) */}
          {tradeCalcs && (
            <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-neutral-800" />
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                    Calculated Trade Parameters
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {tradeCalcs.isEstimate ? 'CFD Index (Est.)' : 'Contract Specs'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                    Take Profit Potential
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-700 tabular-nums block mt-0.5">
                    +{currencySymbol}{tradeCalcs.estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-mono block mt-0.5">
                    +{tradeCalcs.pipsToTp} {tradeCalcs.unitLabel} distance
                  </span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-3">
                  <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider block">
                    Stop Loss Risk
                  </span>
                  <span className="text-lg font-bold font-mono text-rose-700 tabular-nums block mt-0.5">
                    -{currencySymbol}{tradeCalcs.estimatedLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-rose-600 font-mono block mt-0.5">
                    -{tradeCalcs.pipsToSl} {tradeCalcs.unitLabel} distance
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-neutral-100">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Risk:Reward</span>
                  <span className="text-xs font-bold font-mono text-neutral-950 tabular-nums">
                    {tradeCalcs.riskReward > 0 ? `1 : ${tradeCalcs.riskReward}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">SL Distance</span>
                  <span className="text-xs font-mono text-neutral-700 tabular-nums">
                    {tradeCalcs.pipsToSl} {tradeCalcs.unitLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">TP Distance</span>
                  <span className="text-xs font-mono text-neutral-700 tabular-nums">
                    {tradeCalcs.pipsToTp} {tradeCalcs.unitLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trade Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white border border-neutral-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Entry Price</span>
              <span className="text-sm font-bold font-mono text-neutral-950 tabular-nums">{trade.entryPrice}</span>
            </div>

            <div className="bg-white border border-neutral-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Exit Price</span>
              <span className="text-sm font-bold font-mono text-neutral-950 tabular-nums">{trade.exitPrice ?? '— (Open)'}</span>
            </div>

            <div className="bg-white border border-rose-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block mb-0.5">Stop Loss</span>
              <span className="text-sm font-bold font-mono text-rose-700 tabular-nums">{trade.stopLoss ?? 'None'}</span>
            </div>

            <div className="bg-white border border-emerald-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block mb-0.5">Take Profit</span>
              <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">{trade.takeProfit ?? 'None'}</span>
            </div>

            <div className="bg-white border border-neutral-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Lot Size</span>
              <span className="text-sm font-bold font-mono text-neutral-950 tabular-nums">{trade.lotSize} lots</span>
            </div>

            <div className="bg-white border border-neutral-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Account Portfolio</span>
              <span className="text-xs font-semibold text-neutral-900 truncate block">{account?.name || 'Default'}</span>
            </div>

            <div className="bg-white border border-neutral-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Execution Status</span>
              <span className="text-xs font-mono font-bold text-neutral-900">{trade.status}</span>
            </div>

            <div className="bg-white border border-neutral-200/80 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Trade ID</span>
              <span className="text-[10px] font-mono text-neutral-400 truncate block">{trade.id}</span>
            </div>
          </div>

          {/* Personal Notes & Reflections */}
          {trade.notes && (
            <div className="bg-white border border-neutral-200/80 p-5 rounded-3xl shadow-xs space-y-1.5">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Personal Notes & Strategy Context
              </span>
              <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-medium">
                {trade.notes}
              </p>
            </div>
          )}

        </div>
      ) : (
        /* EDIT TRADE DETAILS FORM */
        <form onSubmit={handleSaveEdit} className="bg-white border border-black/[0.06] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="text-sm font-bold text-neutral-950 font-mono">Edit Trade Parameters</h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-neutral-500 hover:text-neutral-900 font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">SYMBOL</label>
              <input
                type="text"
                value={editAsset}
                onChange={(e) => setEditAsset(e.target.value.toUpperCase())}
                required
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-neutral-950 uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">DIRECTION</label>
              <select
                value={editDirection}
                onChange={(e) => setEditDirection(e.target.value as TradeDirection)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-neutral-950"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">ENTRY</label>
              <input
                type="number"
                step="any"
                value={editEntry}
                onChange={(e) => setEditEntry(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-mono text-neutral-950"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">EXIT</label>
              <input
                type="number"
                step="any"
                value={editExit}
                onChange={(e) => setEditExit(e.target.value)}
                placeholder="Exit price"
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-mono text-neutral-950"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-rose-700 mb-1">STOP LOSS</label>
              <input
                type="number"
                step="any"
                value={editSl}
                onChange={(e) => setEditSl(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-rose-200 rounded-2xl px-3 py-2 text-xs font-mono text-rose-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-emerald-700 mb-1">TAKE PROFIT</label>
              <input
                type="number"
                step="any"
                value={editTp}
                onChange={(e) => setEditTp(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-emerald-200 rounded-2xl px-3 py-2 text-xs font-mono text-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">LOT SIZE</label>
              <input
                type="number"
                step="any"
                value={editLots}
                onChange={(e) => setEditLots(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-mono text-neutral-950"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">STATUS</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TradeStatus)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs text-neutral-950 font-medium"
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">REALISED P/L ($)</label>
              <input
                type="number"
                step="any"
                value={editPnl}
                onChange={(e) => setEditPnl(e.target.value)}
                disabled={editStatus === 'Open'}
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3 py-2 text-xs font-mono text-neutral-950 font-bold disabled:opacity-40"
              />
            </div>
          </div>

          {editStatus === 'Closed' && (
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 mb-1">CLOSING OUTCOME</label>
              <select
                value={editOutcome || 'Closed Manually'}
                onChange={(e) => setEditOutcome(e.target.value as CloseOutcome)}
                className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs text-neutral-950 font-medium"
              >
                <option value="Take Profit Hit">Take Profit Hit</option>
                <option value="Stop Loss Hit">Stop Loss Hit</option>
                <option value="Breakeven">Breakeven</option>
                <option value="Closed Manually">Closed Manually</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 mb-1">DATE</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 mb-1">NOTES</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              transition={springButton}
              className="px-5 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm cursor-pointer"
            >
              Save Changes
            </motion.button>
          </div>
        </form>
      )}

      {/* Close Trade Modal with spring transition */}
      <AnimatePresence>
        {showCloseModal && (
          <CloseTradeModal
            trade={trade}
            onClose={() => setShowCloseModal(false)}
            onClosedSuccess={() => setShowCloseModal(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
