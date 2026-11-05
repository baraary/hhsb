import React, { useState } from 'react';
import { AppState, Transaction } from '../types';
import {
  formatMoney,
  formatJalaliReadable,
  toPersianDigits,
  toEnglishDigits,
  getMonthKey,
  formatMonthKeyReadable,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';
import { IRANIAN_BANKS } from '../utils/iranianBanks';
import { JalaliDateInput } from './JalaliDateTimePicker';

interface ArchiveViewProps {
  state: AppState;
  onEditTransaction: (tx: Transaction) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ state, onEditTransaction }) => {
  const { transactions, categories, tags, cards, settings } = state;

  const availableMonths = Array.from(
    new Set(transactions.map((t) => getMonthKey(t.jalaliDate)))
  ).sort((a, b) => b.localeCompare(a));

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string>('all');

  // Smart Search Bar Filters: Title, Amount Range, Date Range
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minAmountStr, setMinAmountStr] = useState<string>('');
  const [maxAmountStr, setMaxAmountStr] = useState<string>('');
  const [fromDateStr, setFromDateStr] = useState<string>('');
  const [toDateStr, setToDateStr] = useState<string>('');

  const minAmount = parseInt(toEnglishDigits(minAmountStr).replace(/\D/g, '') || '0', 10);
  const maxAmount = parseInt(toEnglishDigits(maxAmountStr).replace(/\D/g, '') || '0', 10);
  const cleanFromDate = toEnglishDigits(fromDateStr).trim();
  const cleanToDate = toEnglishDigits(toDateStr).trim();

  const hasSmartFilterActive =
    Boolean(searchQuery.trim()) ||
    minAmount > 0 ||
    maxAmount > 0 ||
    Boolean(cleanFromDate) ||
    Boolean(cleanToDate);

  const clearSmartFilters = () => {
    setSearchQuery('');
    setMinAmountStr('');
    setMaxAmountStr('');
    setFromDateStr('');
    setToDateStr('');
  };

  const monthFiltered = transactions.filter((tx) => {
    if (selectedMonth !== 'all' && getMonthKey(tx.jalaliDate) !== selectedMonth) return false;
    if (selectedTagId !== 'all' && !tx.tags.includes(selectedTagId)) return false;

    // Smart Search by Title / Note / Category / Subcategory
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const cat = categories.find((c) => c.id === tx.categoryId);
      const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchNote = (tx.note || '').toLowerCase().includes(q);
      const matchCat = (cat?.name || '').toLowerCase().includes(q);
      const matchSub = (sub?.name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchNote && !matchCat && !matchSub) return false;
    }

    // Smart Filter by Amount Range
    if (minAmount > 0 && tx.amount < minAmount) return false;
    if (maxAmount > 0 && tx.amount > maxAmount) return false;

    // Smart Filter by Jalali Date Range (YYYY/MM/DD string comparison)
    if (cleanFromDate && tx.jalaliDate < cleanFromDate) return false;
    if (cleanToDate && tx.jalaliDate > cleanToDate) return false;

    return true;
  });

  // Group into stylish category folders
  const categoryFolders = categories.map((cat) => {
    const items = monthFiltered
      .filter((t) => t.categoryId === cat.id)
      .sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));
    const total = items.reduce((s, t) => s + t.amount, 0);

    // Subcategory counts
    const subBreakdown = cat.subCategories
      .map((sub) => {
        const subItems = items.filter((i) => i.subCategoryId === sub.id);
        const subTotal = subItems.reduce((s, t) => s + t.amount, 0);
        return { sub, count: subItems.length, total: subTotal, items: subItems };
      })
      .filter((s) => s.count > 0);

    return {
      category: cat,
      items,
      total,
      subBreakdown,
    };
  });

  const activeFolder =
    categoryFolders.find((f) => f.category.id === selectedCategoryId) || null;

  const handleExportCSV = () => {
    const headers = [
      'عنوان',
      'نوع',
      'مبلغ',
      'دسته‌بندی',
      'زیردسته',
      'خرج توسط',
      'ثبت توسط',
      'کارت بانکی',
      'تاریخ شمسی',
      'ساعت',
      'توضیحات',
    ];
    const rows = monthFiltered.map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
      const card = cards.find((c) => c.id === tx.cardId);
      const spent =
        tx.spentBy === 'hootan'
          ? settings.hootanName
          : tx.spentBy === 'fatemeh'
          ? settings.fatemehName
          : settings.sharedLabel;
      const rec = tx.recordedBy === 'hootan' ? settings.hootanName : settings.fatemehName;
      return [
        `"${tx.title}"`,
        tx.type === 'expense' ? 'هزینه' : 'درآمد',
        tx.amount,
        `"${cat?.name || ''}"`,
        `"${sub?.name || ''}"`,
        `"${spent}"`,
        `"${rec}"`,
        `"${card?.title || ''}"`,
        tx.jalaliDate,
        tx.time,
        `"${tx.note || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hamhesab-archive-${selectedMonth.replace('/', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Export */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircularIcon name="archive" size="md" color="#f59e0b" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              آرشیو دسته‌بندی‌شده هزینه‌ها و درآمدها
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              جستجوی هوشمند بر اساس عنوان، محدوده مبلغ و بازه تاریخی به همراه پوشه‌های موضوعی
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <span>خروجی اکسل (CSV)</span>
        </button>
      </div>

      {/* SMART SEARCH BAR (عنوان، مبلغ، بازه تاریخی) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircularIcon name="search" size="xs" color="#10b981" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              جستجوی هوشمند در آرشیو
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              ({toPersianDigits(monthFiltered.length)} تراکنش منطبق)
            </span>
          </div>

          {hasSmartFilterActive && (
            <button
              type="button"
              onClick={clearSmartFilters}
              className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
            >
              پاک کردن فیلترها ×
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Title / Keyword Input */}
          <div className="lg:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              جستجوی عنوان، دسته‌بندی یا یادداشت
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="مثلاً: هایپراستار، رستوران، اجاره..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Min Amount */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              حداقل مبلغ ({settings.currencyUnit})
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={minAmount > 0 ? formatMoney(minAmount) : ''}
              onChange={(e) =>
                setMinAmountStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
              }
              placeholder="از ۰"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Max Amount */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              حداکثر مبلغ ({settings.currencyUnit})
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={maxAmount > 0 ? formatMoney(maxAmount) : ''}
              onChange={(e) =>
                setMaxAmountStr(toEnglishDigits(e.target.value).replace(/\D/g, ''))
              }
              placeholder="تا سقف..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* From Jalali Date */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              از تاریخ شمسی
            </label>
            <JalaliDateInput
              value={fromDateStr}
              onChange={(d) => setFromDateStr(d)}
              placeholder="انتخاب از تاریخ..."
              allowClear
            />
          </div>

          {/* To Jalali Date */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              تا تاریخ شمسی
            </label>
            <JalaliDateInput
              value={toDateStr}
              onChange={(d) => setToDateStr(d)}
              placeholder="انتخاب تا تاریخ..."
              allowClear
            />
          </div>
        </div>
      </div>

      {/* Month & Tag Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
              selectedMonth === 'all'
                ? 'theme-bg text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            همه ماه‌ها
          </button>
          {availableMonths.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonth(m)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
                selectedMonth === m
                  ? 'theme-bg text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {formatMonthKeyReadable(m)}
            </button>
          ))}
        </div>

        {/* Tag Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedTagId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              selectedTagId === 'all'
                ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
            }`}
          >
            همه تگ‌ها
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setSelectedTagId(tag.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                selectedTagId === tag.id
                  ? 'text-white border-transparent'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
              style={selectedTagId === tag.id ? { backgroundColor: tag.color } : undefined}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Filtered Transactions Results when Smart Search is Active */}
      {hasSmartFilterActive && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              نتایج جستجوی هوشمند ({toPersianDigits(monthFiltered.length)} مورد)
            </h3>
            <span className="text-xs font-bold theme-text tabular-nums">
              جمع نتایج:{' '}
              {formatMoney(
                monthFiltered.reduce((s, t) => s + t.amount, 0),
                true,
                settings.currencyUnit
              )}
            </span>
          </div>

          {monthFiltered.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              هیچ تراکنشی با فیلترهای وارد شده مطابقت ندارد.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthFiltered.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                const sub = cat?.subCategories.find((s) => s.id === tx.subCategoryId);
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
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CircularIcon
                        name={cat?.icon || 'layers'}
                        color={cat?.color || '#10b981'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          {cat?.name} · {sub?.name} · {spentByLabel} ·{' '}
                          {formatJalaliReadable(tx.jalaliDate)}
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0 tabular-nums">
                      <span
                        className={`text-sm font-extrabold ${
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatMoney(tx.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {settings.currencyUnit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stylish Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryFolders.map((folder) => {
          const isSelected = selectedCategoryId === folder.category.id;
          return (
            <div
              key={folder.category.id}
              onClick={() =>
                setSelectedCategoryId(isSelected ? null : folder.category.id)
              }
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-slate-800 border-emerald-500 shadow-xl'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CircularIcon
                      name={folder.category.icon}
                      color={folder.category.color}
                      size="md"
                      variant={isSelected ? 'solid' : 'soft'}
                    />
                    <div>
                      <h3
                        className={`text-sm font-extrabold ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {folder.category.name}
                      </h3>
                      <span
                        className={`text-xs tabular-nums ${
                          isSelected ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {toPersianDigits(folder.items.length)} رکورد آرشیو شده ·{' '}
                        {folder.category.type === 'expense' ? 'هزینه' : 'درآمد'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subcategory preview lines */}
                {folder.subBreakdown.length > 0 ? (
                  <div className="mt-4 space-y-1.5">
                    {folder.subBreakdown.slice(0, 3).map((s) => (
                      <div
                        key={s.sub.id}
                        className={`flex items-center justify-between text-xs ${
                          isSelected
                            ? 'text-white/85'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>• {s.sub.name}</span>
                        <span className="tabular-nums font-semibold">
                          {formatMoney(s.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`mt-4 text-xs ${
                      isSelected ? 'text-white/60' : 'text-slate-400'
                    }`}
                  >
                    بدون تراکنش در این بازه زمانی
                  </p>
                )}
              </div>

              <div
                className={`mt-5 pt-3 border-t flex items-center justify-between ${
                  isSelected
                    ? 'border-white/15'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
              >
                <span
                  className={`text-xs ${
                    isSelected ? 'text-white/75' : 'text-slate-500'
                  }`}
                >
                  جمع کل پوشه:
                </span>
                <span
                  className={`text-sm font-black tabular-nums ${
                    isSelected
                      ? 'text-emerald-300'
                      : folder.category.type === 'expense'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatMoney(folder.total, true, settings.currencyUnit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Folder Details */}
      {activeFolder && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-3">
              <CircularIcon
                name={activeFolder.category.icon}
                color={activeFolder.category.color}
                size="md"
                variant="solid"
              />
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ریزِ آرشیو پوشه «{activeFolder.category.name}»
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  مجموع: {formatMoney(activeFolder.total, true, settings.currencyUnit)} در{' '}
                  {toPersianDigits(activeFolder.items.length)} تراکنش
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              بستن پوشه
            </button>
          </div>

          {activeFolder.items.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              تراکنشی در این دسته وجود ندارد.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeFolder.items.map((tx) => {
                const sub = activeFolder.category.subCategories.find(
                  (s) => s.id === tx.subCategoryId
                );
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

                return (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-2xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CircularIcon
                        name={sub?.icon || activeFolder.category.icon}
                        color={activeFolder.category.color}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{sub?.name || 'عمومی'}</span>
                          <span>·</span>
                          <span>خرج: {spentByLabel}</span>
                          <span>·</span>
                          <span>ثبت: {recordedByLabel}</span>
                          {bank && (
                            <>
                              <span>·</span>
                              <span>{bank.name}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="tabular-nums">
                            {formatJalaliReadable(tx.jalaliDate)} ({toPersianDigits(tx.time)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0 tabular-nums">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {formatMoney(tx.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {settings.currencyUnit}
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
