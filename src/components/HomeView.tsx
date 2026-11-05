import React, { useState } from 'react';
import { AppState, Transaction, PersonId, DueReminder } from '../types';
import {
  formatMoney,
  formatJalaliReadable,
  toPersianDigits,
  toEnglishDigits,
  getMonthKey,
  formatMonthKeyReadable,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';
import { BankLogoVector, IRANIAN_BANKS } from '../utils/iranianBanks';
import { JalaliDateInput } from './JalaliDateTimePicker';

interface HomeViewProps {
  state: AppState;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigateTab: (index: number) => void;
  onAddReminder: (rem: Omit<DueReminder, 'id'>) => void;
  onToggleReminderPaid: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  state,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateTab,
  onAddReminder,
  onToggleReminderPaid,
  onDeleteReminder,
}) => {
  const { transactions, cards, categories, tags, reminders = [], settings } = state;
  const [personFilter, setPersonFilter] = useState<'all' | PersonId>('all');
  const [recorderFilter, setRecorderFilter] = useState<'all' | 'hootan' | 'fatemeh'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reminder Hub states
  const [reminderTab, setReminderTab] = useState<'scheduled' | 'tagged'>('scheduled');
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remAmountStr, setRemAmountStr] = useState('');
  const [remDueDate, setRemDueDate] = useState('1403/08/25');
  const [remCategory, setRemCategory] = useState<DueReminder['category']>('installment');
  const [remPerson, setRemPerson] = useState<PersonId>('shared');

  const isMonochrome = settings.colorTheme === 'monochrome';

  // Total balances across all cards
  const totalInitial = cards.reduce((sum, c) => sum + c.initialBalance, 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netWorth = totalInitial + totalIncome - totalExpense;

  // Expenses breakdown by person
  const hootanExpense = transactions
    .filter((t) => t.type === 'expense' && t.spentBy === 'hootan')
    .reduce((sum, t) => sum + t.amount, 0);
  const fatemehExpense = transactions
    .filter((t) => t.type === 'expense' && t.spentBy === 'fatemeh')
    .reduce((sum, t) => sum + t.amount, 0);
  const sharedExpense = transactions
    .filter((t) => t.type === 'expense' && t.spentBy === 'shared')
    .reduce((sum, t) => sum + t.amount, 0);

  // Identify tags for 'بدهی' (Debt), 'طلب' (Receivable), or 'قسط' (Installment)
  const debtOrReceivableTagIds = tags
    .filter(
      (t) =>
        t.id === 'tag_debt' ||
        t.id === 'tag_receivable' ||
        t.id === 'tag_installment' ||
        t.name.includes('بدهی') ||
        t.name.includes('طلب') ||
        t.name.includes('قسط')
    )
    .map((t) => t.id);

  const debtReceivableTransactions = transactions
    .filter((tx) => tx.tags.some((tagId) => debtOrReceivableTagIds.includes(tagId)))
    .sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));

  // Filtered recent transactions
  const filteredTransactions = [...transactions]
    .filter((tx) => {
      if (personFilter !== 'all' && tx.spentBy !== personFilter) return false;
      if (recorderFilter !== 'all' && tx.recordedBy !== recorderFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const cat = categories.find((c) => c.id === tx.categoryId);
        const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchNote = (tx.note || '').toLowerCase().includes(q);
        const matchCat = (cat?.name || '').toLowerCase().includes(q);
        const matchSub = (sub?.name || '').toLowerCase().includes(q);
        return matchTitle || matchNote || matchCat || matchSub;
      }
      return true;
    })
    .sort((a, b) => {
      const dateCmp = b.jalaliDate.localeCompare(a.jalaliDate);
      if (dateCmp !== 0) return dateCmp;
      return b.time.localeCompare(a.time);
    });

  const budgetPercent =
    settings.monthlyTotalBudget > 0
      ? Math.min(100, Math.round((totalExpense / settings.monthlyTotalBudget) * 100))
      : 0;

  const latestMonth =
    transactions.length > 0 ? getMonthKey(transactions[0].jalaliDate) : '1403/08';

  const handleSaveReminderForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(toEnglishDigits(remAmountStr).replace(/\D/g, '') || '0', 10);
    if (!remTitle.trim() || amt <= 0) return;
    onAddReminder({
      title: remTitle.trim(),
      amount: amt,
      dueDate: remDueDate.trim() || '1403/08/25',
      category: remCategory,
      person: remPerson,
      isPaid: false,
    });
    setRemTitle('');
    setRemAmountStr('');
    setIsAddingReminder(false);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Hero Balance & Couple Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Main Hero Balance Card */}
        <div className="lg:col-span-7 rounded-3xl theme-gradient text-white p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-16 w-56 h-56 rounded-full bg-black/15 blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CircularIcon name="wallet" size="md" variant="glass" />
              <div>
                <span className="text-xs text-white/80 block">
                  موجودی کل دارایی کارت‌های {settings.hootanName} و {settings.fatemehName}
                </span>
                <span className="text-xs font-semibold text-white/95">
                  دوره فعلی · {formatMonthKeyReadable(latestMonth)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onAddTransaction}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-extrabold text-xs shadow-md hover:bg-white/90 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>+ ثبت دخل و خرج</span>
            </button>
          </div>

          <div className="relative z-10 my-6">
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                {formatMoney(netWorth)}
              </h2>
              <span className="text-sm font-medium text-white/85">{settings.currencyUnit}</span>
            </div>

            {/* Monthly Budget Progress Bar */}
            {settings.monthlyTotalBudget > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/90 mb-1.5">
                  <span>مصرف بودجه ماهانه خانوار</span>
                  <span className="tabular-nums font-bold">
                    {toPersianDigits(budgetPercent)}٪ از {formatMoney(settings.monthlyTotalBudget)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      budgetPercent > 90 ? 'bg-rose-300' : 'bg-white'
                    }`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Income vs Expense Strip */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
            <div className="flex items-center gap-3">
              <CircularIcon name="arrow-down" size="sm" variant="glass" />
              <div>
                <span className="text-[11px] text-white/75 block">کل ورودی و درآمد</span>
                <span className="text-sm sm:text-base font-extrabold tabular-nums text-emerald-100">
                  +{formatMoney(totalIncome)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CircularIcon name="arrow-up" size="sm" variant="glass" />
              <div>
                <span className="text-[11px] text-white/75 block">کل مخارج ثبت شده</span>
                <span className="text-sm sm:text-base font-extrabold tabular-nums text-rose-100">
                  -{formatMoney(totalExpense)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Couple Expense Share & Quick Bank Cards Preview */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CircularIcon name="users" size="sm" color="#8b5cf6" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  تفکیک سهم مخارج زوجین
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  مقایسه خرج‌های شخصی و مشترک
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab(2)}
              className="text-xs font-bold theme-text hover:underline cursor-pointer whitespace-nowrap"
            >
              آمار کامل ←
            </button>
          </div>

          {/* 3-Row Person Breakdown */}
          <div className="space-y-3">
            {[
              {
                id: 'hootan',
                label: `خرج شخصی ${settings.hootanName}`,
                amount: hootanExpense,
                color: '#0ea5e9',
                icon: 'user',
              },
              {
                id: 'fatemeh',
                label: `خرج شخصی ${settings.fatemehName}`,
                amount: fatemehExpense,
                color: '#ec4899',
                icon: 'user',
              },
              {
                id: 'shared',
                label: `هزینه‌های ${settings.sharedLabel} منزل`,
                amount: sharedExpense,
                color: '#10b981',
                icon: 'users',
              },
            ].map((item) => {
              const pct =
                totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CircularIcon name={item.icon} size="xs" color={item.color} />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatMoney(item.amount)}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {toPersianDigits(pct)}٪
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Card Balances Row */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center -space-x-2 space-x-reverse">
              {cards.slice(0, 4).map((c) => (
                <BankLogoVector
                  key={c.id}
                  bankId={c.bankId}
                  size={28}
                  mono={isMonochrome}
                  className="ring-2 ring-white dark:ring-slate-900"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(1)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              مدیریت {toPersianDigits(cards.length)} کارت بانکی ←
            </button>
          </div>
        </div>
      </div>

      {/* NEW SECTION: REMINDERS HUB (تراکنش‌های دارای تگ بدهی / طلب + یادآوری اقساط و اجاره) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="clock" size="sm" color="#f59e0b" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                یادآور بدهی‌ها، مطالبات (طلب)، اقساط و اجاره
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                نمایش خودکار تراکنش‌های دارای تگ «#بدهی» یا «#طلب» به همراه تقویم سررسید اقساط و اجاره
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setReminderTab('scheduled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  reminderTab === 'scheduled'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                سررسید اقساط و اجاره ({toPersianDigits(reminders.filter((r) => !r.isPaid).length)})
              </button>
              <button
                type="button"
                onClick={() => setReminderTab('tagged')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  reminderTab === 'tagged'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                تراکنش‌های #بدهی و #طلب ({toPersianDigits(debtReceivableTransactions.length)})
              </button>
            </div>

            {reminderTab === 'scheduled' && (
              <button
                type="button"
                onClick={() => setIsAddingReminder(!isAddingReminder)}
                className="px-3 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer whitespace-nowrap"
              >
                {isAddingReminder ? 'بستن' : '+ یادآور جدید'}
              </button>
            )}
          </div>
        </div>

        {/* Sub-view A: Transactions Tagged with 'بدهی' or 'طلب' */}
        {reminderTab === 'tagged' && (
          <div>
            {debtReceivableTransactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>هیچ تراکنشی با تگ «#بدهی» یا «#طلب» ثبت نشده است.</p>
                <button
                  type="button"
                  onClick={onAddTransaction}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                >
                  + ثبت تراکنش با تگ بدهی یا طلب
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {debtReceivableTransactions.map((tx) => {
                  const txTagObjects = tags.filter((t) => tx.tags.includes(t.id));
                  const isReceivable = txTagObjects.some(
                    (t) => t.id === 'tag_receivable' || t.name.includes('طلب')
                  );
                  const spentByLabel =
                    tx.spentBy === 'hootan'
                      ? settings.hootanName
                      : tx.spentBy === 'fatemeh'
                      ? settings.fatemehName
                      : settings.sharedLabel;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CircularIcon
                          name={isReceivable ? 'arrow-down' : 'arrow-up'}
                          color={isReceivable ? '#10b981' : '#ef4444'}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {tx.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {isReceivable ? 'طلب' : 'بدهی / قسط'}
                            </span>
                            <span>·</span>
                            <span>مربوط به: {spentByLabel}</span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {formatJalaliReadable(tx.jalaliDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0 tabular-nums">
                        <div
                          className={`text-xs sm:text-sm font-black ${
                            isReceivable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatMoney(tx.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {txTagObjects.map((t) => `#${t.name}`).join(' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sub-view B: Scheduled Installments, Rent & Debt Reminders */}
        {reminderTab === 'scheduled' && (
          <div className="space-y-3">
            {isAddingReminder && (
              <form
                onSubmit={handleSaveReminderForm}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    عنوان تعهد (قسط، اجاره، بدهی)
                  </label>
                  <input
                    type="text"
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    placeholder="مثلاً: قسط وام مسکن یا اجاره خانه"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    مبلغ ({settings.currencyUnit})
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      remAmountStr
                        ? formatMoney(
                            parseInt(toEnglishDigits(remAmountStr).replace(/\D/g, '') || '0', 10)
                          )
                        : ''
                    }
                    onChange={(e) =>
                      setRemAmountStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
                    }
                    placeholder="۳،۲۰۰،۰۰۰"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    تاریخ سررسید
                  </label>
                  <JalaliDateInput
                    value={remDueDate}
                    onChange={(newDate) => setRemDueDate(newDate)}
                    placeholder="انتخاب تاریخ سررسید"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-1.5">
                  <select
                    value={remCategory}
                    onChange={(e) =>
                      setRemCategory(e.target.value as DueReminder['category'])
                    }
                    className="flex-1 px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="installment">قسط وام</option>
                    <option value="rent">اجاره و شارژ</option>
                    <option value="debt">بدهی</option>
                    <option value="receivable">طلب دریافتی</option>
                    <option value="bill">قبض</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    ثبت
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {reminders.map((rem) => {
                const catLabel =
                  rem.category === 'installment'
                    ? 'قسط وام'
                    : rem.category === 'rent'
                    ? 'اجاره و مسکن'
                    : rem.category === 'debt'
                    ? 'بدهی'
                    : rem.category === 'receivable'
                    ? 'طلب'
                    : 'قبض';
                const personLabel =
                  rem.person === 'hootan'
                    ? settings.hootanName
                    : rem.person === 'fatemeh'
                    ? settings.fatemehName
                    : settings.sharedLabel;

                return (
                  <div
                    key={rem.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                      rem.isPaid
                        ? 'border-slate-200/50 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-800/20 opacity-60'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleReminderPaid(rem.id)}
                        title={rem.isPaid ? 'علامت به عنوان پرداخت نشده' : 'تسویه شد'}
                        className="cursor-pointer shrink-0"
                      >
                        <CircularIcon
                          name={rem.isPaid ? 'check' : 'clock'}
                          color={rem.isPaid ? '#10b981' : '#f59e0b'}
                          size="sm"
                          variant={rem.isPaid ? 'solid' : 'soft'}
                        />
                      </button>
                      <div className="min-w-0">
                        <h4
                          className={`text-xs font-extrabold truncate ${
                            rem.isPaid
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {rem.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          {catLabel} · {personLabel} · سررسید: {toPersianDigits(rem.dueDate)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left tabular-nums">
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          {formatMoney(rem.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {rem.isPaid ? 'تسویه شد' : settings.currencyUnit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteReminder(rem.id)}
                        className="text-slate-400 hover:text-rose-500 text-xs font-bold px-1 cursor-pointer"
                        title="حذف یادآور"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar for Transactions */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CircularIcon name="layers" size="sm" color="#10b981" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                تراکنش‌های اخیر
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فیلتر بر اساس خرج‌کننده، ثبت‌کننده یا جستجوی سریع
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، دسته‌بندی..."
              className="w-full pr-3.5 pl-9 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <CircularIcon name="search" size="xs" color="#64748b" />
            </div>
          </div>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Spent By Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'همه خرج‌ها' },
                { id: 'hootan', label: `خرج ${settings.hootanName}` },
                { id: 'fatemeh', label: `خرج ${settings.fatemehName}` },
                { id: 'shared', label: settings.sharedLabel },
              ] as { id: 'all' | PersonId; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPersonFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  personFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Recorded By Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'all', label: 'ثبت: هر دو' },
                { id: 'hootan', label: `ثبت: ${settings.hootanName}` },
                { id: 'fatemeh', label: `ثبت: ${settings.fatemehName}` },
              ] as { id: 'all' | 'hootan' | 'fatemeh'; label: string }[]
            ).map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => setRecorderFilter(rec.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  recorderFilter === rec.id
                    ? 'theme-bg text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {rec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="flex justify-center">
              <CircularIcon name="archive" size="lg" color="#94a3b8" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              تراکنشی با این مشخصات پیدا نشد
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="px-4 py-2 rounded-xl theme-bg text-white text-xs font-bold cursor-pointer"
            >
              ثبت اولین تراکنش
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
              const card = cards.find((c) => c.id === tx.cardId);
              const bank = card ? IRANIAN_BANKS[card.bankId] : null;

              const spentByLabel =
                tx.spentBy === 'hootan'
                  ? settings.hootanName
                  : tx.spentBy === 'fatemeh'
                  ? settings.fatemehName
                  : settings.sharedLabel;

              const recordedByLabel =
                tx.recordedBy === 'hootan' ? settings.hootanName : settings.fatemehName;

              const txTags = tags.filter((t) => tx.tags.includes(t.id));

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="py-3.5 px-2 -mx-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CircularIcon
                      name={cat?.icon || 'layers'}
                      color={cat?.color || '#10b981'}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </h4>
                      </div>

                      {/* Zero-Pill Metadata Discipline: Clean unboxed text with · separators */}
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {cat?.name || 'سایر'}
                        </span>
                        {sub && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{sub.name}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>
                          {tx.type === 'expense' ? 'خرج:' : 'درآمد:'} {spentByLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>ثبت: {recordedByLabel}</span>
                        {bank && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{bank.name}</span>
                          </>
                        )}
                      </div>

                      {/* Date, Time & Tags inline */}
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                        <span>{formatJalaliReadable(tx.jalaliDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span>ساعت {toPersianDigits(tx.time)}</span>
                        {txTags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="theme-text font-medium">
                              {txTags.map((t) => `#${t.name}`).join(' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side Amount & Delete Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-left">
                      <div
                        className={`text-sm sm:text-base font-extrabold tabular-nums ${
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {formatMoney(tx.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {settings.currencyUnit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTransaction(tx.id);
                      }}
                      title="حذف تراکنش"
                      className="opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <CircularIcon name="trash" size="xs" color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
