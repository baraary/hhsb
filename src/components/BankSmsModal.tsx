import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clipboard, Smartphone, Check, Plus, X } from 'lucide-react';
import { AppState, Transaction } from '../types';
import {
  ParsedBankSms,
  parseIranianBankSms,
  splitMultipleBankSms,
  isAndroidApkWithSmsSupport,
  hasAndroidSmsPermission,
  requestAndroidSmsPermission,
  readAndroidBankSmsInbox,
} from '../utils/bankSmsParser';
import {
  formatMoney,
  toPersianDigits,
  toEnglishDigits,
  getCurrentJalaliDateStr,
  shiftJalaliDateByDays,
  formatJalaliReadable,
} from '../utils/persian';
import { CircularIcon } from './CircularIcon';
import { JalaliDateInput } from './JalaliDateTimePicker';

export type SmsDateRangePreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'custom'
  | 'all';

interface BankSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onImportTransactions: (txs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  onUpdateAutoCheckClipboard: (enabled: boolean) => void;
  initialRawSms?: string;
}

function normalizeJalaliComparable(dateStr: string): string {
  const clean = toEnglishDigits(dateStr || '').trim();
  const parts = clean.split('/');
  if (parts.length !== 3) return clean;
  const y = parts[0].length === 2 ? `14${parts[0]}` : parts[0].padStart(4, '0');
  const m = parts[1].padStart(2, '0');
  const d = parts[2].padStart(2, '0');
  return `${y}/${m}/${d}`;
}

export const BankSmsModal: React.FC<BankSmsModalProps> = ({
  isOpen,
  onClose,
  state,
  onImportTransactions,
  onUpdateAutoCheckClipboard,
  initialRawSms = '',
}) => {
  const { cards, categories, transactions, importedSmsHashes = [], settings } = state;

  const todayJalali = useMemo(() => getCurrentJalaliDateStr(), [isOpen]);
  const yesterdayJalali = useMemo(
    () => shiftJalaliDateByDays(todayJalali, -1),
    [todayJalali]
  );
  const weekAgoJalali = useMemo(
    () => shiftJalaliDateByDays(todayJalali, -7),
    [todayJalali]
  );
  const monthAgoJalali = useMemo(
    () => shiftJalaliDateByDays(todayJalali, -30),
    [todayJalali]
  );

  const [dateRangePreset, setDateRangePreset] = useState<SmsDateRangePreset>('week');
  const [customFromDate, setCustomFromDate] = useState<string>(() =>
    shiftJalaliDateByDays(getCurrentJalaliDateStr(), -7)
  );
  const [customToDate, setCustomToDate] = useState<string>(() =>
    getCurrentJalaliDateStr()
  );

  const [rawInput, setRawInput] = useState(initialRawSms);
  const [convertRialToToman, setConvertRialToToman] = useState(
    settings.currencyUnit === 'تومان'
  );
  const [allParsedItems, setAllParsedItems] = useState<ParsedBankSms[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isAndroidBridgeAvailable, setIsAndroidBridgeAvailable] = useState(false);

  useEffect(() => {
    setIsAndroidBridgeAvailable(isAndroidApkWithSmsSupport());
  }, [isOpen]);

  useEffect(() => {
    if (initialRawSms && isOpen) {
      setRawInput(initialRawSms);
      setDateRangePreset('all');
      handleParseRawText(initialRawSms, convertRialToToman);
    }
  }, [initialRawSms, isOpen]);

  const activeRangeBounds = useMemo((): { from: string; to: string } | null => {
    if (dateRangePreset === 'all') return null;
    if (dateRangePreset === 'today') {
      return { from: todayJalali, to: todayJalali };
    }
    if (dateRangePreset === 'yesterday') {
      return { from: yesterdayJalali, to: yesterdayJalali };
    }
    if (dateRangePreset === 'week') {
      return { from: weekAgoJalali, to: todayJalali };
    }
    if (dateRangePreset === 'month') {
      return { from: monthAgoJalali, to: todayJalali };
    }
    const normA = normalizeJalaliComparable(customFromDate || todayJalali);
    const normB = normalizeJalaliComparable(customToDate || todayJalali);
    return normA <= normB
      ? { from: normA, to: normB }
      : { from: normB, to: normA };
  }, [
    dateRangePreset,
    todayJalali,
    yesterdayJalali,
    weekAgoJalali,
    monthAgoJalali,
    customFromDate,
    customToDate,
  ]);

  const filteredParsedItems = useMemo(() => {
    if (!activeRangeBounds) return allParsedItems;
    const { from, to } = activeRangeBounds;
    return allParsedItems.filter((item) => {
      const itemDate = normalizeJalaliComparable(item.jalaliDate);
      const recvDate = item.receivedJalaliDate
        ? normalizeJalaliComparable(item.receivedJalaliDate)
        : null;
      const inRangeBySmsDate = itemDate >= from && itemDate <= to;
      const inRangeByRecvDate = recvDate ? recvDate >= from && recvDate <= to : false;
      return inRangeBySmsDate || inRangeByRecvDate;
    });
  }, [allParsedItems, activeRangeBounds]);

  if (!isOpen) return null;

  const isAlreadyImported = (smsHash: string): boolean => {
    return (
      importedSmsHashes.includes(smsHash) ||
      transactions.some((t) => t.smsHash === smsHash)
    );
  };

  const handleParseRawText = (text: string, rialToToman = convertRialToToman) => {
    setStatusMsg('');
    const chunks = splitMultipleBankSms(text);
    const results: ParsedBankSms[] = [];

    for (const chunk of chunks) {
      const parsed = parseIranianBankSms(chunk, cards, categories, rialToToman);
      if (parsed) {
        results.push(parsed);
      }
    }

    setAllParsedItems(results);
    if (text.trim() && results.length === 0) {
      setStatusMsg(
        'متن وارد شده شبیه پیامک بانکی تشخیص داده نشد. مطمئن شوید مبلغ و کلمه واریز/برداشت/خرید در متن وجود دارد.'
      );
    }
  };

  const handleReadFromClipboard = async () => {
    setStatusMsg('');
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        setStatusMsg('کلیپ‌بورد شما خالی است. ابتدا پیامک بانکی را کپی کنید.');
        return;
      }
      setRawInput(clipText);
      handleParseRawText(clipText, convertRialToToman);
    } catch {
      setStatusMsg(
        'مرورگر اجازه خواندن خودکار کلیپ‌بورد را نداد. لطفاً متن پیامک را در کادر زیر Paste (جایگذاری) کنید.'
      );
    }
  };

  const handleScanAndroidInbox = () => {
    setStatusMsg('');
    if (!isAndroidApkWithSmsSupport()) {
      setStatusMsg(
        'خواندن مستقیم صندوق پیامک فقط در نسخه نصبی اندروید (hamhesab.apk) فعال است. در مرورگر از دکمه «خواندن از کلیپ‌بورد» استفاده کنید.'
      );
      return;
    }

    if (!hasAndroidSmsPermission()) {
      requestAndroidSmsPermission();
      setStatusMsg(
        'لطفاً در پنجره بازشده روی گوشی، مجوز دسترسی به پیامک (Allow) را تایید کنید و دوباره روی این دکمه بزنید.'
      );
      return;
    }

    // Read a larger batch so 1-week, 1-month, and custom date ranges are fully covered
    const scanLimit =
      dateRangePreset === 'today' || dateRangePreset === 'yesterday'
        ? 60
        : dateRangePreset === 'week'
        ? 120
        : 250;

    const inboxSms = readAndroidBankSmsInbox(scanLimit);
    if (inboxSms.length === 0) {
      setStatusMsg('هیچ پیامک بانکی در صندوق پیامک‌های گوشی پیدا نشد.');
      return;
    }

    const results: ParsedBankSms[] = [];
    for (const item of inboxSms) {
      const parsed = parseIranianBankSms(
        item.body,
        cards,
        categories,
        convertRialToToman,
        item.address,
        item.date
      );
      if (parsed) {
        results.push(parsed);
      }
    }

    setAllParsedItems(results);

    // Count how many match the currently selected date range
    const matchingCount = activeRangeBounds
      ? results.filter((item) => {
          const itemDate = normalizeJalaliComparable(item.jalaliDate);
          const recvDate = item.receivedJalaliDate
            ? normalizeJalaliComparable(item.receivedJalaliDate)
            : null;
          return (
            (itemDate >= activeRangeBounds.from && itemDate <= activeRangeBounds.to) ||
            (recvDate
              ? recvDate >= activeRangeBounds.from && recvDate <= activeRangeBounds.to
              : false)
          );
        }).length
      : results.length;

    setStatusMsg(
      `${toPersianDigits(matchingCount)} پیامک بانکی در بازه زمانی انتخابی استخراج شد (کل پیامک‌های بانکی بررسی‌شده: ${toPersianDigits(
        results.length
      )} مورد).`
    );
  };

  const handleLoadSampleSms = () => {
    const threeDaysAgo = shiftJalaliDateByDays(todayJalali, -3);
    const sample = `بانک ملت
برداشت 3,850,000 ریال
حساب *8904
خرید از فروشگاه هایپراستار
${todayJalali}-20:15
مانده: 485,000,000 ریال

---

بلوبانک
واریز به حساب شما
مبلغ: 85,000,000 ریال
${yesterdayJalali} 14:30
موجودی: 324,000,000 ریال

---

بانک سامان
برداشت: 1,450,000 ریال
خرید از کافه لمیز
${threeDaysAgo} 18:45
مانده: 112,000,000 ریال`;
    setRawInput(sample);
    handleParseRawText(sample, convertRialToToman);
  };

  const handleUpdateParsedItem = (
    smsHash: string,
    patch: Partial<ParsedBankSms>
  ) => {
    setAllParsedItems((prev) =>
      prev.map((item) => (item.smsHash === smsHash ? { ...item, ...patch } : item))
    );
  };

  const activeUserId = state.userId || 'hootan';

  const handleImportSingle = (item: ParsedBankSms) => {
    onImportTransactions([
      {
        title: item.title,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        tags: [],
        spentBy: activeUserId,
        recordedBy: activeUserId,
        cardId: item.matchedCardId,
        jalaliDate: item.jalaliDate,
        time: item.time,
        note: item.note,
        smsHash: item.smsHash,
      },
    ]);
    setStatusMsg(`تراکنش «${item.title}» با موفقیت ثبت شد.`);
  };

  const handleImportAllNew = () => {
    const newItems = filteredParsedItems.filter(
      (item) => !isAlreadyImported(item.smsHash)
    );
    if (newItems.length === 0) return;

    onImportTransactions(
      newItems.map((item) => ({
        title: item.title,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        tags: [],
        spentBy: activeUserId,
        recordedBy: activeUserId,
        cardId: item.matchedCardId,
        jalaliDate: item.jalaliDate,
        time: item.time,
        note: item.note,
        smsHash: item.smsHash,
      }))
    );
    onClose();
  };

  const unimportedCount = filteredParsedItems.filter(
    (item) => !isAlreadyImported(item.smsHash)
  ).length;

  const hiddenByDateFilterCount = allParsedItems.length - filteredParsedItems.length;

  const DATE_PRESETS: { id: SmsDateRangePreset; label: string }[] = [
    { id: 'today', label: 'امروز' },
    { id: 'yesterday', label: 'دیروز' },
    { id: 'week', label: 'یک هفته قبل' },
    { id: 'month', label: 'یک ماه قبل' },
    { id: 'custom', label: 'بازه دلخواه' },
    { id: 'all', label: 'همه تاریخ‌ها' },
  ];

  const modalContent = (
    <div
      data-no-swipe="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <CircularIcon name="smartphone" size="md" color="#10b981" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                خواندن هوشمند پیامک‌های بانکی (SMS)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                فیلتر بر اساس بازه زمانی، تشخیص خودکار مبلغ، کارت بانکی، تاریخ و ساعت
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <X size={14} />
            <span>بستن</span>
          </button>
        </div>

        {/* Date Range Filter Selector */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <Calendar size={14} className="theme-text" />
              <span>بازه زمانی خواندن پیامک‌های بانکی:</span>
            </div>

            {activeRangeBounds ? (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                {activeRangeBounds.from === activeRangeBounds.to
                  ? formatJalaliReadable(activeRangeBounds.from)
                  : `از ${formatJalaliReadable(activeRangeBounds.from)} تا ${formatJalaliReadable(
                      activeRangeBounds.to
                    )}`}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                بدون محدودیت تاریخ
              </span>
            )}
          </div>

          <div
            data-no-swipe="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center gap-1.5"
          >
            {DATE_PRESETS.map((preset) => {
              const active = dateRangePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDateRangePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                    active
                      ? 'theme-bg text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {dateRangePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <JalaliDateInput
                label="از تاریخ"
                value={customFromDate}
                onChange={setCustomFromDate}
              />
              <JalaliDateInput
                label="تا تاریخ"
                value={customToDate}
                onChange={setCustomToDate}
              />
            </div>
          )}
        </div>

        {/* Action Buttons Row: Native Android SMS Inbox + One-Tap Clipboard Paste */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleReadFromClipboard}
            className="py-3 px-4 rounded-2xl theme-bg text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
          >
            <Clipboard size={15} strokeWidth={2.3} />
            <span>خواندن خودکار پیامک کپی‌شده (Clipboard)</span>
          </button>

          <button
            type="button"
            onClick={handleScanAndroidInbox}
            className={`py-3 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isAndroidBridgeAvailable
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Smartphone size={15} strokeWidth={2.3} />
            <span>اسکن صندوق پیامک در این بازه (اپ APK)</span>
          </button>
        </div>

        {/* Options Strip: Rial to Toman & Auto Clipboard Check */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={convertRialToToman}
              onChange={(e) => {
                const next = e.target.checked;
                setConvertRialToToman(next);
                if (rawInput.trim()) {
                  handleParseRawText(rawInput, next);
                }
              }}
              className="rounded accent-emerald-600 w-4 h-4"
            />
            <span>تبدیل خودکار ریال پیامک به تومان (حذف یک صفر)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(settings.autoCheckClipboardSms)}
              onChange={(e) => onUpdateAutoCheckClipboard(e.target.checked)}
              className="rounded accent-emerald-600 w-4 h-4"
            />
            <span>پیشنهاد خودکار ثبت وقتی پیامک بانکی کپی می‌کنید</span>
          </label>
        </div>

        {/* Manual / Multi-SMS Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              متن یک یا چند پیامک بانکی (ملت، بلوبانک، سامان، پاسارگاد، ملی و...):
            </label>
            <button
              type="button"
              onClick={handleLoadSampleSms}
              className="text-[11px] font-bold theme-text hover:underline cursor-pointer"
            >
              امتحان با ۳ نمونه پیامک (امروز، دیروز، هفته قبل)
            </button>
          </div>

          <textarea
            rows={3}
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              handleParseRawText(e.target.value, convertRialToToman);
            }}
            placeholder="پیامک یا پیامک‌های بانکی خود را اینجا Paste کنید تا خودکار مبلغ، کارت، تاریخ و دسته‌بندی استخراج شود..."
            className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
            {statusMsg}
          </div>
        )}

        {/* Notice when some parsed items are hidden by the selected date range */}
        {allParsedItems.length > 0 && hiddenByDateFilterCount > 0 && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              {toPersianDigits(hiddenByDateFilterCount)} پیامک خارج از بازه زمانی انتخاب‌شده قرار دارد و پنهان شده است.
            </span>
            <button
              type="button"
              onClick={() => setDateRangePreset('all')}
              className="font-extrabold theme-text hover:underline cursor-pointer"
            >
              نمایش همه ({toPersianDigits(allParsedItems.length)} مورد)
            </button>
          </div>
        )}

        {/* Parsed Transactions Preview List */}
        {filteredParsedItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                تراکنش‌های استخراج‌شده در این بازه ({toPersianDigits(filteredParsedItems.length)} مورد)
              </h4>

              {unimportedCount > 0 && (
                <button
                  type="button"
                  onClick={handleImportAllNew}
                  className="px-4 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>ثبت یکجای همه ({toPersianDigits(unimportedCount)} تراکنش جدید)</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredParsedItems.map((item, idx) => {
                const alreadySaved = isAlreadyImported(item.smsHash);
                const itemCategories = categories.filter((c) => c.type === item.type);

                return (
                  <div
                    key={`${item.smsHash}_${idx}`}
                    className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      alreadySaved
                        ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-800/20 opacity-65'
                        : 'border-emerald-500/40 bg-emerald-500/5 dark:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateParsedItem(item.smsHash, {
                              type: item.type === 'expense' ? 'income' : 'expense',
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                            item.type === 'expense'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.type === 'expense' ? 'برداشت / هزینه' : 'واریز / درآمد'}
                        </button>

                        {item.detectedBankName && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            · {item.detectedBankName}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 tabular-nums">
                          · {toPersianDigits(item.jalaliDate)} ساعت {toPersianDigits(item.time)}
                        </span>
                      </div>

                      <div className="text-left tabular-nums">
                        <span
                          className={`text-sm sm:text-base font-black ${
                            item.type === 'expense'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatMoney(item.amount)} {settings.currencyUnit}
                        </span>
                      </div>
                    </div>

                    {/* Editable Fields before Saving */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          عنوان تراکنش
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateParsedItem(item.smsHash, { title: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          کارت بانکی
                        </label>
                        <select
                          value={item.matchedCardId}
                          onChange={(e) =>
                            handleUpdateParsedItem(item.smsHash, {
                              matchedCardId: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        >
                          {cards.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          دسته‌بندی
                        </label>
                        <select
                          value={item.categoryId}
                          onChange={(e) => {
                            const cat = categories.find((c) => c.id === e.target.value);
                            handleUpdateParsedItem(item.smsHash, {
                              categoryId: e.target.value,
                              subCategoryId: cat?.subCategories[0]?.id || '',
                            });
                          }}
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        >
                          {itemCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                        متن پیامک: {item.note}
                      </span>

                      {alreadySaved ? (
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                          <Check size={14} strokeWidth={2.5} />
                          <span>قبلاً ثبت شده</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleImportSingle(item)}
                          className="px-3.5 py-1.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                          <span>ثبت این تراکنش</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
