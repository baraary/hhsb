import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '../types';
import {
  formatMoney,
  toPersianDigits,
  getMonthKey,
  formatMonthKeyReadable,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface MonthlyReportChartProps {
  transactions: Transaction[];
  selectedCardId: string;
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
  currencyUnit: string;
}

interface MonthBarItem {
  monthKey: string;
  label: string;
  totalExpense: number;
  totalIncome: number;
  txCount: number;
}

export const MonthlyReportChart: React.FC<MonthlyReportChartProps> = ({
  transactions,
  selectedCardId,
  selectedMonth,
  onSelectMonth,
  currencyUnit,
}) => {
  const monthlyData = useMemo<MonthBarItem[]>(() => {
    const filteredByCard =
      selectedCardId === 'all'
        ? transactions
        : transactions.filter((t) => t.cardId === selectedCardId);

    const map = new Map<
      string,
      { expense: number; income: number; txCount: number }
    >();

    for (const tx of filteredByCard) {
      const mKey = getMonthKey(tx.jalaliDate);
      const curr = map.get(mKey) || { expense: 0, income: 0, txCount: 0 };
      if (tx.type === 'expense') {
        curr.expense += tx.amount;
        curr.txCount += 1;
      } else {
        curr.income += tx.amount;
      }
      map.set(mKey, curr);
    }

    // Sort chronologically ascending (oldest -> newest) so the trend flows naturally
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, val]) => ({
        monthKey,
        label: formatMonthKeyReadable(monthKey),
        totalExpense: val.expense,
        totalIncome: val.income,
        txCount: val.txCount,
      }));
  }, [transactions, selectedCardId]);

  const maxExpense = useMemo(() => {
    if (monthlyData.length === 0) return 1;
    return Math.max(...monthlyData.map((m) => m.totalExpense), 1);
  }, [monthlyData]);

  const averageMonthlyExpense = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const sum = monthlyData.reduce((acc, m) => acc + m.totalExpense, 0);
    return Math.round(sum / monthlyData.length);
  }, [monthlyData]);

  const highestMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => b.totalExpense - a.totalExpense)[0];
  }, [monthlyData]);

  const lastTwoMonthsChange = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const latest = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    if (prev.totalExpense <= 0) return null;
    const diff = latest.totalExpense - prev.totalExpense;
    const pct = Math.round((diff / prev.totalExpense) * 100);
    return { diff, pct, latestLabel: latest.label, prevLabel: prev.label };
  }, [monthlyData]);

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
      {/* Header & Summary Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <CircularIcon name="bar-chart" size="md" color="#0ea5e9" />
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              گزارش ماهانه و مقایسه روند هزینه‌ها
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              مقایسه جمع مخارج هر ماه با نمودار میله‌ای (با کلیک روی هر ستون، آمار همان ماه فیلتر می‌شود)
            </p>
          </div>
        </div>

        {monthlyData.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                میانگین خرج ماهانه
              </span>
              <span className="font-black text-slate-900 dark:text-white tabular-nums">
                {formatMoney(averageMonthlyExpense, true, currencyUnit)}
              </span>
            </div>

            {highestMonth && (
              <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  پرخرج‌ترین ماه ({highestMonth.label})
                </span>
                <span className="font-black text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatMoney(highestMonth.totalExpense, true, currencyUnit)}
                </span>
              </div>
            )}

            {lastTwoMonthsChange && (
              <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1.5">
                {lastTwoMonthsChange.diff > 0 ? (
                  <TrendingUp size={15} className="text-rose-500 shrink-0" />
                ) : (
                  <TrendingDown size={15} className="text-emerald-500 shrink-0" />
                )}
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    تغییر نسبت به ماه قبل
                  </span>
                  <span
                    className={`font-black tabular-nums ${
                      lastTwoMonthsChange.diff > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {lastTwoMonthsChange.diff > 0 ? '+' : ''}
                    {toPersianDigits(lastTwoMonthsChange.pct)}٪
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simple Bar Chart Area */}
      {monthlyData.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400">
          هنوز تراکنش هزینه‌ای برای نمایش نمودار گزارش ماهانه ثبت نشده است.
        </div>
      ) : (
        <div
          data-no-swipe="true"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="overflow-x-auto pb-2 touch-pan-x"
        >
          <div className="min-w-[300px] flex items-end justify-start sm:justify-around gap-4 sm:gap-6 pt-6 px-2">
            {monthlyData.map((item) => {
              const heightPercent = Math.max(
                10,
                Math.round((item.totalExpense / maxExpense) * 100)
              );
              const isSelected = selectedMonth === item.monthKey;
              const isHighest =
                highestMonth?.monthKey === item.monthKey && monthlyData.length > 1;

              return (
                <button
                  key={item.monthKey}
                  type="button"
                  onClick={() =>
                    onSelectMonth(
                      selectedMonth === item.monthKey ? 'all' : item.monthKey
                    )
                  }
                  className="group flex flex-col items-center flex-1 min-w-[76px] max-w-[120px] cursor-pointer focus:outline-none"
                >
                  {/* Amount Label Above Bar */}
                  <span
                    className={`text-[11px] font-extrabold tabular-nums mb-1.5 transition-colors ${
                      isSelected
                        ? 'theme-text scale-105'
                        : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}
                  >
                    {formatMoney(item.totalExpense)}
                  </span>

                  {/* Vertical Bar Track */}
                  <div className="w-full h-40 sm:h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1.5 flex items-end justify-center relative overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                    <div
                      className={`w-full rounded-xl transition-all duration-500 ${
                        isSelected
                          ? 'theme-gradient shadow-md'
                          : isHighest
                          ? 'bg-rose-500/85 dark:bg-rose-500/80'
                          : 'theme-bg opacity-80 group-hover:opacity-100'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Month Name & Tx Count Below Bar */}
                  <span
                    className={`mt-2 text-xs font-extrabold whitespace-nowrap ${
                      isSelected
                        ? 'theme-text underline underline-offset-4'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                    {toPersianDigits(item.txCount)} هزینه
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
