import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { InstrumentCategory, InstrumentSpec } from '../../types/trading';
import { X, Sliders, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InstrumentSpecModal: React.FC = () => {
  const {
    specModalSymbol,
    setSpecModalSymbol,
    instrumentSpecs,
    saveInstrumentSpec,
    deleteInstrumentSpec,
    activeAccount
  } = useTrading();

  const [symbol, setSymbol] = useState('');
  const [category, setCategory] = useState<InstrumentCategory>('Forex');
  const [contractSize, setContractSize] = useState('100000');
  const [tickSize, setTickSize] = useState('0.00001');
  const [pipSize, setPipSize] = useState('0.0001');
  const [quoteCurrency, setQuoteCurrency] = useState('USD');
  const [baseCurrency, setBaseCurrency] = useState('');
  const [tickValueProfit, setTickValueProfit] = useState('');
  const [tickValueLoss, setTickValueLoss] = useState('');
  const [tickValueCurrency, setTickValueCurrency] = useState<string>(activeAccount?.currency || 'USD');
  const [minLot, setMinLot] = useState('0.01');
  const [maxLot, setMaxLot] = useState('100');
  const [lotStep, setLotStep] = useState('0.01');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (specModalSymbol !== null) {
      const upper = specModalSymbol.toUpperCase().trim();
      const existing = upper ? instrumentSpecs[upper] : undefined;
      setErrorMsg(null);

      if (existing) {
        setSymbol(existing.symbol);
        setCategory(existing.category);
        setContractSize(existing.contractSize.toString());
        setTickSize(existing.tickSize.toString());
        setPipSize(existing.pipSize !== undefined ? existing.pipSize.toString() : '');
        setQuoteCurrency(existing.quoteCurrency);
        setBaseCurrency(existing.baseCurrency || '');
        setTickValueProfit(existing.tickValueProfit !== undefined ? existing.tickValueProfit.toString() : '');
        setTickValueLoss(existing.tickValueLoss !== undefined ? existing.tickValueLoss.toString() : '');
        setTickValueCurrency(existing.tickValueCurrency || activeAccount?.currency || 'USD');
        setMinLot(existing.minLot.toString());
        setMaxLot(existing.maxLot.toString());
        setLotStep(existing.lotStep.toString());
      } else {
        setSymbol(upper);
        setCategory('CFD');
        setContractSize('');
        setTickSize('');
        setPipSize('');
        setQuoteCurrency(upper.length === 6 ? upper.slice(3, 6) : 'USD');
        setBaseCurrency(upper.length === 6 ? upper.slice(0, 3) : '');
        setTickValueProfit('');
        setTickValueLoss('');
        setTickValueCurrency(activeAccount?.currency || 'USD');
        setMinLot('0.01');
        setMaxLot('100');
        setLotStep('0.01');
      }
    }
  }, [specModalSymbol, instrumentSpecs, activeAccount]);

  const applyTemplate = (kind: 'fx' | 'jpy' | 'gold' | 'silver' | 'index') => {
    setErrorMsg(null);
    if (kind === 'fx') {
      setCategory('Forex');
      setContractSize('100000');
      setTickSize('0.00001');
      setPipSize('0.0001');
      setMinLot('0.01');
      setMaxLot('100');
      setLotStep('0.01');
    } else if (kind === 'jpy') {
      setCategory('Forex');
      setContractSize('100000');
      setTickSize('0.001');
      setPipSize('0.01');
      setQuoteCurrency('JPY');
      setMinLot('0.01');
      setMaxLot('100');
      setLotStep('0.01');
    } else if (kind === 'gold') {
      setCategory('Metal');
      setContractSize('100');
      setTickSize('0.01');
      setPipSize('0.1');
      setQuoteCurrency('USD');
      setMinLot('0.01');
      setMaxLot('50');
      setLotStep('0.01');
    } else if (kind === 'silver') {
      setCategory('Metal');
      setContractSize('5000');
      setTickSize('0.001');
      setPipSize('0.01');
      setQuoteCurrency('USD');
      setMinLot('0.01');
      setMaxLot('50');
      setLotStep('0.01');
    } else if (kind === 'index') {
      setCategory('Index');
      setContractSize('1');
      setTickSize('0.01');
      setPipSize('');
      setQuoteCurrency('USD');
      setMinLot('0.01');
      setMaxLot('500');
      setLotStep('0.01');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedContract = parseFloat(contractSize);
    const parsedTick = parseFloat(tickSize);
    const parsedPip = pipSize.trim() ? parseFloat(pipSize) : undefined;
    const parsedTickProfit = tickValueProfit.trim() ? parseFloat(tickValueProfit) : undefined;
    const parsedTickLoss = tickValueLoss.trim() ? parseFloat(tickValueLoss) : undefined;
    const parsedMin = parseFloat(minLot) || 0.01;
    const parsedMax = parseFloat(maxLot) || 100;
    const parsedStep = parseFloat(lotStep) || 0.01;

    if (!symbol.trim()) {
      setErrorMsg('Symbol name is required.');
      return;
    }
    if (isNaN(parsedContract) || parsedContract <= 0) {
      setErrorMsg('Contract size must be a positive number.');
      return;
    }
    if (isNaN(parsedTick) || parsedTick <= 0) {
      setErrorMsg('Tick size must be a positive number.');
      return;
    }
    if (!quoteCurrency.trim()) {
      setErrorMsg('Quote currency is required (e.g. USD, JPY, EUR).');
      return;
    }

    const spec: InstrumentSpec = {
      symbol: symbol.toUpperCase().trim(),
      category,
      contractSize: parsedContract,
      tickSize: parsedTick,
      pipSize: parsedPip && parsedPip > 0 ? parsedPip : undefined,
      quoteCurrency: quoteCurrency.toUpperCase().trim(),
      baseCurrency: baseCurrency.trim() ? baseCurrency.toUpperCase().trim() : undefined,
      tickValueProfit: parsedTickProfit && parsedTickProfit > 0 ? parsedTickProfit : undefined,
      tickValueLoss: parsedTickLoss && parsedTickLoss > 0 ? parsedTickLoss : undefined,
      tickValueCurrency: (parsedTickProfit || parsedTickLoss) ? tickValueCurrency.toUpperCase().trim() : undefined,
      minLot: parsedMin,
      maxLot: parsedMax,
      lotStep: parsedStep
    };

    setIsSaving(true);
    try {
      await saveInstrumentSpec(spec);
      setSpecModalSymbol(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save instrument specification.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const clean = symbol.toUpperCase().trim();
    if (!clean || !instrumentSpecs[clean]) return;
    setIsSaving(true);
    try {
      await deleteInstrumentSpec(clean);
      setSpecModalSymbol(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete specification.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {specModalSymbol !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !isSaving && setSpecModalSymbol(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="liquid-glass-surface rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Broker Instrument Specification</h3>
                  <p className="text-[11px] text-neutral-400">Saved to Firestore for exact calculations</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {instrumentSpecs[symbol.toUpperCase().trim()] && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleDelete}
                    title="Delete specification"
                    className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-[#F87171] cursor-pointer flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setSpecModalSymbol(null)}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-full liquid-glass-pill text-neutral-300 hover:text-white cursor-pointer flex items-center justify-center"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Quick Fill Templates */}
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                  Pre-fill Standard Broker Template (Verify with your broker):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => applyTemplate('fx')} className="px-3 py-1 rounded-full liquid-glass-pill text-[11px] text-neutral-200 cursor-pointer">
                    FX 5-Digit
                  </button>
                  <button type="button" onClick={() => applyTemplate('jpy')} className="px-3 py-1 rounded-full liquid-glass-pill text-[11px] text-neutral-200 cursor-pointer">
                    JPY 3-Digit
                  </button>
                  <button type="button" onClick={() => applyTemplate('gold')} className="px-3 py-1 rounded-full liquid-glass-pill text-[11px] text-neutral-200 cursor-pointer">
                    Gold (100 oz)
                  </button>
                  <button type="button" onClick={() => applyTemplate('silver')} className="px-3 py-1 rounded-full liquid-glass-pill text-[11px] text-neutral-200 cursor-pointer">
                    Silver (5000 oz)
                  </button>
                  <button type="button" onClick={() => applyTemplate('index')} className="px-3 py-1 rounded-full liquid-glass-pill text-[11px] text-neutral-200 cursor-pointer">
                    Index / CFD (1x)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Symbol *</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g. US30"
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InstrumentCategory)}
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs text-white cursor-pointer"
                  >
                    <option value="Forex" className="bg-[#18191D] text-white">Forex</option>
                    <option value="Metal" className="bg-[#18191D] text-white">Metal</option>
                    <option value="Index" className="bg-[#18191D] text-white">Index</option>
                    <option value="Crypto" className="bg-[#18191D] text-white">Crypto</option>
                    <option value="CFD" className="bg-[#18191D] text-white">CFD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Contract Size *</label>
                  <input
                    type="number"
                    step="any"
                    value={contractSize}
                    onChange={(e) => setContractSize(e.target.value)}
                    placeholder="100000"
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Tick Size *</label>
                  <input
                    type="number"
                    step="any"
                    value={tickSize}
                    onChange={(e) => setTickSize(e.target.value)}
                    placeholder="0.00001"
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Pip Size</label>
                  <input
                    type="number"
                    step="any"
                    value={pipSize}
                    onChange={(e) => setPipSize(e.target.value)}
                    placeholder="0.0001"
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Quote Currency *</label>
                  <input
                    type="text"
                    value={quoteCurrency}
                    onChange={(e) => setQuoteCurrency(e.target.value)}
                    placeholder="USD, JPY, EUR..."
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Base Currency (FX)</label>
                  <input
                    type="text"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    placeholder="e.g. USD for USDJPY"
                    className="w-full liquid-glass-input rounded-2xl px-3.5 py-2 text-xs font-mono text-white uppercase"
                  />
                </div>
              </div>

              {/* Broker Tick Values Override */}
              <div className="liquid-glass-subcard rounded-2xl p-3.5 space-y-2.5">
                <span className="text-[11px] font-semibold text-neutral-300 block">
                  Broker Tick Values per 1.00 Lot (Optional — takes precedence if entered)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Tick Value (Profit)</label>
                    <input
                      type="number"
                      step="any"
                      value={tickValueProfit}
                      onChange={(e) => setTickValueProfit(e.target.value)}
                      placeholder="Optional"
                      className="w-full liquid-glass-input rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Tick Value (Loss)</label>
                    <input
                      type="number"
                      step="any"
                      value={tickValueLoss}
                      onChange={(e) => setTickValueLoss(e.target.value)}
                      placeholder="Optional"
                      className="w-full liquid-glass-input rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Tick Currency</label>
                    <input
                      type="text"
                      value={tickValueCurrency}
                      onChange={(e) => setTickValueCurrency(e.target.value)}
                      placeholder="USD"
                      className="w-full liquid-glass-input rounded-xl px-2.5 py-2 text-xs font-mono text-white uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Lot Constraints */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Min Lot</label>
                  <input
                    type="number"
                    step="any"
                    value={minLot}
                    onChange={(e) => setMinLot(e.target.value)}
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Max Lot</label>
                  <input
                    type="number"
                    step="any"
                    value={maxLot}
                    onChange={(e) => setMaxLot(e.target.value)}
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Lot Step</label>
                  <input
                    type="number"
                    step="any"
                    value={lotStep}
                    onChange={(e) => setLotStep(e.target.value)}
                    required
                    className="w-full liquid-glass-input rounded-2xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setSpecModalSymbol(null)}
                  className="px-4 py-2.5 rounded-full liquid-glass-pill text-xs font-semibold text-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-full liquid-glass-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Specification</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
