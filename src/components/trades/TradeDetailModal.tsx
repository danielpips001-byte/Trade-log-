import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { TradeDirection, TradeStatus, CloseOutcome } from '../../types/trading';
import {
  calculateTradeMetrics,
  getCurrencySymbol,
  formatMoney,
  formatRiskReward
} from '../../utils/calculations';
import { CloseTradeModal } from './CloseTradeModal';
import { X, Edit3, Trash2, CheckCircle, Loader2, AlertCircle, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TradeDetailModal: React.FC = () => {
  const {
    selectedTrade,
    setSelectedTradeId,
    accounts,
    updateTrade,
    deleteTrade,
    instrumentSpecs,
    exchangeRates,
    setSpecModalSymbol
  } = useTrading();

  const [isEditing, setIsEditing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit state
  const [editAsset, setEditAsset] = useState('');
  const [editDirection, setEditDirection] = useState<TradeDirection>('BUY');
  const [editEntry, setEditEntry] = useState('');
  const [editSl, setEditSl] = useState('');
  const [editTp, setEditTp] = useState('');
  const [editExit, setEditExit] = useState('');
  const [editLots, setEditLots] = useState('');
  const [editPnl, setEditPnl] = useState('');
  const [editStatus, setEditStatus] = useState<TradeStatus>('Open');
  const [editOutcome, setEditOutcome] = useState<CloseOutcome | ''>('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const account = accounts.find(a => a.id === selectedTrade?.accountId);
  const accountCurrency = account?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(accountCurrency);

  const tradeCalcs = useMemo(() => {
    if (!selectedTrade) return null;
    return calculateTradeMetrics({
      symbol: selectedTrade.asset,
      direction: selectedTrade.direction,
      entryPrice: selectedTrade.entryPrice,
      stopLoss: selectedTrade.stopLoss,
      takeProfit: selectedTrade.takeProfit,
      lotSize: selectedTrade.lotSize,
      accountCurrency,
      specsMap: instrumentSpecs,
      exchangeRates
    });
  }, [selectedTrade, accountCurrency, instrumentSpecs, exchangeRates]);

  if (!selectedTrade) return null;

  const isOpen = selectedTrade.status === 'Open';
  const startEdit = () => {
    setEditAsset(selectedTrade.asset);
    setEditDirection(selectedTrade.direction);
    setEditEntry(selectedTrade.entryPrice.toString());
    setEditSl(selectedTrade.stopLoss?.toString() || '');
    setEditTp(selectedTrade.takeProfit?.toString() || '');
    setEditExit(selectedTrade.exitPrice?.toString() || '');
    setEditLots(selectedTrade.lotSize.toString());
    setEditPnl(selectedTrade.realizedPnl.toString());
    setEditStatus(selectedTrade.status);
    setEditOutcome(selectedTrade.closeOutcome || '');
    setEditDate(selectedTrade.date);
    setEditNotes(selectedTrade.notes || '');
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsBusy(true);
    try {
      const entry = parseFloat(editEntry) || selectedTrade.entryPrice;
      const sl = editSl ? parseFloat(editSl) : undefined;
      const tp = editTp ? parseFloat(editTp) : undefined;
      const lots = parseFloat(editLots) || selectedTrade.lotSize;
      const calcs = calculateTradeMetrics({
        symbol: editAsset,
        direction: editDirection,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit: tp,
        lotSize: lots,
        accountCurrency,
        specsMap: instrumentSpecs,
        exchangeRates
      });

      await updateTrade({
        ...selectedTrade,
        asset: editAsset.toUpperCase().trim(),
        direction: editDirection,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit: tp,
        exitPrice: editExit ? parseFloat(editExit) : undefined,
        lotSize: lots,
        realizedPnl: editStatus === 'Open' ? 0 : (parseFloat(editPnl) || 0),
        status: editStatus,
        closeOutcome: editStatus === 'Closed' ? (editOutcome as CloseOutcome || 'Closed Manually') : undefined,
        date: editDate,
        notes: editNotes.trim() || undefined,
        estimatedProfit: calcs.status === 'ok' && calcs.estimatedProfit !== null ? calcs.estimatedProfit : undefined,
        estimatedLoss: calcs.status === 'ok' && calcs.estimatedRisk !== null ? calcs.estimatedRisk : undefined,
        riskRewardRatio: calcs.status === 'ok' && calcs.riskReward !== null ? calcs.riskReward : undefined
      });
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update trade.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    setIsBusy(true);
    try {
      await deleteTrade(selectedTrade.id);
      setSelectedTradeId(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete trade.');
    } finally {
      setIsBusy(false);
    }
  };

  const pctReturn = account && account.startingBalance > 0
    ? (selectedTrade.realizedPnl / account.startingBalance) * 100
    : 0;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isBusy && setSelectedTradeId(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="liquid-glass-surface rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedTrade.asset}</h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedTrade.direction === 'BUY'
                        ? 'bg-[#34D399]/18 text-[#34D399] border border-[#34D399]/30'
                        : 'bg-[#F87171]/18 text-[#F87171] border border-[#F87171]/30'
                    }`}
                  >
                    {selectedTrade.direction}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isOpen
                        ? 'bg-white/15 text-white border border-white/25'
                        : 'bg-white/[0.07] text-neutral-300 border border-white/10'
                    }`}
                  >
                    {selectedTrade.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 font-mono block mt-0.5">
                  {selectedTrade.date} {selectedTrade.time ? `· ${selectedTrade.time}` : ''} · {account?.name || 'Account'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={startEdit}
                    aria-label="Edit trade"
                    className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-white cursor-pointer flex items-center justify-center"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(!confirmDelete)}
                  aria-label="Delete trade"
                  className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-[#F87171] cursor-pointer flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTradeId(null)}
                  aria-label="Close detail"
                  className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-white cursor-pointer flex items-center justify-center"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {confirmDelete && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-red-200">Delete this trade permanently?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3.5 py-1.5 rounded-full liquid-glass-pill text-xs font-semibold text-neutral-200 cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleDelete}
                      className="px-3.5 py-1.5 rounded-full bg-[#F87171] text-xs font-bold text-neutral-950 cursor-pointer"
                    >
                      {isBusy ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Symbol</label>
                      <input
                        type="text"
                        value={editAsset}
                        onChange={(e) => setEditAsset(e.target.value)}
                        required
                        className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Direction</label>
                      <select
                        value={editDirection}
                        onChange={(e) => setEditDirection(e.target.value as TradeDirection)}
                        className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs text-white cursor-pointer"
                      >
                        <option value="BUY" className="bg-[#18191D] text-white">BUY</option>
                        <option value="SELL" className="bg-[#18191D] text-white">SELL</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Entry</label>
                      <input
                        type="number"
                        step="any"
                        value={editEntry}
                        onChange={(e) => setEditEntry(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Stop Loss</label>
                      <input
                        type="number"
                        step="any"
                        value={editSl}
                        onChange={(e) => setEditSl(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Take Profit</label>
                      <input
                        type="number"
                        step="any"
                        value={editTp}
                        onChange={(e) => setEditTp(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Lots</label>
                      <input
                        type="number"
                        step="any"
                        value={editLots}
                        onChange={(e) => setEditLots(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TradeStatus)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs text-white cursor-pointer"
                      >
                        <option value="Open" className="bg-[#18191D] text-white">Open</option>
                        <option value="Closed" className="bg-[#18191D] text-white">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                        P/L ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="any"
                        disabled={editStatus === 'Open'}
                        value={editPnl}
                        onChange={(e) => setEditPnl(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Entry Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Exit Price</label>
                      <input
                        type="number"
                        step="any"
                        value={editExit}
                        onChange={(e) => setEditExit(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs text-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-full liquid-glass-pill text-xs font-semibold text-neutral-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="px-5 py-2 rounded-full liquid-glass-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Outcome / P&L Hero Card */}
                  <div className="liquid-glass-subcard rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">
                        {isOpen ? 'Status' : (selectedTrade.closeOutcome || 'Realized P/L')}
                      </span>
                      <span
                        className={`text-2xl font-bold font-mono tabular-nums ${
                          isOpen
                            ? 'text-white'
                            : selectedTrade.realizedPnl > 0
                            ? 'text-[#34D399]'
                            : selectedTrade.realizedPnl < 0
                            ? 'text-[#F87171]'
                            : 'text-neutral-300'
                        }`}
                      >
                        {isOpen
                          ? 'Active Position'
                          : formatMoney(selectedTrade.realizedPnl, account?.currency, true)}
                      </span>
                      {!isOpen && account && account.startingBalance > 0 && (
                        <span className={`text-xs font-mono font-semibold block mt-0.5 ${
                          pctReturn >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                        }`}>
                          {pctReturn >= 0 ? '+' : ''}{pctReturn.toFixed(2)}% account return
                        </span>
                      )}
                    </div>

                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => setShowCloseModal(true)}
                        className="px-4 py-2.5 rounded-full liquid-glass-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Close Trade</span>
                      </button>
                    )}
                  </div>

                  {/* Execution Prices Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="liquid-glass-subcard rounded-2xl p-3">
                      <span className="text-[10px] text-neutral-400 block">Entry Price</span>
                      <span className="text-sm font-bold font-mono text-white tabular-nums">
                        {selectedTrade.entryPrice}
                      </span>
                    </div>
                    <div className="liquid-glass-subcard rounded-2xl p-3">
                      <span className="text-[10px] text-neutral-400 block">Stop Loss</span>
                      <span className="text-sm font-bold font-mono text-red-300 tabular-nums">
                        {selectedTrade.stopLoss || '—'}
                      </span>
                    </div>
                    <div className="liquid-glass-subcard rounded-2xl p-3">
                      <span className="text-[10px] text-neutral-400 block">Take Profit</span>
                      <span className="text-sm font-bold font-mono text-emerald-300 tabular-nums">
                        {selectedTrade.takeProfit || '—'}
                      </span>
                    </div>
                    <div className="liquid-glass-subcard rounded-2xl p-3">
                      <span className="text-[10px] text-neutral-400 block">
                        {isOpen ? 'Lot Size' : 'Exit Price'}
                      </span>
                      <span className="text-sm font-bold font-mono text-white tabular-nums">
                        {isOpen ? `${selectedTrade.lotSize} lots` : (selectedTrade.exitPrice || '—')}
                      </span>
                    </div>
                  </div>

                  {/* Realized Breakdown (when commission/swap recorded on closed trade) */}
                  {!isOpen &&
                    (selectedTrade.grossRealizedPnl !== undefined ||
                      (selectedTrade.commission && selectedTrade.commission !== 0) ||
                      (selectedTrade.swap && selectedTrade.swap !== 0)) && (
                      <div className="liquid-glass-subcard rounded-2xl p-3 grid grid-cols-3 gap-2 text-center font-mono">
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-sans">Gross P/L</span>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              (selectedTrade.grossRealizedPnl ?? selectedTrade.realizedPnl) >= 0
                                ? 'text-[#34D399]'
                                : 'text-[#F87171]'
                            }`}
                          >
                            {formatMoney(
                              selectedTrade.grossRealizedPnl ?? selectedTrade.realizedPnl,
                              accountCurrency,
                              true
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-sans">Commission</span>
                          <span className="text-xs font-bold text-red-300 tabular-nums">
                            -{formatMoney(selectedTrade.commission || 0, accountCurrency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-sans">Swap</span>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              (selectedTrade.swap || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'
                            }`}
                          >
                            {formatMoney(selectedTrade.swap || 0, accountCurrency, true)}
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Planned Risk & Target Projections (kept separate from realized P/L) */}
                  {tradeCalcs && tradeCalcs.status === 'ok' && (tradeCalcs.estimatedRisk !== null || tradeCalcs.estimatedProfit !== null) && (
                    <div className="liquid-glass-subcard rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400">
                        <span className="font-semibold uppercase tracking-wider">Planned Trade Projections</span>
                        <button
                          type="button"
                          onClick={() => setSpecModalSymbol(selectedTrade.asset)}
                          className="text-neutral-200 hover:text-white liquid-glass-pill px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{selectedTrade.asset} Spec</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">
                            Planned Profit ({tradeCalcs.tpPips} {tradeCalcs.unitLabel})
                          </span>
                          <span className="text-xs font-bold font-mono text-[#34D399] tabular-nums">
                            {tradeCalcs.estimatedProfit !== null
                              ? formatMoney(tradeCalcs.estimatedProfit, accountCurrency, true)
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">
                            Planned Risk ({tradeCalcs.slPips} {tradeCalcs.unitLabel})
                          </span>
                          <span className="text-xs font-bold font-mono text-[#F87171] tabular-nums">
                            {tradeCalcs.estimatedRisk !== null
                              ? formatMoney(-tradeCalcs.estimatedRisk, accountCurrency, true)
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Risk-to-Reward</span>
                          <span className="text-xs font-bold font-mono text-white tabular-nums">
                            {tradeCalcs.riskReward ? formatRiskReward(tradeCalcs.riskReward) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {tradeCalcs && tradeCalcs.status === 'missing_spec' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-amber-200">
                        Missing broker spec for {selectedTrade.asset}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSpecModalSymbol(selectedTrade.asset)}
                        className="px-3.5 py-1.5 rounded-full liquid-glass-primary text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        Configure Spec
                      </button>
                    </div>
                  )}

                  {tradeCalcs && tradeCalcs.status === 'invalid_prices' && tradeCalcs.errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-xs text-red-200">
                      {tradeCalcs.errors[0]}
                    </div>
                  )}

                  {/* Notes */}
                  {selectedTrade.notes && (
                    <div className="liquid-glass-subcard rounded-2xl p-3.5">
                      <span className="text-[11px] font-semibold text-neutral-400 block mb-1">Notes</span>
                      <p className="text-xs text-neutral-200 whitespace-pre-line leading-relaxed">
                        {selectedTrade.notes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {showCloseModal && (
        <CloseTradeModal
          trade={selectedTrade}
          onClose={() => setShowCloseModal(false)}
          onClosedSuccess={() => setShowCloseModal(false)}
        />
      )}
    </>
  );
};
