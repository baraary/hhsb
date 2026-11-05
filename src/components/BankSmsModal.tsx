import React, { useState, useEffect } from 'react';
import {
  AppState,
  PersonId,
  RecorderId,
  Transaction,
} from '../types';
import {
  ParsedBankSms,
  parseIranianBankSms,
  splitMultipleBankSms,
  isAndroidApkWithSmsSupport,
  hasAndroidSmsPermission,
  requestAndroidSmsPermission,
  readAndroidBankSmsInbox,
} from '../utils/bankSmsParser';
import { formatMoney, toPersianDigits } from '../utils/persian';
import { CircularIcon } from './CircularIcon';

interface BankSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onImportTransactions: (txs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  onUpdateAutoCheckClipboard: (enabled: boolean) => void;
  initialRawSms?: string;
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

  const [rawInput, setRawInput] = useState(initialRawSms);
  const [convertRialToToman, setConvertRialToToman] = useState(
    settings.currencyUnit === 'تومان'
  );
  const [parsedItems, setParsedItems] = useState<ParsedBankSms[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isAndroidBridgeAvailable, setIsAndroidBridgeAvailable] = useState(false);

  useEffect(() => {
    setIsAndroidBridgeAvailable(isAndroidApkWithSmsSupport());
  }, [isOpen]);

  useEffect(() => {
    if (initialRawSms && isOpen) {
      setRawInput(initialRawSms);
      handleParseRawText(initialRawSms, convertRialToToman);
    }
  }, [initialRawSms, isOpen]);

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

    setParsedItems(results);
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

    const inboxSms = readAndroidBankSmsInbox(35);
    if (inboxSms.length === 0) {
      setStatusMsg('هیچ پیامک بانکی در صندوق پیامک‌های اخیر گوشی پیدا نشد.');
      return;
    }

    const results: ParsedBankSms[] = [];
    for (const item of inboxSms) {
      const parsed = parseIranianBankSms(
        item.body,
        cards,
        categories,
        convertRialToToman,
        item.address
      );
      if (parsed) {
        results.push(parsed);
      }
    }

    setParsedItems(results);
    setStatusMsg(
      `${toPersianDigits(results.length)} پیامک بانکی از صندوق پیامک گوشی استخراج شد.`
    );
  };

  const handleLoadSampleSms = () => {
    const sample = `بانک ملت
برداشت 3,850,000 ریال
حساب *8904
خرید از فروشگاه هایپراستار
1403/08/15-20:15
مانده: 485,000,000 ریال

---

بلوبانک
واریز به حساب شما
مبلغ: 85,000,000 ریال
1403/08/15 14:30
موجودی: 324,000,000 ریال`;
    setRawInput(sample);
    handleParseRawText(sample, convertRialToToman);
  };

  const handleUpdateParsedItem = (
    idx: number,
    patch: Partial<ParsedBankSms>
  ) => {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const handleImportSingle = (item: ParsedBankSms) => {
    onImportTransactions([
      {
        title: item.title,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        tags: [],
        spentBy: item.spentBy,
        recordedBy: item.recordedBy,
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
    const newItems = parsedItems.filter((item) => !isAlreadyImported(item.smsHash));
    if (newItems.length === 0) return;

    onImportTransactions(
      newItems.map((item) => ({
        title: item.title,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        tags: [],
        spentBy: item.spentBy,
        recordedBy: item.recordedBy,
        cardId: item.matchedCardId,
        jalaliDate: item.jalaliDate,
        time: item.time,
        note: item.note,
        smsHash: item.smsHash,
      }))
    );
    onClose();
  };

  const unimportedCount = parsedItems.filter(
    (item) => !isAlreadyImported(item.smsHash)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <CircularIcon name="smartphone" size="md" color="#10b981" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                خواندن هوشمند پیامک‌های بانکی (SMS)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تشخیص خودکار مبلغ (ریال به تومان)، نوع تراکنش، کارت بانکی، تاریخ و ساعت
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            بستن
          </button>
        </div>

        {/* Action Buttons Row: Native Android SMS Inbox + One-Tap Clipboard Paste */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleReadFromClipboard}
            className="py-3 px-4 rounded-2xl theme-bg text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
          >
            <span>📋 خواندن خودکار پیامک کپی‌شده (Clipboard)</span>
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
            <span>📲 اسکن صندوق پیامک گوشی (ویژه اپ APK اندروید)</span>
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
              امتحان با نمونه پیامک بانکی
            </button>
          </div>

          <textarea
            rows={4}
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

        {/* Parsed Transactions Preview List */}
        {parsedItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                تراکنش‌های استخراج‌شده ({toPersianDigits(parsedItems.length)} مورد)
              </h4>

              {unimportedCount > 0 && (
                <button
                  type="button"
                  onClick={handleImportAllNew}
                  className="px-4 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  ثبت یکجای همه ({toPersianDigits(unimportedCount)} تراکنش جدید) ✓
                </button>
              )}
            </div>

            <div className="space-y-3">
              {parsedItems.map((item, idx) => {
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
                            handleUpdateParsedItem(idx, {
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
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          عنوان تراکنش
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateParsedItem(idx, { title: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          کارت بانکی
                        </label>
                        <select
                          value={item.matchedCardId}
                          onChange={(e) =>
                            handleUpdateParsedItem(idx, { matchedCardId: e.target.value })
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
                            handleUpdateParsedItem(idx, {
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

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          سهمِ
                        </label>
                        <select
                          value={item.spentBy}
                          onChange={(e) =>
                            handleUpdateParsedItem(idx, {
                              spentBy: e.target.value as PersonId,
                              recordedBy:
                                e.target.value === 'fatemeh'
                                  ? 'fatemeh'
                                  : ('hootan' as RecorderId),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        >
                          <option value="shared">{settings.sharedLabel}</option>
                          <option value="hootan">{settings.hootanName}</option>
                          <option value="fatemeh">{settings.fatemehName}</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                        متن پیامک: {item.note}
                      </span>

                      {alreadySaved ? (
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                          ✓ قبلاً ثبت شده
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleImportSingle(item)}
                          className="px-3.5 py-1.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shrink-0"
                        >
                          ثبت این تراکنش +
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
};
