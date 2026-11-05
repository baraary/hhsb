import React, { useState } from 'react';
import { AppState, PersonId } from '../types';
import {
  formatMoney,
  toPersianDigits,
  getMonthKey,
  formatMonthKeyReadable,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';
import { BankLogoVector, IRANIAN_BANKS } from '../utils/iranianBanks';

interface StatsViewProps {
  state: AppState;
  onNavigateSettingsBudgets?: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  state,
  onNavigateSettingsBudgets,
}) => {
  const { transactions, categories, tags, cards, budgets, settings } = state;

  // Collect all unique months
  const availableMonths = Array.from(
    new Set(transactions.map((t) => getMonthKey(t.jalaliDate)))
  ).sort((a, b) => b.localeCompare(a));

  const latestMonthKey = availableMonths[0] || '1403/08';

  const [selectedMonth, setSelectedMonth] = useState<string>(latestMonthKey);
  const [selectedPerson, setSelectedPerson] = useState<'all' | PersonId>('all');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const filteredTxs = transactions.filter((tx) => {
    if (selectedMonth !== 'all' && getMonthKey(tx.jalaliDate) !== selectedMonth) {
      return false;
    }
    if (selectedPerson !== 'all' && tx.spentBy !== selectedPerson) {
      return false;
    }
    return true;
  });

  const expenses = filteredTxs.filter((t) => t.type === 'expense');
  const incomes = filteredTxs.filter((t) => t.type === 'income');

  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  // Person comparison on filtered month (ignoring selectedPerson filter for comparison chart)
  const monthTxs = transactions.filter((tx) =>
    selectedMonth === 'all' ? true : getMonthKey(tx.jalaliDate) === selectedMonth
  );
  const hootanSpent = monthTxs
    .filter((t) => t.type === 'expense' && t.spentBy === 'hootan')
    .reduce((s, t) => s + t.amount, 0);
  const fatemehSpent = monthTxs
    .filter((t) => t.type === 'expense' && t.spentBy === 'fatemeh')
    .reduce((s, t) => s + t.amount, 0);
  const sharedSpent = monthTxs
    .filter((t) => t.type === 'expense' && t.spentBy === 'shared')
    .reduce((s, t) => s + t.amount, 0);
  const totalMonthExpense = hootanSpent + fatemehSpent + sharedSpent;

  // Recorder stats (ثبت توسط هوتن یا فاطمه)
  const recordedByHootanCount = filteredTxs.filter((t) => t.recordedBy === 'hootan').length;
  const recordedByFatemehCount = filteredTxs.filter((t) => t.recordedBy === 'fatemeh').length;

  // Number of months multiplier when 'all' is selected for budget comparison
  const activeMonthsCount = Math.max(
    1,
    selectedMonth === 'all' ? availableMonths.length : 1
  );

  // 1. Category Budget Progress Calculation
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const categoryBudgetStatuses = expenseCategories
    .map((cat) => {
      const budgetObj = budgets.find((b) => b.categoryId === cat.id);
      const monthlyLimit = budgetObj ? budgetObj.monthlyLimit : 0;
      const effectiveLimit = monthlyLimit * activeMonthsCount;
      const spent = expenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const percent =
        effectiveLimit > 0 ? Math.round((spent / effectiveLimit) * 100) : 0;
      const remaining = effectiveLimit - spent;

      return {
        category: cat,
        monthlyLimit,
        effectiveLimit,
        spent,
        percent,
        remaining,
      };
    })
    .filter((item) => item.monthlyLimit > 0 || item.spent > 0)
    .sort((a, b) => b.percent - a.percent);

  // 2. Next Month Expense Estimation based on Historical Spending Patterns
  const totalHistoricalMonths = Math.max(1, availableMonths.length);
  const allHistoricalExpenses = transactions.filter((t) => t.type === 'expense');

  const nextMonthForecasts = expenseCategories
    .map((cat) => {
      const catAllTxs = allHistoricalExpenses.filter((t) => t.categoryId === cat.id);
      const totalCatHistorical = catAllTxs.reduce((s, t) => s + t.amount, 0);

      // Group by month to compute weighted trend + historical monthly average
      const monthlyTotals = availableMonths.map((mKey) =>
        catAllTxs
          .filter((t) => getMonthKey(t.jalaliDate) === mKey)
          .reduce((s, t) => s + t.amount, 0)
      );

      const simpleAverage = Math.round(totalCatHistorical / totalHistoricalMonths);
      const latestMonthSpent = monthlyTotals[0] || 0;
      const prevMonthSpent = monthlyTotals[1] ?? simpleAverage;

      // Smart weighted estimation: 60% recent pattern + 40% historical average
      const estimatedNextMonth =
        totalHistoricalMonths > 1
          ? Math.round(latestMonthSpent * 0.6 + simpleAverage * 0.4)
          : latestMonthSpent;

      const trendDelta = latestMonthSpent - prevMonthSpent;
      const budgetLimit =
        budgets.find((b) => b.categoryId === cat.id)?.monthlyLimit || 0;

      return {
        category: cat,
        simpleAverage,
        latestMonthSpent,
        estimatedNextMonth,
        trendDelta,
        budgetLimit,
        txCount: catAllTxs.length,
      };
    })
    .filter((f) => f.estimatedNextMonth > 0 || f.simpleAverage > 0)
    .sort((a, b) => b.estimatedNextMonth - a.estimatedNextMonth);

  const totalEstimatedNextMonth = nextMonthForecasts.reduce(
    (sum, f) => sum + f.estimatedNextMonth,
    0
  );

  // Category Breakdown with Subcategories
  const categoryStats = expenseCategories
    .map((cat) => {
      const catTxs = expenses.filter((t) => t.categoryId === cat.id);
      const amount = catTxs.reduce((sum, t) => sum + t.amount, 0);
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;

      const subStats = cat.subCategories
        .map((sub) => {
          const subAmount = catTxs
            .filter((t) => t.subCategoryId === sub.id)
            .reduce((s, t) => s + t.amount, 0);
          const subPct = amount > 0 ? Math.round((subAmount / amount) * 100) : 0;
          return {
            ...sub,
            amount: subAmount,
            percentage: subPct,
          };
        })
        .filter((s) => s.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      return {
        category: cat,
        amount,
        count: catTxs.length,
        percentage,
        subStats,
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Tag Statistics
  const tagStats = tags
    .map((tag) => {
      const tagTxs = expenses.filter((t) => t.tags.includes(tag.id));
      const amount = tagTxs.reduce((s, t) => s + t.amount, 0);
      return {
        tag,
        amount,
        count: tagTxs.length,
      };
    })
    .filter((t) => t.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Bank Card Spending Stats
  const cardStats = cards
    .map((card) => {
      const cExpense = expenses
        .filter((t) => t.cardId === card.id)
        .reduce((s, t) => s + t.amount, 0);
      const cIncome = incomes
        .filter((t) => t.cardId === card.id)
        .reduce((s, t) => s + t.amount, 0);
      return {
        card,
        expense: cExpense,
        income: cIncome,
      };
    })
    .sort((a, b) => b.expense - a.expense);

  // Donut Chart SVG Calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Filter Bar */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircularIcon name="pie-chart" size="md" color="#8b5cf6" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              آمارهای کلی، وضعیت بودجه و تخمین ماه آینده
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              پایش سقف بودجه دسته‌بندی‌ها، پیش‌بینی هوشمند مخارج ماه بعد و تحلیل ریزِ زیردسته‌ها
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              کل دوره‌ها
            </button>
            {availableMonths.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                  selectedMonth === m
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {formatMonthKeyReadable(m)}
              </button>
            ))}
          </div>

          {/* Person Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'all', label: 'همه' },
                { id: 'hootan', label: settings.hootanName },
                { id: 'fatemeh', label: settings.fatemehName },
                { id: 'shared', label: settings.sharedLabel },
              ] as { id: 'all' | PersonId; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPerson(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedPerson === p.id
                    ? 'theme-bg text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center gap-3.5">
          <CircularIcon name="arrow-up" size="md" color="#f43f5e" />
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              مجموع هزینه‌های دوره انتخابی
            </span>
            <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {formatMoney(totalExpense, true, settings.currencyUnit)}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center gap-3.5">
          <CircularIcon name="arrow-down" size="md" color="#10b981" />
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              مجموع درآمدهای دوره انتخابی
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatMoney(totalIncome, true, settings.currencyUnit)}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center gap-3.5">
          <CircularIcon name="edit" size="md" color="#0ea5e9" />
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              مشارکت در ثبت تراکنش‌ها
            </span>
            <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
              {settings.hootanName}: {toPersianDigits(recordedByHootanCount)} ثبت ·{' '}
              {settings.fatemehName}: {toPersianDigits(recordedByFatemehCount)} ثبت
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION 1: CATEGORY BUDGET PROGRESS BARS */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CircularIcon name="award" size="md" color="#10b981" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                وضعیت خرج‌کرد نسبت به سقف بودجه ماهانه دسته‌بندی‌ها
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                نمودار پیشرفت مصرف بودجه هر دسته در{' '}
                {selectedMonth === 'all'
                  ? `کل دوره‌ها (${toPersianDigits(activeMonthsCount)} ماه)`
                  : formatMonthKeyReadable(selectedMonth)}
              </p>
            </div>
          </div>

          {onNavigateSettingsBudgets && (
            <button
              type="button"
              onClick={onNavigateSettingsBudgets}
              className="text-xs font-bold theme-text hover:underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              ویرایش سقف بودجه دسته‌ها در تنظیمات ←
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryBudgetStatuses.map((item) => {
            const hasLimit = item.effectiveLimit > 0;
            const isOverBudget = hasLimit && item.spent > item.effectiveLimit;
            const isNearLimit = hasLimit && !isOverBudget && item.percent >= 80;
            const barWidth = hasLimit ? Math.min(100, item.percent) : 0;

            const statusLabel = !hasLimit
              ? 'بدون سقف بودجه'
              : isOverBudget
              ? `عبور از سقف بودجه (+${formatMoney(Math.abs(item.remaining))})`
              : isNearLimit
              ? `نزدیک به سقف (${formatMoney(item.remaining)} باقی‌مانده)`
              : `${formatMoney(item.remaining)} باقی‌مانده تا سقف`;

            const barColorClass = isOverBudget
              ? 'bg-rose-500'
              : isNearLimit
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            const statusTextColor = isOverBudget
              ? 'text-rose-600 dark:text-rose-400'
              : isNearLimit
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400';

            return (
              <div
                key={item.category.id}
                className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CircularIcon
                      name={item.category.icon}
                      color={item.category.color}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {item.category.name}
                      </h4>
                      <span className={`text-[11px] font-bold block ${statusTextColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="text-left tabular-nums shrink-0">
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(item.spent)}{' '}
                      <span className="text-[11px] font-normal text-slate-400">
                        / {hasLimit ? formatMoney(item.effectiveLimit) : '∞'}
                      </span>
                    </div>
                    {hasLimit && (
                      <span className={`text-[11px] font-extrabold ${statusTextColor}`}>
                        {toPersianDigits(item.percent)}٪ مصرف شده
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NEW SECTION 2: NEXT MONTH EXPENSE ESTIMATION BASED ON HISTORICAL PATTERNS */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <CircularIcon name="trending-up" size="md" color="#0ea5e9" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                تخمین هوشمند هزینه‌های ماه آینده (بر اساس الگوی تراکنش‌های گذشته)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                محاسبه شده از روی میانگین و روند خرج‌کرد {toPersianDigits(totalHistoricalMonths)} ماه اخیر برای دسته‌بندی‌های اصلی
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-left shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              مجموع تخمینی مخارج ماه آینده
            </span>
            <span className="text-sm sm:text-base font-black theme-text tabular-nums">
              {formatMoney(totalEstimatedNextMonth, true, settings.currencyUnit)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nextMonthForecasts.map((f) => {
            const exceedsBudget =
              f.budgetLimit > 0 && f.estimatedNextMonth > f.budgetLimit;
            return (
              <div
                key={f.category.id}
                className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/25 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CircularIcon
                      name={f.category.icon}
                      color={f.category.color}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {f.category.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        میانگین ماهانه: {formatMoney(f.simpleAverage)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    پیش‌بینی ماه بعد:
                  </span>
                  <div className="text-left tabular-nums">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(f.estimatedNextMonth)}
                    </span>
                    <span className="text-[10px] text-slate-400 mr-1">
                      {settings.currencyUnit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] tabular-nums">
                  <span
                    className={
                      f.trendDelta > 0
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    }
                  >
                    {f.trendDelta > 0
                      ? `روند افزایشی (+${formatMoney(f.trendDelta)})`
                      : f.trendDelta < 0
                      ? `روند کاهشی (${formatMoney(f.trendDelta)})`
                      : 'روند ثابت'}
                  </span>
                  {f.budgetLimit > 0 && (
                    <span
                      className={
                        exceedsBudget
                          ? 'text-rose-500 font-bold'
                          : 'text-slate-400'
                      }
                    >
                      {exceedsBudget ? 'فراتر از بودجه' : 'در محدوده بودجه'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Analytics: Category Donut + Detailed Subcategory Drilldown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: SVG Donut Chart & Person Share */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              نمودار دایره‌ای سهم دسته‌بندی‌ها
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {toPersianDigits(expenses.length)} تراکنش هزینه
            </span>
          </div>

          {categoryStats.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              داده‌ای برای نمایش نمودار وجود ندارد
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  {categoryStats.map((item) => {
                    const strokeDasharray = `${
                      (item.percentage / 100) * circumference
                    } ${circumference}`;
                    const strokeDashoffset = -(cumulativePercent / 100) * circumference;
                    cumulativePercent += item.percentage;
                    return (
                      <circle
                        key={item.category.id}
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke={item.category.color}
                        strokeWidth="16"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="butt"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-[11px] text-slate-400">کل خرج</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatMoney(totalExpense)}
                  </span>
                  <span className="text-[10px] text-slate-400">{settings.currencyUnit}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                {categoryStats.map((item) => (
                  <div key={item.category.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CircularIcon
                        name={item.category.icon}
                        color={item.category.color}
                        size="xs"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {item.category.name}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {toPersianDigits(item.percentage)}٪
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Couple Comparison Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              مقایسه هزینه بین {settings.hootanName}، {settings.fatemehName} و {settings.sharedLabel}
            </h4>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {totalMonthExpense > 0 && (
                <>
                  <div
                    style={{ width: `${(hootanSpent / totalMonthExpense) * 100}%` }}
                    className="bg-sky-500 h-full"
                    title={settings.hootanName}
                  />
                  <div
                    style={{ width: `${(fatemehSpent / totalMonthExpense) * 100}%` }}
                    className="bg-pink-500 h-full"
                    title={settings.fatemehName}
                  />
                  <div
                    style={{ width: `${(sharedSpent / totalMonthExpense) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={settings.sharedLabel}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] tabular-nums">
              <div>
                <span className="text-sky-500 font-bold block">{settings.hootanName}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(hootanSpent)}
                </span>
              </div>
              <div>
                <span className="text-pink-500 font-bold block">{settings.fatemehName}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(fatemehSpent)}
                </span>
              </div>
              <div>
                <span className="text-emerald-500 font-bold block">{settings.sharedLabel}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(sharedSpent)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Category & Subcategory Drilldown */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              ریزِ مخارج به تفکیک دسته‌بندی عمومی و زیردسته‌ها
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              روی هر دسته‌بندی کلیک کنید تا آمار دسته‌بندی‌های ریزتر آن باز شود
            </p>
          </div>

          <div className="space-y-3">
            {categoryStats.map((item) => {
              const isExpanded =
                expandedCategoryId === item.category.id || expandedCategoryId === null;
              return (
                <div
                  key={item.category.id}
                  className="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4 transition-all"
                >
                  <div
                    onClick={() =>
                      setExpandedCategoryId(
                        expandedCategoryId === item.category.id ? '' : item.category.id
                      )
                    }
                    className="flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <CircularIcon
                        name={item.category.icon}
                        color={item.category.color}
                        size="md"
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.category.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {toPersianDigits(item.count)} تراکنش · {toPersianDigits(item.percentage)}٪ از کل مخارج
                        </span>
                      </div>
                    </div>

                    <div className="text-left tabular-nums">
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {formatMoney(item.amount)}
                      </div>
                      <span className="text-[11px] text-slate-400">{settings.currencyUnit}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.category.color,
                      }}
                    />
                  </div>

                  {/* Subcategories Breakdown */}
                  {isExpanded && item.subStats.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      {item.subStats.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <CircularIcon
                              name={sub.icon || item.category.icon}
                              color={item.category.color}
                              size="xs"
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {sub.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatMoney(sub.amount)}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {toPersianDigits(sub.percentage)}٪
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Tags Analytics & Bank Card Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tags Breakdown */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="tag" size="sm" color="#f59e0b" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                آمار بر اساس تگ‌ها
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                بیشترین هزینه‌ها روی کدام برچسب‌ها بوده است؟
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {tagStats.map((item) => (
              <div
                key={item.tag.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <CircularIcon name="tag" size="xs" color={item.tag.color} />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      #{item.tag.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block tabular-nums">
                      {toPersianDigits(item.count)} مورد استفاده
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {formatMoney(item.amount, true, settings.currencyUnit)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards Usage Breakdown */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="credit-card" size="sm" color="#10b981" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                گردش مالی هر کارت بانکی
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                میزان ورودی و خروجی ثبت شده روی کارت‌ها
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {cardStats.map((item) => {
              const bank = IRANIAN_BANKS[item.card.bankId] || IRANIAN_BANKS.other;
              return (
                <div
                  key={item.card.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BankLogoVector bankId={item.card.bankId} size={32} />
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                        {item.card.title}
                      </span>
                      <span className="text-[11px] text-slate-500">{bank.name}</span>
                    </div>
                  </div>
                  <div className="text-left text-xs tabular-nums">
                    <div className="text-rose-500 font-bold">
                      خرج: {formatMoney(item.expense)}
                    </div>
                    <div className="text-emerald-500 font-semibold text-[11px]">
                      ورودی: {formatMoney(item.income)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
