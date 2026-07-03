import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { loadPromotionalActivities, loadDailyQuests, loadArticles } from '../data/loaders';
import { PromotionalActivity, DailyQuest, Article } from '../types/db';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { RewardList } from '../components/RewardList';
import { CalendarDays, Clock, Server, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';

interface EventStatus {
  promo: PromotionalActivity;
  typeLabel: string;
  scheduleDetails: string;
}

export const CalendarPage: React.FC = () => {
  const [promos, setPromos] = useState<PromotionalActivity[]>([]);
  const [dailies, setDailies] = useState<DailyQuest[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar States
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default to July 2026 (matching system timestamp)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 6, 1));
  const [serverOpenDateStr, setServerOpenDateStr] = useState<string>('2026-06-24'); // Default to 7 days before selectedDate

  const serverOpenDate = useMemo(() => {
    return new Date(serverOpenDateStr);
  }, [serverOpenDateStr]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [promosRes, dailiesRes, articlesRes] = await Promise.all([
        loadPromotionalActivities(),
        loadDailyQuests(),
        loadArticles()
      ]);
      setPromos(promosRes.rows);
      setDailies(dailiesRes.rows);
      setArticles(articlesRes.rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load database logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Shift Sunday (0) to end (7) to represent Mon-Sun
  const shiftedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const calendarDays = useMemo(() => {
    const arr = [];
    // Padding days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = shiftedFirstDay - 1; i >= 0; i--) {
      arr.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }
    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    // Padding days for next month to make grid a multiple of 7
    const remaining = 42 - arr.length;
    for (let i = 1; i <= remaining; i++) {
      arr.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    return arr;
  }, [year, month, shiftedFirstDay, daysInMonth]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to determine if a promotional activity is active on a given date
  const getActiveEventsForDate = useCallback((date: Date): EventStatus[] => {
    const list: EventStatus[] = [];

    // Reset date hours for comparison
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const targetTime = targetDate.getTime();

    // Calculate server age relative day (day 1 starts on serverOpenDate)
    const diffTime = targetTime - new Date(serverOpenDate.getFullYear(), serverOpenDate.getMonth(), serverOpenDate.getDate()).getTime();
    const serverDay = Math.floor(diffTime / (86400000)) + 1;

    // Day of the week (1 = Mon, 7 = Sun)
    let dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    for (const promo of promos) {
      const startArr = Array.isArray(promo.start_time) ? promo.start_time : [];
      const endArr = Array.isArray(promo.end_time) ? promo.end_time : [];

      if (promo.time_type === 1) {
        // TYPE_TIME_DAY: Server open relative days
        const startDay = startArr[0] || 1;
        const endDay = endArr[0] || 999;
        if (serverDay >= startDay && serverDay <= endDay) {
          list.push({
            promo,
            typeLabel: "Server Age Relative",
            scheduleDetails: `Runs on Server Days ${startDay} to ${endDay} (Today is Day ${serverDay})`
          });
        }
      } else if (promo.time_type === 2) {
        // TYPE_TIME_WEEK: Weekly recurring day range
        const startDay = startArr[0] || 1;
        const endDay = endArr[0] || 7;
        if (dayOfWeek >= startDay && dayOfWeek <= endDay) {
          list.push({
            promo,
            typeLabel: "Weekly Recurring",
            scheduleDetails: `Active weekly between Monday (1) and Sunday (7): Day ${startDay} to ${endDay}`
          });
        }
      } else if (promo.time_type === 3) {
        // TYPE_TIME_DATE: Absolute dates
        // Parse arrays [Y, M, D, h, m, s]
        const startY = startArr[0] || year;
        const startM = startArr[1] ? startArr[1] - 1 : month;
        const startD = startArr[2] || 1;
        const endY = endArr[0] || year;
        const endM = endArr[1] ? endArr[1] - 1 : month;
        const endD = endArr[2] || 28;

        const startTime = new Date(startY, startM, startD).getTime();
        const endTime = new Date(endY, endM, endD, 23, 59, 59).getTime();

        if (targetTime >= startTime && targetTime <= endTime) {
          list.push({
            promo,
            typeLabel: "Fixed Calendar Dates",
            scheduleDetails: `Active from ${startY}-${startM + 1}-${startD} to ${endY}-${endM + 1}-${endD}`
          });
        }
      } else if (promo.time_type === 5) {
        // TYPE_TIME_CYCLE: Cyclic event repeats (start_time represents cycle trigger date)
        const startY = startArr[0] || 2026;
        const startM = startArr[1] ? startArr[1] - 1 : 0;
        const startD = startArr[2] || 1;
        
        const triggerTime = new Date(startY, startM, startD).getTime();
        const durationDays = endArr[0] || 1;
        const cooldownDays = endArr[1] || 0;
        const cycleDays = durationDays + cooldownDays;

        const diffCycle = targetTime - triggerTime;
        if (diffCycle >= 0) {
          const daysSinceTrigger = Math.floor(diffCycle / 86400000);
          const dayInCycle = daysSinceTrigger % cycleDays;
          if (dayInCycle < durationDays) {
            list.push({
              promo,
              typeLabel: "Cyclic Repeating",
              scheduleDetails: `Cycle started ${startY}-${startM+1}-${startD}: Active for ${durationDays} days every ${cycleDays} days`
            });
          }
        }
      }
    }

    return list;
  }, [promos, serverOpenDate, year, month]);

  const activeEventsOnSelectedDate = useMemo(() => {
    return getActiveEventsForDate(selectedDate);
  }, [selectedDate, getActiveEventsForDate]);

  if (loading) return <LoadingState message="Connecting to simulation engine and calendar databases..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-fuchsia-900 via-purple-950 to-zinc-950 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3 max-w-xl">
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded bg-surface/15 text-fuchsia-200 tracking-wider">
            Live Simulator
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Campaign & Event Scheduler</h1>
          <p className="text-subtle text-sm leading-relaxed">
            Simulate promotional activities and quest timings. Pick a server launch date to dynamically overlay server age schedules onto the real calendar layout.
          </p>
        </div>
        {/* Server launch date config */}
        <div className="p-4 bg-surface/5 border border-white/10 rounded-xl space-y-2 w-full md:w-auto text-xs">
          <label className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-fuchsia-300">
            <Server size={14} />
            <span>Server Launch Date</span>
          </label>
          <input
            type="date"
            value={serverOpenDateStr}
            onChange={(e) => setServerOpenDateStr(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-surface border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500 font-mono text-sm cursor-pointer"
          />
          <span className="text-[10px] text-subtle block italic">Updates server age relative calculations</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Side: Daily Quests & Recurring Routines */}
        <div className="space-y-6 xl:col-span-1 border border-border bg-surface p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-text dark:text-zinc-100 flex items-center gap-2 border-b border-border pb-3">
            <CalendarDays className="text-fuchsia-500" size={20} />
            <span>Daily Routines & Quests</span>
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Dailies reset every 24 hours. Points feed into daily progress rewards chests.
          </p>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {dailies.map((daily) => (
              <div
                key={daily.id}
                className="p-4 border border-border bg-bg/30 dark:bg-bg/20 rounded-xl space-y-3 hover:border-border-strong transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-text">{daily.task_name || `Daily Quest #${daily.id}`}</h3>
                    <span className="text-[10px] font-mono text-subtle">ID: {daily.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-750 dark:text-fuchsia-400 font-extrabold text-[10px] uppercase">
                    +{daily.point} Points
                  </span>
                </div>
                {daily.description && (
                  <p className="text-xs text-muted leading-relaxed italic border-l-2 border-fuchsia-500 pl-2">
                    "{daily.description}"
                  </p>
                )}
                {/* Rewards display */}
                {daily.rewards_json && (
                  <div className="pt-1.5 border-t border-border/60 space-y-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-subtle">Completion Rewards</span>
                    <RewardList rewardsJson={daily.rewards_json} articles={articles} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Event Calendar Simulator Grid */}
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-border bg-surface p-6 rounded-2xl shadow-sm space-y-6">
            {/* Month selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-fuchsia-500" size={20} />
                <h2 className="text-lg font-bold text-text dark:text-zinc-100">
                  {monthNames[month]} {year}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 border border-border hover:bg-hover rounded-lg cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 border border-border hover:bg-hover rounded-lg cursor-pointer"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Calendar grid headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-subtle">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Calendar grid body */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((item, idx) => {
                const dayEvents = getActiveEventsForDate(item.date);
                const isSelected = selectedDate.toDateString() === item.date.toDateString();
                
                // Calculate Server Day count for visual guide
                const dayDiff = item.date.getTime() - new Date(serverOpenDate.getFullYear(), serverOpenDate.getMonth(), serverOpenDate.getDate()).getTime();
                const currentServerDay = Math.floor(dayDiff / 86400000) + 1;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(item.date)}
                    className={`h-24 p-1.5 border rounded-xl flex flex-col justify-between items-start text-left transition-all relative ${
                      isSelected
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20 bg-fuchsia-500/5'
                        : 'border-border hover:border-border-strong bg-bg/10'
                    } ${!item.isCurrentMonth ? 'opacity-40' : ''} cursor-pointer`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-sm font-bold text-muted">
                        {item.date.getDate()}
                      </span>
                      {currentServerDay > 0 && (
                        <span className="text-[9px] font-mono font-bold text-fuchsia-500 dark:text-fuchsia-400 bg-fuchsia-100/50 dark:bg-fuchsia-950/40 px-1 rounded">
                          Day {currentServerDay}
                        </span>
                      )}
                    </div>
                    {/* Active event tags preview */}
                    <div className="space-y-1 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, eIdx) => (
                        <span
                          key={eIdx}
                          className="block text-[8px] font-semibold truncate rounded px-1 py-0.5 bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-800 dark:text-fuchsia-350 border border-fuchsia-200/20"
                          title={ev.promo.name || ''}
                        >
                          {ev.promo.name}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="block text-[8px] font-bold text-center text-subtle uppercase">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active events on selected date drawer */}
          <div className="p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <h3 className="font-bold text-text dark:text-zinc-100">
                  Active Promotions for {selectedDate.toLocaleDateString()}
                </h3>
                <p className="text-xs text-muted">
                  Calculated using Server Open Date: {serverOpenDate.toLocaleDateString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-fuchsia-600 text-white rounded-xl text-xs font-bold font-mono">
                {activeEventsOnSelectedDate.length} Active Events
              </span>
            </div>

            {activeEventsOnSelectedDate.length === 0 ? (
              <div className="p-8 text-center text-subtle space-y-2">
                <HelpCircle size={36} className="mx-auto text-subtle" />
                <p className="text-sm font-semibold">No active promotional events simulated on this day.</p>
                <p className="text-xs text-subtle">Recurring weekly cycles or server-relative timelines might start on other dates.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEventsOnSelectedDate.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border bg-bg/40 dark:bg-bg/20 rounded-xl space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-surface-raised text-[9px] font-bold font-mono text-muted">
                          ID: {item.promo.id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-750 dark:text-fuchsia-400 font-extrabold text-[9px] uppercase">
                          {item.typeLabel}
                        </span>
                      </div>
                      <Link
                        to={`/promotions/${item.promo.id}`}
                        className="block font-bold text-sm text-text dark:text-zinc-100 hover:text-fuchsia-600 transition-colors"
                      >
                        {item.promo.name || `Promotion #${item.promo.id}`}
                      </Link>
                    </div>
                    
                    <div className="text-[11px] text-muted bg-bg/50 dark:bg-bg p-2 rounded flex items-start gap-1.5 border border-border/40 border-border">
                      <Clock size={12} className="mt-0.5 text-subtle shrink-0" />
                      <span>{item.scheduleDetails}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
