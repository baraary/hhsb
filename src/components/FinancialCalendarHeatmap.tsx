import React, { useState, useMemo } from 'react';
import { Calendar, Clock, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { AppState } from '../types';
import {
  formatMoney,
  toPersianDigits,
  toEnglishDigits,
  formatMonthKeyReadable,
  formatJalaliReadable,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface FinancialCalendarHeatmapProps {
  state: AppState;
  monthKey: string; // e.g., "1403/08" or "all"
}

const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Simple deterministic day-of-week offset for a Jalali month start (0 = Shanbeh .. 6 = Jomeh)
 * Based on standard Jalali epoch calculation so calendar columns align naturally.
 */
function getJalaliMonthFirstWeekday(jy: number, jm: number): number {
  // Known anchor: 1403/01/01 was Chaharshanbeh (index 4 in Shanbeh=0..Jomeh=6)
  const isLeap = (y: number) => ((y + 38) * 31) % 128 < 31;
  let daysDiff = 0;
  if (jy >= 1403) {
    for (let y = 1403; y < jy; y++) {
      daysDiff += isLeap(y) ? 366 : 365;
    }
  } else {
    for (let y = jy; y < 1403; y++) {
      daysDiff -= isLeap(y) ? 366 : 365;
    }
  }
  for (let m = 1; m < jm; m++) {
    daysDiff += m <= 6 ? 31 : 30;
  }
  return ((4 + daysDiff) % 7 + 7) % 7;
}

function getJalaliMonthDaysCount(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const isLeap = ((jy + 38) * 31) % 128 < 31;
  return isLeap ? 30 : 29;
}

export const FinancialCalendarHeatmap: React.FC<FinancialCalendarHeatmapProps> = ({
  state,
  monthKey,
}) => {
  const { transactions, reminders = [], categories, cards, settings } = state;
  const isPrivacy = Boolean(settings.privacyMode);

  // Resolve target month ("YYYY/MM") — if monthKey is "all", pick latest month from transactions or 1404/01
  const resolvedMonthKey = useMemo(() => {
    if (monthKey && monthKey !== 'all' && monthKey.includes('/')) {
      return monthKey;
    }
    if (transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) =>
        b.jalaliDate.localeCompare(a.jalaliDate)
      );
      return sorted[0].jalaliDate.slice(0, 7);
    }
    return '1403/09';
  }, [monthKey, transactions]);

  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);

  const [jy, jm] = useMemo(() => {
    const parts = toEnglishDigits(resolvedMonthKey).split('/');
    return [parseInt(parts[0] || '1403', 10), parseInt(parts[1] || '8', 10)];
  }, [resolvedMonthKey]);

  const daysInMonth = getJalaliMonthDaysCount(jy, jm);
  const startWeekday = getJalaliMonthFirstWeekday(jy, jm);

  // Aggregate daily expenses, incomes, transfers, and reminders for this month
  const dailyStats = useMemo(() => {
    const map = new Map<
      number,
      {
        expense: number;
        income: number;
        transfer: number;
        txCount: number;
        dueRemindersCount: number;
      }
    >();

    for (let d = 1; d <= daysInMonth; d++) {
      map.set(d, {
        expense: 0,
        income: 0,
        transfer: 0,
        txCount: 0,
        dueRemindersCount: 0,
      });
    }

    for (const tx of transactions) {
      const cleanDate = toEnglishDigits(tx.jalaliDate || '');
      if (!cleanDate.startsWith(toEnglishDigits(resolvedMonthKey))) continue;
      const dayPart = parseInt(cleanDate.split('/')[2] || '0', 10);
      if (dayPart >= 1 && dayPart <= daysInMonth) {
        const entry = map.get(dayPart)!;
        entry.txCount += 1;
        if (tx.type === 'expense') entry.expense += tx.amount;
        else if (tx.type === 'income') entry.income += tx.amount;
        else if (tx.type === 'transfer') entry.transfer += tx.amount;
      }
    }

    for (const rem of reminders) {
      if (rem.isPaid) continue;
      const cleanDue = toEnglishDigits(rem.dueDate || '');
      if (cleanDue.startsWith(toEnglishDigits(resolvedMonthKey))) {
        const dayPart = parseInt(cleanDue.split('/')[2] || '0', 10);
        if (dayPart >= 1 && dayPart <= daysInMonth) {
          const entry = map.get(dayPart)!;
          entry.dueRemindersCount += 1;
        }
      }
    }

    return map;
  }, [transactions, reminders, resolvedMonthKey, daysInMonth]);

  const maxDailyExpense = useMemo(() => {
    let m = 0;
    dailyStats.forEach((v) => {
      if (v.expense > m) m = v.expense;
    });
    return m;
  }, [dailyStats]);

  const selectedDateFullStr =
    selectedDayNum !== null
      ? `${toEnglishDigits(resolvedMonthKey)}/${String(selectedDayNum).padStart(2, '0')}`
      : null;

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDateFullStr) return [];
    return transactions.filter(
      (t) => toEnglishDigits(t.jalaliDate) === selectedDateFullStr
    );
  }, [transactions, selectedDateFullStr]);

  const selectedDayReminders = useMemo(() => {
    if (!selectedDateFullStr) return [];
    return reminders.filter(
      (r) => !r.isPaid && toEnglishDigits(r.dueDate) === selectedDateFullStr
    );
  }, [reminders, selectedDateFullStr]);

  const getHeatCellClass = (exp: number, inc: number, txCount: number) => {
    if (txCount === 0) {
      return 'bg-slate-50/80 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800';
    }
    if (exp === 0 && inc > 0) {
      return 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40';
    }
    const ratio = maxDailyExpense > 0 ? exp / maxDailyExpense : 0;
    if (ratio > 0.65) {
      return 'bg-rose-500/25 dark:bg-rose-500/30 text-rose-900 dark:text-rose-100 border-rose-500/50 font-black';
    }
    if (ratio > 0.25) {
      return 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-900 dark:text-amber-100 border-amber-500/45 font-bold';
    }
    return 'bg-emerald-500/12 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500/30 font-bold';
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              تقویم مالی شمسی و نقشه حرارتی خرج‌ها ({formatMonthKeyReadable(resolvedMonthKey)})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              روزهای کم‌خرج (سبز)، پرخرج (نارنجی/قرمز) و سررسید اقساط — برای مشاهده ریز تراکنش روی هر روز کلیک کنید
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/40 border border-emerald-500" />
            کم‌خرج / واریز
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/40 border border-amber-500" />
            متوسط
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/50 border border-rose-500" />
            پرخرج‌ترین
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            سررسید قسط
          </span>
        </div>
      </div>

      {/* 7-Column Persian Calendar Grid */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS_SHORT.map((w) => (
            <div
              key={w}
              className="py-1 text-[11px] font-extrabold text-slate-400 dark:text-slate-500"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startWeekday }).map((_, idx) => (
            <div key={`empty_${idx}`} className="h-14 sm:h-16 rounded-2xl opacity-0" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
            const stat = dailyStats.get(dayNum)!;
            const isSelected = selectedDayNum === dayNum;
            const cellColor = getHeatCellClass(stat.expense, stat.income, stat.txCount);

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() =>
                  setSelectedDayNum(selectedDayNum === dayNum ? null : dayNum)
                }
                className={`h-14 sm:h-16 rounded-2xl border p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer relative ${cellColor} ${
                  isSelected ? 'ring-2 ring-slate-900 dark:ring-white scale-[1.03]' : ''
                }`}
              >
                {/* Top row: Day number + Installment indicator dot */}
                <div className="w-full flex items-center justify-between px-0.5">
                  <span className="text-xs sm:text-sm font-extrabold tabular-nums">
                    {toPersianDigits(dayNum)}
                  </span>
                  {stat.dueRemindersCount > 0 && (
                    <span
                      title={`${toPersianDigits(stat.dueRemindersCount)} سررسید قسط`}
                      className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                    />
                  )}
                </div>

                {/* Bottom row: Compact amount badge */}
                <div className="w-full text-center truncate tabular-nums">
                  {stat.expense > 0 ? (
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-rose-600 dark:text-rose-300 block truncate">
                      {isPrivacy
                        ? '•••'
                        : stat.expense >= 1_000_000
                        ? `${toPersianDigits((stat.expense / 1_000_000).toFixed(1))}M`
                        : `${toPersianDigits(Math.round(stat.expense / 1000))}k`}
                    </span>
                  ) : stat.income > 0 ? (
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300 block truncate">
                      {isPrivacy
                        ? '•••'
                        : `+${toPersianDigits(Math.round(stat.income / 1000))}k`}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400/60">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Drawer / Inspector */}
      {selectedDayNum !== null && selectedDateFullStr && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              ریز فعالیت‌های {formatJalaliReadable(selectedDateFullStr)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayNum(null)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              بستن
            </button>
          </div>

          {selectedDayReminders.length > 0 && (
            <div className="space-y-1.5">
              {selectedDayReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span className="font-extrabold text-amber-900 dark:text-amber-200">
                      سررسید قسط/تعهد: {rem.title}
                    </span>
                  </div>
                  <span className="font-black tabular-nums text-amber-700 dark:text-amber-300">
                    {isPrivacy ? '••••••' : formatMoney(rem.amount)} {settings.currencyUnit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {selectedDayTransactions.length === 0 && selectedDayReminders.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">
              در این تاریخ هیچ تراکنش یا سررسیدی ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayTransactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                const cardObj = cards.find((c) => c.id === tx.cardId);
                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CircularIcon
                        name={
                          tx.type === 'transfer'
                            ? 'refresh'
                            : cat?.icon || 'layers'
                        }
                        color={
                          tx.type === 'transfer'
                            ? '#0ea5e9'
                            : cat?.color || '#10b981'
                        }
                        size="xs"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {tx.type === 'transfer'
                            ? 'انتقال بین حساب‌ها'
                            : cat?.name || 'سایر'}{' '}
                          · {tx.cardId === 'cash' ? 'موجودی نقدی' : cardObj?.title || 'کارت'} · ساعت{' '}
                          {toPersianDigits(tx.time)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-black tabular-nums shrink-0">
                      {tx.type === 'expense' ? (
                        <ArrowUpRight size={13} className="text-rose-500" />
                      ) : tx.type === 'income' ? (
                        <ArrowDownLeft size={13} className="text-emerald-500" />
                      ) : (
                        <ArrowLeftRight size={13} className="text-sky-500" />
                      )}
                      <span
                        className={
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }
                      >
                        {isPrivacy ? '••••••' : formatMoney(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
