import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Plus, Check, Trash2, X, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_RULES = [
  'Never trade without a Stop Loss',
  'Risk maximum 1% to 2% of capital per trade',
  'Walk away after 2 consecutive losses',
  'Max 2 trades per day or trading session',
  'No trading 30m before high-impact news',
  'Wait for the 15m or 1h candle close',
  'Lock partial profit at 1:2 Risk to Reward',
  'Stick to the trading plan; no revenge trades'
];

export const JournalView: React.FC = () => {
  const { 
    journalEntries, 
    addJournalEntry, 
    deleteJournalEntry, 
    rules, 
    addRule, 
    toggleRule, 
    deleteRule,
    selectedCalendarDate
  } = useTrading();

  const [tab, setTab] = useState<'notes' | 'rules'>('notes');

  // New Note Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(selectedCalendarDate || '2026-11-11');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [emotions, setEmotions] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [lessons, setLessons] = useState('');

  // New Rule Modal & Inline input
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [modalRuleText, setModalRuleText] = useState('');
  const [newRuleText, setNewRuleText] = useState('');
  const [ruleSuccessToast, setRuleSuccessToast] = useState<string | null>(null);

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

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addJournalEntry({
      date,
      title: title.trim(),
      notes: notes.trim(),
      emotions: emotions.trim() || undefined,
      mistakes: mistakes.trim() || undefined,
      lessons: lessons.trim() || undefined
    });

    setTitle('');
    setNotes('');
    setEmotions('');
    setMistakes('');
    setLessons('');
    setIsModalOpen(false);
  };

  // Central rule submission helper
  const handleAddRuleAction = async (ruleText: string) => {
    const text = ruleText.trim();
    if (!text) {
      // If empty, open rule creation modal
      setIsRuleModalOpen(true);
      return;
    }

    try {
      await addRule(text);
      setNewRuleText('');
      setModalRuleText('');
      setIsRuleModalOpen(false);
      setRuleSuccessToast(`Rule added: "${text.length > 28 ? text.slice(0, 28) + '...' : text}"`);
      setTimeout(() => setRuleSuccessToast(null), 3000);
    } catch (err: any) {
      console.warn('Error adding rule:', err);
    }
  };

  const handleInlineRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddRuleAction(newRuleText);
  };

  const handleModalRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddRuleAction(modalRuleText);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {ruleSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-neutral-950 text-white rounded-2xl text-xs font-semibold shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{ruleSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Sub-Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs">
          <motion.button
            whileTap={{ scale: 0.93 }}
            transition={springButton}
            onClick={() => setTab('notes')}
            className={`px-3.5 py-1.5 rounded-full transition-colors font-semibold cursor-pointer ${
              tab === 'notes' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Reflections
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            transition={springButton}
            onClick={() => setTab('rules')}
            className={`px-3.5 py-1.5 rounded-full transition-colors font-semibold cursor-pointer ${
              tab === 'rules' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Rules ({rules.filter(r => r.isActive).length})
          </motion.button>
        </div>

        {/* Action Button: Dynamic depending on active tab */}
        {tab === 'notes' ? (
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={springButton}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Note</span>
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={springButton}
            onClick={() => setIsRuleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Rule</span>
          </motion.button>
        )}
      </div>

      {/* TAB 1: DAILY REFLECTIONS */}
      {tab === 'notes' && (
        <div className="space-y-3.5">
          {journalEntries.length > 0 ? (
            journalEntries.map(entry => (
              <motion.div 
                key={entry.id} 
                whileHover={{ y: -1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] rounded-3xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-neutral-400 block">{entry.date}</span>
                    <h3 className="text-base font-bold text-neutral-950 mt-0.5">{entry.title}</h3>
                  </div>
                  <button
                    onClick={() => deleteJournalEntry(entry.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                  {entry.notes}
                </p>

                {(entry.emotions || entry.mistakes || entry.lessons) && (
                  <div className="pt-3 border-t border-neutral-100 grid grid-cols-1 gap-1.5 text-[11px]">
                    {entry.emotions && (
                      <div className="text-neutral-600 font-medium">
                        <span className="font-semibold text-neutral-400 uppercase text-[10px]">Emotions:</span> {entry.emotions}
                      </div>
                    )}
                    {entry.mistakes && (
                      <div className="text-rose-700 font-medium">
                        <span className="font-semibold text-rose-400 uppercase text-[10px]">Mistakes:</span> {entry.mistakes}
                      </div>
                    )}
                    {entry.lessons && (
                      <div className="text-emerald-700 font-medium">
                        <span className="font-semibold text-emerald-400 uppercase text-[10px]">Lesson:</span> {entry.lessons}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-xs font-medium text-neutral-500 bg-white/70 rounded-3xl border border-dashed border-neutral-300">
              No journal reflections yet. Tap &quot;New Note&quot; to write your first reflection.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRADING RULES */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500 font-medium">
              Your personal rules for managing risk, executing setups, and staying disciplined.
            </p>
          </div>

          {/* Rules List */}
          <div className="space-y-2.5">
            {rules.map(rule => (
              <motion.div 
                key={rule.id}
                whileTap={{ scale: 0.99 }}
                className="bg-white/90 border border-neutral-200/80 shadow-xs rounded-2xl p-3.5 flex items-center justify-between gap-3"
              >
                <div 
                  onClick={() => toggleRule(rule.id)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <motion.div 
                    whileTap={{ scale: 0.88 }}
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      rule.isActive
                        ? 'bg-neutral-950 border-neutral-950 text-white'
                        : 'border-neutral-300 bg-transparent'
                    }`}
                  >
                    {rule.isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </motion.div>
                  <span className={`text-xs font-medium ${rule.isActive ? 'text-neutral-900 font-semibold' : 'text-neutral-400 line-through'}`}>
                    {rule.text}
                  </span>
                </div>

                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Quick-Add Rule Form */}
          <form onSubmit={handleInlineRuleSubmit} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newRuleText}
              onChange={(e) => setNewRuleText(e.target.value)}
              placeholder="Type a new rule (or tap Add Rule for presets)..."
              className="flex-1 bg-white border border-neutral-200 rounded-full px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black shadow-xs font-medium"
            />
            <motion.button
              type="button"
              onClick={() => handleAddRuleAction(newRuleText)}
              whileTap={{ scale: 0.94 }}
              transition={springButton}
              className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full transition-colors cursor-pointer shadow-sm shrink-0"
            >
              Add Rule
            </motion.button>
          </form>

          {/* Preset Suggestions Quick Bar */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2 font-mono">
              SUGGESTED DISCIPLINE PRESETS
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_RULES.slice(0, 4).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddRuleAction(preset)}
                  className="text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3 text-neutral-500" />
                  <span>{preset}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED NEW TRADING RULE MODAL */}
      <AnimatePresence>
        {isRuleModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsRuleModalOpen(false)}
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
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-neutral-950 text-white flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-950 font-mono">Add Trading Rule</h3>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setIsRuleModalOpen(false)} 
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-950 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <form onSubmit={handleModalRuleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    RULE DESCRIPTION *
                  </label>
                  <input
                    type="text"
                    value={modalRuleText}
                    onChange={(e) => setModalRuleText(e.target.value)}
                    placeholder="e.g. Risk max 1% per trade setup"
                    autoFocus
                    required
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-950 focus:outline-none focus:border-black font-medium"
                  />
                </div>

                {/* Popular Presets */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-2 font-mono uppercase">
                    OR CHOOSE A POPULAR PRESET
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {PRESET_RULES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setModalRuleText(preset)}
                        className={`w-full text-left text-xs p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          modalRuleText === preset
                            ? 'bg-neutral-950 text-white border-neutral-950 font-semibold shadow-xs'
                            : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
                        }`}
                      >
                        <span>{preset}</span>
                        {modalRuleText === preset && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2.5 border-t border-neutral-100">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={springButton}
                    onClick={() => setIsRuleModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    transition={springButton}
                    className="px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm cursor-pointer"
                  >
                    Add Rule
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW NOTE MODAL WITH SPRING TRANSITIONS */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
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
                <h3 className="text-base font-bold text-neutral-950 font-mono">New Journal Reflection</h3>
                <motion.button 
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setIsModalOpen(false)} 
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-950 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">DATE</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 font-mono focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">HEADLINE *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Disciplined execution on Gold"
                    required
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">ANALYSIS & NOTES</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="What happened in the market? How did you execute?"
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 resize-none focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">EMOTIONS</label>
                  <input
                    type="text"
                    value={emotions}
                    onChange={(e) => setEmotions(e.target.value)}
                    placeholder="e.g. Calm, patient, hesitant"
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">LESSONS / MISTAKES</label>
                  <input
                    type="text"
                    value={lessons}
                    onChange={(e) => setLessons(e.target.value)}
                    placeholder="e.g. Waited for 15m candle close"
                    className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-2xl px-3.5 py-2 text-xs text-neutral-950 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={springButton}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    transition={springButton}
                    className="px-5 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm cursor-pointer"
                  >
                    Save Reflection
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
