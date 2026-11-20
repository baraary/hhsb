import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clipboard, Smartphone, Check, Plus, X, Bell, RotateCcw, EyeOff } from 'lucide-react';
import { AppState, Category, TagItem, Transaction } from '../types';
import {
  ParsedBankSms,
  parseIranianBankSms,
  splitMultipleBankSms,
  isAndroidApkWithSmsSupport,
  hasAndroidSmsPermission,
  requestAndroidSmsPermission,
  hasAndroidNotificationPermission,
  requestAndroidNotificationPermission,
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
import { CircularIcon, CATEGORY_PALETTE_COLORS } from './CircularIcon';
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
  onDismissSms?: (smsHash: string) => void;
  onRestoreDismissedSms?: (smsHash: string) => void;
  onUpdateAutoCheckClipboard: (enabled: boolean) => void;
  onSaveCategory?: (cat: Category) => void;
  onSaveTag?: (tag: TagItem) => void;
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
  onDismissSms,
  onRestoreDismissedSms,
  onUpdateAutoCheckClipboard,
  onSaveCategory,
  onSaveTag,
  initialRawSms = '',
}) => {
  const {
    cards,
    categories,
    tags = [],
    transactions,
    importedSmsHashes = [],
    dismissedSmsHashes = [],
    settings,
  } = state;

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
  const [hasNotifPerm, setHasNotifPerm] = useState(true);

  // Scoped inline quick-add state per parsed SMS item
  const [inlineAdder, setInlineAdder] = useState<{
    smsHash: string;
    kind: 'category' | 'subcategory' | 'tag';
  } | null>(null);
  const [inlineDraftName, setInlineDraftName] = useState('');
  const [inlineDraftColor, setInlineDraftColor] = useState('#10b981');
  const [localDismissedHashes, setLocalDismissedHashes] = useState<string[]>([]);
  const [showDismissedList, setShowDismissedList] = useState(false);

  useEffect(() => {
    const hasBridge = isAndroidApkWithSmsSupport();
    setIsAndroidBridgeAvailable(hasBridge);
    setHasNotifPerm(hasBridge ? hasAndroidNotificationPermission() : true);
    setConvertRialToToman(settings.currencyUnit === 'تومان');
    if (!isOpen) {
      setInlineAdder(null);
      setInlineDraftName('');
      setShowDismissedList(false);
    }
  }, [isOpen, settings.currencyUnit]);

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

  const isDismissedSms = (smsHash: string): boolean => {
    return (
      dismissedSmsHashes.includes(smsHash) ||
      localDismissedHashes.includes(smsHash)
    );
  };

  const handleDismissItem = (item: ParsedBankSms) => {
    setLocalDismissedHashes((prev) =>
      prev.includes(item.smsHash) ? prev : [...prev, item.smsHash]
    );
    onDismissSms?.(item.smsHash);
    setStatusMsg(`پیامک «${item.title}» رد شد و دیگر در لیست ثبت نمایش داده نمی‌شود.`);
  };

  const handleRestoreDismissedItem = (item: ParsedBankSms) => {
    setLocalDismissedHashes((prev) => prev.filter((h) => h !== item.smsHash));
    onRestoreDismissedSms?.(item.smsHash);
    setStatusMsg(`پیامک «${item.title}» به لیست بازگردانده شد.`);
  };

  const handleParseRawText = (text: string, rialToToman = convertRialToToman) => {
    setStatusMsg('');
    const chunks = splitMultipleBankSms(text);
    const results: ParsedBankSms[] = [];

    for (const chunk of chunks) {
      const parsed = parseIranianBankSms(
        chunk,
        cards,
        categories,
        rialToToman,
        undefined,
        undefined,
        tags
      );
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
        item.date,
        tags
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
        tags: item.tags || [],
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

  const visibleParsedItems = filteredParsedItems.filter(
    (item) => !isDismissedSms(item.smsHash)
  );
  const dismissedInRangeItems = filteredParsedItems.filter(
    (item) => isDismissedSms(item.smsHash) && !isAlreadyImported(item.smsHash)
  );

  const handleImportAllNew = () => {
    const newItems = visibleParsedItems.filter(
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
        tags: item.tags || [],
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

  const unimportedCount = visibleParsedItems.filter(
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

        {/* Android APK Background SMS Notification Permission Strip */}
        {isAndroidBridgeAvailable && !hasNotifPerm && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Bell size={15} className="shrink-0" />
              <span>برای دریافت نوتیفیکیشن فوری پیامک بانکی وقتی اپ بسته است، مجوز اعلان را فعال کنید:</span>
            </div>
            <button
              type="button"
              onClick={() => {
                requestAndroidNotificationPermission();
                setTimeout(() => setHasNotifPerm(hasAndroidNotificationPermission()), 1500);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
            >
              فعال‌سازی اعلان پس‌زمینه
            </button>
          </div>
        )}

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
                تراکنش‌های استخراج‌شده در این بازه ({toPersianDigits(visibleParsedItems.length)} مورد)
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                {dismissedInRangeItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDismissedList((prev) => !prev)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <EyeOff size={13} />
                    <span>
                      {toPersianDigits(dismissedInRangeItems.length)} رد شده
                      {showDismissedList ? ' (بستن)' : ' (مشاهده)'}
                    </span>
                  </button>
                )}

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
            </div>

            {showDismissedList && dismissedInRangeItems.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    پیامک‌های رد شده در این بازه
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    برای برگرداندن به لیست ثبت، روی بازگردانی بزنید
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dismissedInRangeItems.map((dItem, dIdx) => (
                    <div
                      key={`dismissed_${dItem.smsHash}_${dIdx}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {dItem.title} ·{' '}
                          <span className="tabular-nums">
                            {formatMoney(dItem.amount)} {settings.currencyUnit}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {dItem.note}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreDismissedItem(dItem)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        <span>بازگردانی</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleParsedItems.length === 0 && dismissedInRangeItems.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                تمام پیامک‌های این بازه رد شده‌اند. در صورت نیاز می‌توانید از دکمه «رد شده» آن‌ها را بازگردانی کنید.
              </div>
            )}

            <div className="space-y-3">
              {visibleParsedItems.map((item, idx) => {
                const alreadySaved = isAlreadyImported(item.smsHash);
                const itemCategories = categories.filter((c) => c.type === item.type);
                const selectedCategoryObj =
                  itemCategories.find((c) => c.id === item.categoryId) ||
                  itemCategories[0] ||
                  categories[0];
                const subCategoryList = selectedCategoryObj?.subCategories || [];

                const switchItemType = (newType: 'expense' | 'income') => {
                  if (item.type === newType) return;
                  const newTypeCats = categories.filter((c) => c.type === newType);
                  const firstCat = newTypeCats[0] || categories[0];
                  const firstSub = firstCat?.subCategories?.[0]?.id || '';
                  let nextTitle = item.title;
                  if (newType === 'income' && nextTitle.startsWith('برداشت')) {
                    nextTitle = nextTitle.replace(/^برداشت از/, 'واریز به').replace(/^برداشت/, 'واریز');
                  } else if (newType === 'expense' && nextTitle.startsWith('واریز')) {
                    nextTitle = nextTitle.replace(/^واریز به/, 'برداشت از').replace(/^واریز/, 'برداشت');
                  }
                  handleUpdateParsedItem(item.smsHash, {
                    type: newType,
                    categoryId: firstCat?.id || '',
                    subCategoryId: firstSub,
                    title: nextTitle,
                  });
                };

                const toggleItemTag = (tagId: string) => {
                  const currentTags = item.tags || [];
                  const nextTags = currentTags.includes(tagId)
                    ? currentTags.filter((id) => id !== tagId)
                    : [...currentTags, tagId];
                  handleUpdateParsedItem(item.smsHash, { tags: nextTags });
                };

                return (
                  <div
                    key={`${item.smsHash}_${idx}`}
                    className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      alreadySaved
                        ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-800/20 opacity-65'
                        : item.type === 'income'
                        ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-slate-800/70'
                        : 'border-rose-500/35 bg-rose-500/5 dark:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Explicit 2-button Segmented Switch for Expense vs Income */}
                        <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => switchItemType('expense')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                              item.type === 'expense'
                                ? 'bg-rose-500 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            برداشت / هزینه
                          </button>
                          <button
                            type="button"
                            onClick={() => switchItemType('income')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                              item.type === 'income'
                                ? 'bg-emerald-500 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            واریز / درآمد
                          </button>
                        </div>

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
                          {item.type === 'income' ? '+' : '-'}
                          {formatMoney(item.amount)} {settings.currencyUnit}
                        </span>
                      </div>
                    </div>

                    {/* Editable Fields before Saving: Title, Card, Category, Subcategory */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          عنوان تراکنش
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateParsedItem(item.smsHash, { title: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="sm:col-span-3">
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
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {cards.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-400">
                            دسته‌بندی
                          </label>
                          {onSaveCategory && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  inlineAdder?.smsHash === item.smsHash &&
                                  inlineAdder.kind === 'category'
                                ) {
                                  setInlineAdder(null);
                                } else {
                                  setInlineAdder({ smsHash: item.smsHash, kind: 'category' });
                                  setInlineDraftName('');
                                  setInlineDraftColor('#10b981');
                                }
                              }}
                              className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <Plus size={10} strokeWidth={2.8} />
                              <span>جدید</span>
                            </button>
                          )}
                        </div>
                        <select
                          value={selectedCategoryObj?.id || item.categoryId}
                          onChange={(e) => {
                            const cat = categories.find((c) => c.id === e.target.value);
                            handleUpdateParsedItem(item.smsHash, {
                              categoryId: e.target.value,
                              subCategoryId: cat?.subCategories[0]?.id || '',
                            });
                          }}
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {itemCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-400">
                            زیردسته
                          </label>
                          {onSaveCategory && selectedCategoryObj && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  inlineAdder?.smsHash === item.smsHash &&
                                  inlineAdder.kind === 'subcategory'
                                ) {
                                  setInlineAdder(null);
                                } else {
                                  setInlineAdder({ smsHash: item.smsHash, kind: 'subcategory' });
                                  setInlineDraftName('');
                                }
                              }}
                              className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <Plus size={10} strokeWidth={2.8} />
                              <span>جدید</span>
                            </button>
                          )}
                        </div>
                        <select
                          value={item.subCategoryId || subCategoryList[0]?.id || ''}
                          onChange={(e) =>
                            handleUpdateParsedItem(item.smsHash, {
                              subCategoryId: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {subCategoryList.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Inline Quick-Add Form for Category / SubCategory / Tag on this SMS item */}
                    {inlineAdder?.smsHash === item.smsHash && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/35 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={inlineDraftName}
                            onChange={(e) => setInlineDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const clean = inlineDraftName.trim().replace(/^#+/, '');
                                if (!clean) return;
                                if (inlineAdder.kind === 'category' && onSaveCategory) {
                                  const now = Date.now();
                                  const subId = `sub_${now}`;
                                  const newCat: Category = {
                                    id: `cat_${now}`,
                                    name: clean,
                                    type: item.type === 'income' ? 'income' : 'expense',
                                    icon: 'shopping-cart',
                                    color: inlineDraftColor,
                                    subCategories: [{ id: subId, name: 'عمومی', icon: 'shopping-cart' }],
                                  };
                                  onSaveCategory(newCat);
                                  handleUpdateParsedItem(item.smsHash, {
                                    categoryId: newCat.id,
                                    subCategoryId: subId,
                                  });
                                } else if (
                                  inlineAdder.kind === 'subcategory' &&
                                  onSaveCategory &&
                                  selectedCategoryObj
                                ) {
                                  const subId = `sub_${Date.now()}`;
                                  onSaveCategory({
                                    ...selectedCategoryObj,
                                    subCategories: [
                                      ...selectedCategoryObj.subCategories,
                                      { id: subId, name: clean, icon: selectedCategoryObj.icon },
                                    ],
                                  });
                                  handleUpdateParsedItem(item.smsHash, {
                                    categoryId: selectedCategoryObj.id,
                                    subCategoryId: subId,
                                  });
                                } else if (inlineAdder.kind === 'tag' && onSaveTag) {
                                  const newTag: TagItem = {
                                    id: `tag_${Date.now()}`,
                                    name: clean,
                                    color: inlineDraftColor,
                                  };
                                  onSaveTag(newTag);
                                  handleUpdateParsedItem(item.smsHash, {
                                    tags: [...(item.tags || []), newTag.id],
                                  });
                                }
                                setInlineAdder(null);
                                setInlineDraftName('');
                              }
                            }}
                            placeholder={
                              inlineAdder.kind === 'category'
                                ? `نام دسته‌بندی جدید (${item.type === 'income' ? 'درآمد' : 'هزینه'})...`
                                : inlineAdder.kind === 'subcategory'
                                ? `نام زیردسته جدید برای «${selectedCategoryObj?.name || ''}»...`
                                : 'نام تگ جدید (مثلاً: سفر، ضروری)...'
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            disabled={!inlineDraftName.trim()}
                            onClick={() => {
                              const clean = inlineDraftName.trim().replace(/^#+/, '');
                              if (!clean) return;
                              if (inlineAdder.kind === 'category' && onSaveCategory) {
                                const now = Date.now();
                                const subId = `sub_${now}`;
                                const newCat: Category = {
                                  id: `cat_${now}`,
                                  name: clean,
                                  type: item.type === 'income' ? 'income' : 'expense',
                                  icon: 'shopping-cart',
                                  color: inlineDraftColor,
                                  subCategories: [{ id: subId, name: 'عمومی', icon: 'shopping-cart' }],
                                };
                                onSaveCategory(newCat);
                                handleUpdateParsedItem(item.smsHash, {
                                  categoryId: newCat.id,
                                  subCategoryId: subId,
                                });
                              } else if (
                                inlineAdder.kind === 'subcategory' &&
                                onSaveCategory &&
                                selectedCategoryObj
                              ) {
                                const subId = `sub_${Date.now()}`;
                                onSaveCategory({
                                  ...selectedCategoryObj,
                                  subCategories: [
                                    ...selectedCategoryObj.subCategories,
                                    { id: subId, name: clean, icon: selectedCategoryObj.icon },
                                  ],
                                });
                                handleUpdateParsedItem(item.smsHash, {
                                  categoryId: selectedCategoryObj.id,
                                  subCategoryId: subId,
                                });
                              } else if (inlineAdder.kind === 'tag' && onSaveTag) {
                                const newTag: TagItem = {
                                  id: `tag_${Date.now()}`,
                                  name: clean,
                                  color: inlineDraftColor,
                                };
                                onSaveTag(newTag);
                                handleUpdateParsedItem(item.smsHash, {
                                  tags: [...(item.tags || []), newTag.id],
                                });
                              }
                              setInlineAdder(null);
                              setInlineDraftName('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg theme-bg text-white text-[11px] font-extrabold cursor-pointer disabled:opacity-45 shrink-0 flex items-center gap-1"
                          >
                            <Check size={12} strokeWidth={2.6} />
                            <span>افزودن</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineAdder(null)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                            aria-label="انصراف"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        {(inlineAdder.kind === 'category' || inlineAdder.kind === 'tag') && (
                          <div className="flex flex-wrap items-center gap-2 p-1.5">
                            {CATEGORY_PALETTE_COLORS.map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setInlineDraftColor(col)}
                                className={`w-5 h-5 rounded-full cursor-pointer transition-transform flex items-center justify-center text-white ${
                                  inlineDraftColor === col
                                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                                    : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: col }}
                                aria-label="انتخاب رنگ"
                              >
                                {inlineDraftColor === col && <Check size={10} strokeWidth={3} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Tags Selector Row + Quick Add Tag */}
                    <div className="pt-0.5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400">
                          تگ‌ها (انتخاب اختیاری):
                        </label>
                        {onSaveTag && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                inlineAdder?.smsHash === item.smsHash &&
                                inlineAdder.kind === 'tag'
                              ) {
                                setInlineAdder(null);
                              } else {
                                setInlineAdder({ smsHash: item.smsHash, kind: 'tag' });
                                setInlineDraftName('');
                                setInlineDraftColor('#8b5cf6');
                              }
                            }}
                            className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            <Plus size={10} strokeWidth={2.8} />
                            <span>تگ جدید</span>
                          </button>
                        )}
                      </div>
                      <div
                        data-no-swipe="true"
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        {tags.map((tag) => {
                          const isTagSelected = (item.tags || []).includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleItemTag(tag.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer flex items-center gap-1 transition-all ${
                                isTagSelected
                                  ? 'text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                              }`}
                              style={
                                isTagSelected
                                  ? { backgroundColor: tag.color || '#10b981' }
                                  : undefined
                              }
                            >
                              <span>#{tag.name}</span>
                              {isTagSelected && <Check size={11} strokeWidth={2.8} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[11px] text-slate-400 truncate max-w-full sm:max-w-md">
                        متن پیامک: {item.note}
                      </span>

                      {alreadySaved ? (
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                          <Check size={14} strokeWidth={2.5} />
                          <span>قبلاً ثبت شده</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDismissItem(item)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                            title="رد کردن این پیامک (عدم ثبت به‌عنوان تراکنش)"
                          >
                            <X size={13} strokeWidth={2.5} />
                            <span>رد کردن</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleImportSingle(item)}
                            className="px-3.5 py-1.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>ثبت این تراکنش</span>
                          </button>
                        </div>
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
