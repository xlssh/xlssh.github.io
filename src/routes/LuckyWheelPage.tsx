import React, { useEffect, useState, useMemo } from 'react';
import { loadHdBigTurntables, loadHdJigsaws, loadBleachJigsaws, loadArticles } from '../data/loaders';
import { HdBigTurntable, HdJigsaw, BleachJigsaw, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Coins, HelpCircle, RefreshCw, ShoppingBag, Gift, Award, Compass, Sparkles } from 'lucide-react';

export const LuckyWheelPage: React.FC = () => {
  const [turntables, setTurntables] = useState<HdBigTurntable[]>([]);
  const [jigsaws, setJigsaws] = useState<HdJigsaw[]>([]);
  const [bleachJigsaws, setBleachJigsaws] = useState<BleachJigsaw[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'turntable' | 'jigsaw' | 'bleach_jigsaw'>('turntable');

  // Turntable Simulator States
  const [selectedTurntableId, setSelectedTurntableId] = useState<number | null>(null);
  const [selectedWheelKey, setSelectedWheelKey] = useState<string>('lucky_lottery_outter_award');
  const [spinCount, setSpinCount] = useState<number>(10);
  const [simResults, setSimResults] = useState<{ item: string; code: number; amount: number; count: number }[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ttRes, jsRes, bjsRes, articlesRes] = await Promise.all([
        loadHdBigTurntables(),
        loadHdJigsaws(),
        loadBleachJigsaws(),
        loadArticles()
      ]);
      setTurntables(ttRes.rows);
      setJigsaws(jsRes.rows);
      setBleachJigsaws(bjsRes.rows);
      setArticles(articlesRes.rows);

      if (ttRes.rows.length > 0) {
        setSelectedTurntableId(ttRes.rows[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Lucky Wheel events databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const articlesMap = useMemo(() => {
    const map = new Map<number, string>();
    articles.forEach(a => {
      map.set(a.id, a.name || `Item #${a.id}`);
    });
    return map;
  }, [articles]);

  const selectedTurntable = useMemo(() => {
    return turntables.find(t => t.id === selectedTurntableId) || null;
  }, [turntables, selectedTurntableId]);

  // Current active pool of items for simulation
  const currentWheelPool = useMemo(() => {
    if (!selectedTurntable) return [];
    const pool = (selectedTurntable as any)[selectedWheelKey];
    return Array.isArray(pool) ? pool : [];
  }, [selectedTurntable, selectedWheelKey]);

  const handleSimulateSpins = () => {
    if (currentWheelPool.length === 0) return;
    setIsSpinning(true);
    
    setTimeout(() => {
      const resultsMap = new Map<number, { item: string; amount: number; count: number }>();
      
      for (let i = 0; i < spinCount; i++) {
        // Equal probability spin
        const randomItem = currentWheelPool[Math.floor(Math.random() * currentWheelPool.length)];
        const code = randomItem.code;
        const amount = randomItem.amount || 1;
        const name = articlesMap.get(code) || `Item #${code}`;
        
        const existing = resultsMap.get(code);
        if (existing) {
          existing.count += 1;
        } else {
          resultsMap.set(code, { item: name, amount, count: 1 });
        }
      }

      const formatted = Array.from(resultsMap.entries()).map(([code, details]) => ({
        code,
        item: details.item,
        amount: details.amount,
        count: details.count
      })).sort((a, b) => b.count - a.count);

      setSimResults(formatted);
      setIsSpinning(false);
    }, 600);
  };

  const getWheelTitleLabel = (key: string) => {
    switch (key) {
      case 'lucky_lottery_outter_award': return 'Lucky Outer Wheel (Online Time Draw)';
      case 'lucky_lottery_inner_award': return 'Lucky Inner Wheel (Lucky Points Draw)';
      case 'gold_lottery_outter_award': return 'Gold Outer Wheel (Gold Coin Draw)';
      case 'gold_lottery_inner_award': return 'Gold Inner Wheel (Gold Value Draw)';
      default: return 'Lottery Wheel Pool';
    }
  };

  if (loading) return <LoadingState message="Connecting to turntable prize wheels and decoding jigsaw puzzle tables..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl border border-border bg-surface shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-fuchsia-600 dark:text-fuchsia-400">
            <Coins size={24} />
            <span className="text-xs font-bold uppercase tracking-wider bg-fuchsia-100 dark:bg-fuchsia-950/40 px-2.5 py-0.5 rounded">Gacha & Mini-Games</span>
          </div>
          <h1 className="text-3xl font-black text-text">Lucky Wheel & Jigsaw Event Simulator</h1>
          <p className="text-xs text-muted max-w-xl">
            Simulate limited-time lucky turntables, audit item drop weights, and review puzzle pieces costs.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-border flex gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('turntable')}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${
            activeTab === 'turntable'
              ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-450'
              : 'border-transparent text-subtle hover:text-text dark:hover:text-zinc-200'
          }`}
        >
          Lucky Turntable Wheel
        </button>
        <button
          onClick={() => setActiveTab('jigsaw')}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${
            activeTab === 'jigsaw'
              ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-450'
              : 'border-transparent text-subtle hover:text-text dark:hover:text-zinc-200'
          }`}
        >
          Lucky Jigsaw Puzzle
        </button>
        <button
          onClick={() => setActiveTab('bleach_jigsaw')}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer ${
            activeTab === 'bleach_jigsaw'
              ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-450'
              : 'border-transparent text-subtle hover:text-text dark:hover:text-zinc-200'
          }`}
        >
          Premium Bleach Jigsaw
        </button>
      </div>

      {/* Tab 1: Turntable Simulator */}
      {activeTab === 'turntable' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Wheel Selector & Pool */}
          <div className="xl:col-span-1 border border-border bg-surface p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-text border-b border-border pb-2.5">
              Select Turntable & Pool
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase mb-1">Select Event Type</label>
                <select
                  value={selectedTurntableId || ''}
                  onChange={(e) => setSelectedTurntableId(parseInt(e.target.value))}
                  className="block w-full py-2 px-3 border border-border rounded-xl text-xs bg-bg focus:outline-none focus:ring-1.5 focus:ring-fuchsia-500 text-muted cursor-pointer"
                >
                  {turntables.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (ID: #{t.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase mb-1">Select Wheel Pool</label>
                <div className="flex flex-col gap-1.5">
                  {[
                    { key: 'lucky_lottery_outter_award', name: 'Lucky Outer Wheel' },
                    { key: 'lucky_lottery_inner_award', name: 'Lucky Inner Wheel' },
                    { key: 'gold_lottery_outter_award', name: 'Gold Outer Wheel' },
                    { key: 'gold_lottery_inner_award', name: 'Gold Inner Wheel' }
                  ].map((w) => (
                    <button
                      key={w.key}
                      onClick={() => {
                        setSelectedWheelKey(w.key);
                        setSimResults([]);
                      }}
                      className={`w-full py-2 px-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        selectedWheelKey === w.key
                          ? 'border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-400 font-semibold'
                          : 'border-border hover:bg-hover text-muted'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of items in current wheel */}
            <div className="pt-3 border-t border-border space-y-2">
              <span className="text-[10px] font-extrabold text-subtle uppercase tracking-wider block">Wheel Items List ({currentWheelPool.length} Slices)</span>
              <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                {currentWheelPool.map((item, idx) => (
                  <div key={idx} className="p-2 border border-border/60 bg-bg/20 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted truncate">
                      {articlesMap.get(item.code) || `Item #${item.code}`}
                    </span>
                    <span className="font-mono text-subtle text-[10px] shrink-0">x{item.amount || 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simulator Panel */}
          <div className="xl:col-span-2 space-y-6">
            {selectedTurntable && (
              <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
                <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-text">{selectedTurntable.name}</h2>
                    <span className="text-[10px] font-mono text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-wider">
                      {getWheelTitleLabel(selectedWheelKey)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted leading-relaxed italic bg-bg p-3 rounded-lg border border-border border-border">
                  {selectedTurntable.desc.split('\n')[0]}
                </p>

                {/* Spin controls */}
                <div className="p-5 border border-border bg-bg/10 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-subtle uppercase">Spins Count</label>
                    <div className="flex items-center gap-1.5">
                      {[10, 50, 100, 500].map(count => (
                        <button
                          key={count}
                          onClick={() => setSpinCount(count)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                            spinCount === count
                              ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                              : 'bg-surface border-border hover:bg-bg text-muted'
                          }`}
                        >
                          {count}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateSpins}
                    disabled={isSpinning || currentWheelPool.length === 0}
                    className="w-full md:w-auto px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <RefreshCw size={14} className={isSpinning ? 'animate-spin' : ''} />
                    <span>{isSpinning ? 'Spinning Wheel...' : `Simulate ${spinCount} Spins`}</span>
                  </button>
                </div>

                {/* Simulator Outcomes List */}
                {simResults.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold text-text uppercase tracking-wider">Simulation Drop Outcomes</h3>
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                      <div className="grid grid-cols-4 bg-bg p-3 font-bold text-subtle uppercase text-[10px]">
                        <span className="col-span-2">Item Name</span>
                        <span className="text-center">Count Pulled</span>
                        <span className="text-right">Drop Share</span>
                      </div>
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[250px] overflow-y-auto">
                        {simResults.map((res, idx) => {
                          const percentage = ((res.count / spinCount) * 100).toFixed(1);
                          return (
                            <div key={idx} className="grid grid-cols-4 p-3 hover:bg-hover/50 transition-all items-center">
                              <div className="col-span-2 flex flex-col">
                                <span className="font-bold text-text">{res.item}</span>
                                <span className="font-mono text-[9px] text-subtle">Code: #{res.code}</span>
                              </div>
                              <span className="text-center font-mono font-bold text-fuchsia-600 dark:text-fuchsia-400">
                                {res.count}x
                              </span>
                              <span className="text-right font-mono text-muted font-semibold">
                                {percentage}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Jigsaw Puzzle */}
      {activeTab === 'jigsaw' && (
        <div className="space-y-6">
          {jigsaws.map((js) => (
            <div key={js.id} className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
              <div className="border-b border-border pb-3 flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-text">{js.name}</h2>
                  <span className="text-[10px] text-subtle font-mono uppercase block">Jigsaw ID: #{js.id}</span>
                </div>
              </div>

              {js.desc && (
                <p className="text-xs text-muted leading-relaxed italic bg-bg p-3 rounded-lg border border-border border-border">
                  {js.desc}
                </p>
              )}

              {/* Grid: Buys & Exchange Awards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buys List */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase text-subtle tracking-wider flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-fuchsia-500" />
                    <span>Purchase Cost per piece</span>
                  </h3>
                  <div className="border border-border rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {Array.isArray(js.buys) ? js.buys.map((buy, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-hover/20">
                        <span className="font-semibold text-muted">Piece Index: #{buy.index ?? idx}</span>
                        <span className="font-mono text-muted font-bold">Cost: {buy.costChip?.[0]?.value ?? buy.value} Chips</span>
                      </div>
                    )) : <span className="p-3 text-subtle block italic">No purchase configuration.</span>}
                  </div>
                </div>

                {/* Awards List */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase text-subtle tracking-wider flex items-center gap-1.5">
                    <Gift size={14} className="text-indigo-500" />
                    <span>Trade-In Rewards</span>
                  </h3>
                  <div className="border border-border rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {Array.isArray(js.awards) ? js.awards.map((aw, idx) => {
                      const rewardCode = aw.award;
                      return (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-hover/20">
                          <span className="font-bold text-text">
                            {articlesMap.get(rewardCode) || `Reward Item #${rewardCode}`}
                          </span>
                          <span className="font-mono text-subtle text-[11px]">Exchange Index: {aw.index}</span>
                        </div>
                      );
                    }) : <span className="p-3 text-subtle block italic">No exchange rewards configuration.</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Bleach Jigsaw */}
      {activeTab === 'bleach_jigsaw' && (
        <div className="space-y-6">
          {bleachJigsaws.map((bjs) => (
            <div key={bjs.id} className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-6">
              <div className="border-b border-border pb-3 flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-text">{bjs.name}</h2>
                  <span className="text-[10px] text-subtle font-mono uppercase block">Bleach Jigsaw Event ID: #{bjs.id}</span>
                </div>
              </div>

              {bjs.desc && (
                <p className="text-xs text-muted leading-relaxed italic bg-bg p-3 rounded-lg border border-border border-border">
                  {bjs.desc}
                </p>
              )}

              {/* Items & Final Reward */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Items & Needs Cost */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase text-subtle tracking-wider flex items-center gap-1.5">
                    <Compass size={14} className="text-fuchsia-500" />
                    <span>Puzzle Pieces Requirements</span>
                  </h3>
                  <div className="border border-border rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {Array.isArray(bjs.needs) ? bjs.needs.map((needGroup, idx) => {
                      const firstNeed = needGroup[0];
                      const rewardCode = firstNeed?.Award;
                      return (
                        <div key={idx} className="p-4 space-y-2 hover:bg-hover/20">
                          <div className="flex justify-between font-semibold">
                            <span className="text-text">Button Index: #{firstNeed?.BtnIndex ?? idx}</span>
                            <span className="font-mono text-muted">{firstNeed?.Prompt || 'Puzzle Trade'}</span>
                          </div>
                          {needGroup.map((need: any, needIdx: number) => (
                            <div key={needIdx} className="pl-3 border-l-2 border-border text-muted text-[11px] flex justify-between">
                              <span>Piece #{need.NeedNum} requirement</span>
                              <span>Need Number: {need.NeedNum}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }) : <span className="p-3 text-subtle block italic">No requirements configuration.</span>}
                  </div>
                </div>

                {/* Final Exchange rewards */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase text-subtle tracking-wider flex items-center gap-1.5">
                    <Award size={14} className="text-indigo-500" />
                    <span>Grand Prizes List</span>
                  </h3>
                  <div className="border border-border rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {Array.isArray(bjs.final_award) ? bjs.final_award.map((aw: any, idx: number) => {
                      const rewardCode = aw.Award || aw;
                      return (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-hover/20">
                          <span className="font-bold text-text dark:text-zinc-250">
                            {articlesMap.get(rewardCode) || `Reward Item #${rewardCode}`}
                          </span>
                          <span className="font-mono text-subtle text-[10px]">Grand Prize #{idx + 1}</span>
                        </div>
                      );
                    }) : <span className="p-3 text-subtle block italic">No final awards configuration.</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
