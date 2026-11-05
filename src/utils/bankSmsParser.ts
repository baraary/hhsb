import {
  BankCard,
  Category,
  IranianBankId,
  PersonId,
  RecorderId,
  TransactionType,
} from '../types';
import {
  toEnglishDigits,
  getCurrentJalaliDateStr,
  getCurrentTimeStr,
} from './persian';

export interface ParsedBankSms {
  smsHash: string;
  rawText: string;
  sender?: string;
  type: TransactionType;
  amount: number; // In Toman
  rawAmountRial: number;
  isConvertedFromRial: boolean;
  title: string;
  jalaliDate: string;
  time: string;
  detectedBankId?: IranianBankId;
  detectedBankName?: string;
  matchedCardId: string;
  spentBy: PersonId;
  recordedBy: RecorderId;
  categoryId: string;
  subCategoryId: string;
  note: string;
}

export interface NativeAndroidSmsItem {
  id: string;
  address: string;
  body: string;
  date: number;
}

declare global {
  interface Window {
    AndroidSmsBridge?: {
      hasSmsPermission: () => boolean;
      requestSmsPermission: () => void;
      getRecentBankSms: (limit: number) => string; // JSON string of NativeAndroidSmsItem[]
    };
    onNativeBankSmsReceived?: (smsJson: string) => void;
  }
}

const BANK_KEYWORDS: { bankId: IranianBankId; name: string; keywords: string[] }[] = [
  { bankId: 'mellat', name: 'بانک ملت', keywords: ['بانک ملت', 'ملت', 'به پرداخت', 'mellat', '98200012'] },
  { bankId: 'blu', name: 'بلوبانک', keywords: ['بلوبانک', 'بلو ', 'بلو\n', 'blu', 'blubank'] },
  { bankId: 'saman', name: 'بانک سامان', keywords: ['بانک سامان', 'سامان', 'saman', '9820000842'] },
  { bankId: 'pasargad', name: 'بانک پاسارگاد', keywords: ['پاسارگاد', 'ویپاد', 'pasargad'] },
  { bankId: 'melli', name: 'بانک ملی', keywords: ['بانک ملی', 'ملی ایران', 'بام', 'melli'] },
  { bankId: 'tejarat', name: 'بانک تجارت', keywords: ['بانک تجارت', 'تجارت', 'tejarat'] },
  { bankId: 'saderat', name: 'بانک صادرات', keywords: ['بانک صادرات', 'صادرات', 'سپینو', 'saderat'] },
  { bankId: 'maskan', name: 'بانک مسکن', keywords: ['بانک مسکن', 'مسکن', 'maskan'] },
  { bankId: 'sepah', name: 'بانک سپه', keywords: ['بانک سپه', 'سپه', 'امیدبانک', 'sepah'] },
  { bankId: 'resalat', name: 'بانک رسالت', keywords: ['رسالت', 'قرض الحسنه رسالت', 'resalat'] },
  { bankId: 'ayandeh', name: 'بانک آینده', keywords: ['بانک آینده', 'آینده', 'آبان‌تتر', 'ayandeh'] },
  { bankId: 'parsian', name: 'بانک پارسیان', keywords: ['پارسیان', 'parsian'] },
  { bankId: 'keshavarzi', name: 'بانک کشاورزی', keywords: ['کشاورزی', 'keshavarzi'] },
  { bankId: 'refah', name: 'بانک رفاه', keywords: ['بانک رفاه', 'رفاه کارگران', 'refah'] },
  { bankId: 'mehr_iran', name: 'مهر ایران', keywords: ['مهر ایران', 'قرض الحسنه مهر'] },
  { bankId: 'shahr', name: 'بانک شهر', keywords: ['بانک شهر', 'همراه شهر'] },
  { bankId: 'gardeshgari', name: 'بانک گردشگری', keywords: ['گردشگری', 'توبانک'] },
  { bankId: 'eghtesad_novin', name: 'اقتصاد نوین', keywords: ['اقتصاد نوین', 'اقتصادنوین'] },
];

export function computeSmsHash(text: string): string {
  const normalized = toEnglishDigits(text).replace(/\s+/g, ' ').trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `sms_${(hash >>> 0).toString(16)}`;
}

/**
 * Checks if a message looks like an Iranian financial/bank SMS
 */
export function isLikelyBankSms(text: string, sender?: string): boolean {
  if (!text || text.trim().length < 12) return false;
  const normalized = toEnglishDigits(text)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');

  const hasMoneyWords =
    /برداشت|واریز|واريز|خرید|خريد|انتقال|مانده|موجودی|حساب|سپرده|کارت|پایا|ساتنا|پل|ریال|ريال|تومان|قسط/.test(
      normalized
    );
  const hasAmountNumber = /\d{1,3}(?:[,،]\d{3})+|\d{5,}/.test(normalized);

  if (sender) {
    const s = sender.toLowerCase();
    if (
      s.includes('bank') ||
      s.includes('blu') ||
      s.includes('mellat') ||
      s.includes('saman') ||
      s.startsWith('982000') ||
      s.startsWith('2000') ||
      s.startsWith('1000') ||
      s.startsWith('3000')
    ) {
      return hasMoneyWords && hasAmountNumber;
    }
  }

  return hasMoneyWords && hasAmountNumber;
}

/**
 * Splits a pasted block of text that may contain 1 or multiple bank SMS messages
 */
export function splitMultipleBankSms(rawInput: string): string[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // Split by double newline or separator lines if multiple SMS messages were pasted
  const chunks = trimmed
    .split(/\n\s*\n|\n-{3,}\n/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 10);

  return chunks.length > 0 ? chunks : [trimmed];
}

/**
 * Parses a single Iranian bank SMS into a structured transaction object
 */
export function parseIranianBankSms(
  rawText: string,
  cards: BankCard[],
  categories: Category[],
  convertRialToToman = true,
  sender?: string
): ParsedBankSms | null {
  const normalized = toEnglishDigits(rawText)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/٬/g, ',')
    .replace(/،/g, ',')
    .trim();

  if (!isLikelyBankSms(normalized, sender)) {
    return null;
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Detect Transaction Type (Expense vs Income)
  let type: TransactionType = 'expense';
  const incomeRegex =
    /واریز|واريز|سود سپرده|سود حساب|برگشت خرید|افزایش موجودی|واریز حقوق|دریافت پایا|دریافت ساتنا|انتقال به حساب شما|\+\s*\d{1,3}(?:,\d{3})+/;
  const expenseRegex =
    /برداشت|خرید|خريد|انتقال وجه|کسر از|پرداخت قبض|پرداخت قسط|کارمزد|کارت به کارت|حواله|-\s*\d{1,3}(?:,\d{3})+/;

  if (incomeRegex.test(normalized) && !/برداشت|خرید کالا|کسر/.test(normalized)) {
    type = 'income';
  } else if (expenseRegex.test(normalized)) {
    type = 'expense';
  }

  // 2. Extract Transaction Amount (ignoring مانده / موجودی / حساب / کارت lines)
  let extractedNumber = 0;

  // Priority A: Look for explicit patterns like "مبلغ: 1,200,000" or "برداشت 450,000" or "واریز: 2,500,000"
  const explicitPatterns = [
    /(?:مبلغ|برداشت|واریز|واريز|خرید|خريد|انتقال|قسط|قبض)\s*[:：-]?\s*([+-]?\d{1,3}(?:,\d{3})+|\d{5,12})/,
    /([+-]?\d{1,3}(?:,\d{3})+)\s*(?:ریال|ريال|تومان)/,
  ];

  for (const line of lines) {
    // Skip balance lines so we never confuse account balance with transaction amount
    if (/^(?:مانده|موجودی|موجودي|قابل برداشت)/.test(line)) continue;

    for (const pat of explicitPatterns) {
      const m = line.match(pat);
      if (m && m[1]) {
        const val = parseInt(m[1].replace(/\D/g, ''), 10);
        if (val >= 1000) {
          extractedNumber = val;
          break;
        }
      }
    }
    if (extractedNumber > 0) break;
  }

  // Priority B: Any comma-formatted number on a non-balance line
  if (extractedNumber === 0) {
    for (const line of lines) {
      if (/مانده|موجودی|موجودي|شبا|کارت|حساب|سپرده/.test(line) && !/برداشت|واریز|مبلغ/.test(line)) {
        continue;
      }
      const m = line.match(/(\d{1,3}(?:,\d{3})+)/);
      if (m && m[1]) {
        const val = parseInt(m[1].replace(/\D/g, ''), 10);
        if (val >= 1000) {
          extractedNumber = val;
          break;
        }
      }
    }
  }

  if (extractedNumber <= 0) {
    return null;
  }

  // Determine if the SMS amount is in Rial or Toman
  const explicitlyToman = /تومان/.test(normalized) && !/ریال|ريال/.test(normalized);
  const shouldDivideBy10 = convertRialToToman && !explicitlyToman;
  const finalAmountToman = shouldDivideBy10
    ? Math.round(extractedNumber / 10)
    : extractedNumber;

  // 3. Detect Bank & Match User's Saved BankCard
  let detectedBankId: IranianBankId | undefined;
  let detectedBankName: string | undefined;
  const combinedSource = `${sender || ''} ${normalized}`.toLowerCase();

  for (const b of BANK_KEYWORDS) {
    if (b.keywords.some((kw) => combinedSource.includes(kw.toLowerCase()))) {
      detectedBankId = b.bankId;
      detectedBankName = b.name;
      break;
    }
  }

  let matchedCard = cards.find((c) => c.isDefault) || cards[0];

  // Try matching last 4 digits of card number in SMS
  for (const card of cards) {
    const cleanCard = toEnglishDigits(card.cardNumber).replace(/\D/g, '');
    const last4 = cleanCard.slice(-4);
    if (last4.length === 4 && normalized.includes(last4)) {
      matchedCard = card;
      detectedBankId = card.bankId;
      break;
    }
  }

  // Otherwise match by bankId
  if (detectedBankId) {
    const cardByBank = cards.find((c) => c.bankId === detectedBankId);
    if (cardByBank) {
      matchedCard = cardByBank;
    }
  }

  // 4. Extract Jalali Date & Time from SMS
  let jalaliDate = getCurrentJalaliDateStr();
  let time = getCurrentTimeStr();

  // Match YYYY/MM/DD or YY/MM/DD (e.g. 1403/08/15 or 03/08/15)
  const dateMatch = normalized.match(/\b(14\d{2}|0[2-9])[/.-](0?[1-9]|1[0-2])[/.-](0?[1-9]|[12]\d|3[01])\b/);
  if (dateMatch) {
    const rawYear = dateMatch[1];
    const fullYear = rawYear.length === 2 ? `14${rawYear}` : rawYear;
    const month = dateMatch[2].padStart(2, '0');
    const day = dateMatch[3].padStart(2, '0');
    jalaliDate = `${fullYear}/${month}/${day}`;
  }

  // Match HH:MM
  const timeMatch = normalized.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
  }

  // 5. Smart Title & Category Suggestion
  let title = type === 'expense' ? 'برداشت بانکی (پیامک)' : 'واریز بانکی (پیامک)';

  if (/خرید از\s+([^\n]+)/.test(normalized)) {
    const m = normalized.match(/خرید از\s+([^\n]+)/);
    if (m && m[1]) title = `خرید از ${m[1].trim()}`;
  } else if (/فروشگاه\s+([^\n]+)/.test(normalized)) {
    const m = normalized.match(/فروشگاه\s+([^\n]+)/);
    if (m && m[1]) title = `خرید از فروشگاه ${m[1].trim()}`;
  } else if (/کارت به کارت|انتقال پل|پایا|ساتنا/.test(normalized)) {
    title = type === 'expense' ? 'انتقال وجه / کارت به کارت' : 'دریافت حواله / کارت به کارت';
  } else if (/قسط|وام/.test(normalized)) {
    title = 'پرداخت قسط وام';
  } else if (/قبض|شارژ/.test(normalized)) {
    title = 'پرداخت قبض / شارژ';
  } else if (/حقوق/.test(normalized)) {
    title = 'واریز حقوق';
  } else if (/سود/.test(normalized)) {
    title = 'واریز سود بانکی';
  } else if (/خرید|پایانه فروش|پوز|pos/i.test(normalized)) {
    title = `خرید کارتی${detectedBankName ? ` (${detectedBankName})` : ''}`;
  } else if (detectedBankName) {
    title = `${type === 'expense' ? 'برداشت از' : 'واریز به'} ${detectedBankName}`;
  }

  // Match category & subcategory
  const typeCategories = categories.filter((c) => c.type === type);
  let chosenCat = typeCategories[0] || categories[0];

  if (type === 'expense') {
    if (/هایپر|سوپر|کوروش|جانبو|میوه|نان|گوشت|پروتئین/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_groceries') || chosenCat;
    } else if (/رستوران|کافه|اسنپ فود|غذا|پیتزا|کباب/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_dining') || chosenCat;
    } else if (/اسنپ|تپسی|بنزین|سوخت|خودرو|پارکینگ/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_transport') || chosenCat;
    } else if (/داروخانه|پزشک|درمان|آزمایشگاه|بیمارستان/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_health') || chosenCat;
    } else if (/قبض|اجاره|شارژ|قسط/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_home') || chosenCat;
    }
  } else {
    if (/حقوق|پاداش/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_salary') || chosenCat;
    }
  }

  const chosenSub = chosenCat?.subCategories?.[0]?.id || '';
  const ownerPerson: PersonId = matchedCard?.owner || 'shared';
  const recorderPerson: RecorderId =
    matchedCard?.owner === 'fatemeh' ? 'fatemeh' : 'hootan';

  return {
    smsHash: computeSmsHash(normalized),
    rawText: rawText.trim(),
    sender,
    type,
    amount: finalAmountToman,
    rawAmountRial: extractedNumber,
    isConvertedFromRial: shouldDivideBy10,
    title,
    jalaliDate,
    time,
    detectedBankId,
    detectedBankName,
    matchedCardId: matchedCard?.id || '',
    spentBy: ownerPerson,
    recordedBy: recorderPerson,
    categoryId: chosenCat?.id || '',
    subCategoryId: chosenSub,
    note: rawText.trim().replace(/\s+/g, ' ').slice(0, 160),
  };
}

/**
 * Helpers for Native Android APK SMS Bridge
 */
export function isAndroidApkWithSmsSupport(): boolean {
  return typeof window !== 'undefined' && Boolean(window.AndroidSmsBridge);
}

export function hasAndroidSmsPermission(): boolean {
  try {
    return Boolean(window.AndroidSmsBridge?.hasSmsPermission());
  } catch {
    return false;
  }
}

export function requestAndroidSmsPermission(): void {
  try {
    window.AndroidSmsBridge?.requestSmsPermission();
  } catch {
    // ignore
  }
}

export function readAndroidBankSmsInbox(limit = 40): NativeAndroidSmsItem[] {
  try {
    if (!window.AndroidSmsBridge) return [];
    const json = window.AndroidSmsBridge.getRecentBankSms(limit);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
