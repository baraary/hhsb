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
  formatDateToJalaliStr,
  formatTimeFromDate,
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
  receivedJalaliDate?: string;
  time: string;
  detectedBankId?: IranianBankId;
  detectedBankName?: string;
  matchedCardId: string;
  spentBy: PersonId;
  recordedBy: RecorderId;
  categoryId: string;
  subCategoryId: string;
  tags: string[];
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
  { bankId: 'pasargad', name: 'بانک پاسارگاد', keywords: ['پاسارگاد', 'ویپاد', 'pasargad', 'wepod'] },
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
  { bankId: 'mehr_iran', name: 'مهر ایران', keywords: ['مهر ایران', 'قرض الحسنه مهر', 'بانک مهر'] },
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
 * Strips invisible Unicode directional marks (LRM, RLM, LRE, RLE, PDF, etc.) and normalizes digits/commas
 */
function normalizeSmsText(rawText: string): string {
  return toEnglishDigits(rawText || '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/＋/g, '+')
    .replace(/－|−|–/g, '-')
    .replace(/٬/g, ',')
    .replace(/،/g, ',')
    .trim();
}

/**
 * Checks if a message looks like an Iranian financial/bank SMS
 */
export function isLikelyBankSms(text: string, sender?: string): boolean {
  if (!text || text.trim().length < 10) return false;
  const normalized = normalizeSmsText(text);

  const hasMoneyWords =
    /برداشت|واریز|واريز|خرید|خريد|انتقال|مانده|موجودی|موجودي|حساب|سپرده|کارت|پایا|ساتنا|پل|ریال|ريال|تومان|قسط|بستانکار|بدهکار|افزایش|کسر/.test(
      normalized
    );
  const hasAmountNumber = /\d{1,3}(?:,\d{3})+|\d{4,}/.test(normalized);

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
  sender?: string,
  receivedAtMs?: number,
  availableTags: { id: string; name: string }[] = []
): ParsedBankSms | null {
  const normalized = normalizeSmsText(rawText);

  if (!isLikelyBankSms(normalized, sender)) {
    return null;
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Filter out balance lines ("مانده: ...", "موجودی قابل برداشت: ...") for transaction type & amount analysis
  // CRITICAL: "موجودی قابل برداشت" contains the word "برداشت", which previously caused deposits to be misclassified as expenses!
  const nonBalanceLines = lines.filter(
    (line) =>
      !/^(?:مانده|موجودی|موجودي|قابل\s*برداشت|مانده\s*قابل\s*برداشت|موجودی\s*قابل\s*برداشت)/.test(
        line
      )
  );
  const cleanedForTypeCheck = (nonBalanceLines.length > 0 ? nonBalanceLines : lines)
    .join('\n')
    .replace(/(?:مانده|موجودی|موجودي)\s*(?:قابل\s*برداشت)?[^\n]*/g, '')
    .replace(/قابل\s*برداشت/g, '');

  // 1. Detect Transaction Type (Income / Deposit vs Expense / Withdrawal)
  let type: TransactionType = 'expense';

  const incomeWordRegex =
    /واریز|واريز|بستانکار|افزایش موجودی|افزایش حساب|افزایش|سود سپرده|سود حساب|سود روزشمار|سود ماهانه|برگشت خرید|برگشت وجه|عودت وجه|واریز حقوق|واریز یارانه|دریافت پایا|دریافت ساتنا|دریافت پل|به حساب شما|به کارت شما|حواله وارده|شارژ حساب|شارژ کیف پول|تسهیلات/;
  const expenseWordRegex =
    /برداشت|خرید|خريد|کسر از|کسر موجودی|کسر|پرداخت قبض|پرداخت قسط|کارمزد|آبونمان|بدهکار|پایانه فروش|پوز/;

  // Check for + or - attached to an amount on non-balance lines (supports both +1,200,000 and 1,200,000+ in RTL)
  const hasPlusAmount = nonBalanceLines.some(
    (line) =>
      /(?:^|[\s:：])\+\s*(?:\d{1,3}(?:,\d{3})+|\d{4,12})(?:\s|$|ریال|ريال|تومان)/.test(line) ||
      /(?:^|[\s:：])(?:\d{1,3}(?:,\d{3})+|\d{4,12})\s*\+(?:\s|$|ریال|ريال|تومان)/.test(line) ||
      /^\+\s*\d/.test(line) ||
      /\d\s*\+$/.test(line)
  );

  const hasMinusAmount = nonBalanceLines.some(
    (line) =>
      /(?:^|[\s:：])-\s*(?:\d{1,3}(?:,\d{3})+|\d{5,12})(?:\s|$|ریال|ريال|تومان)/.test(line) ||
      /(?:^|[\s:：])(?:\d{1,3}(?:,\d{3})+|\d{5,12})\s*-(?:\s|$|ریال|ريال|تومان)/.test(line)
  );

  const incomeMatch = cleanedForTypeCheck.match(incomeWordRegex);
  const expenseMatch = cleanedForTypeCheck.match(expenseWordRegex);

  if (incomeMatch && !expenseMatch) {
    type = 'income';
  } else if (hasPlusAmount && !expenseMatch && !hasMinusAmount) {
    type = 'income';
  } else if (incomeMatch && expenseMatch) {
    // If both words appear, pick whichever appears first in the message body
    const incIdx = cleanedForTypeCheck.search(incomeWordRegex);
    const expIdx = cleanedForTypeCheck.search(expenseWordRegex);
    type = incIdx <= expIdx ? 'income' : 'expense';
  } else if (hasPlusAmount && !hasMinusAmount) {
    type = 'income';
  } else {
    type = 'expense';
  }

  // 2. Extract Transaction Amount (ignoring مانده / موجودی / حساب / کارت lines)
  let extractedNumber = 0;

  // Priority A: Look for explicit patterns like "مبلغ: 1,200,000" or "واریز 2,500,000" or "+1,200,000 ریال" or "1,200,000+ ریال"
  const explicitPatterns = [
    /(?:مبلغ|برداشت|واریز|واريز|خرید|خريد|انتقال|قسط|قبض|افزایش|کسر|بستانکار|بدهکار)\s*[:：-]?\s*[+-]?\s*(\d{1,3}(?:,\d{3})+|\d{4,12})\s*[+-]?/,
    /[+-]?\s*(\d{1,3}(?:,\d{3})+|\d{4,12})\s*[+-]?\s*(?:ریال|ريال|تومان)/,
    /(?:^|[\s:：])[+-]\s*(\d{1,3}(?:,\d{3})+|\d{5,12})/,
    /(\d{1,3}(?:,\d{3})+|\d{5,12})\s*[+-](?:\s|$)/,
  ];

  for (const line of nonBalanceLines) {
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
    for (const line of nonBalanceLines) {
      if (/شبا|کارت|حساب|سپرده/.test(line) && !/برداشت|واریز|مبلغ|\+|-/.test(line)) {
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

  // 4. Extract Jalali Date & Time from SMS (fallback to Android SMS received timestamp if available)
  const receivedDateObj =
    receivedAtMs && receivedAtMs > 0 ? new Date(receivedAtMs) : null;
  const receivedJalaliDate = receivedDateObj
    ? formatDateToJalaliStr(receivedDateObj)
    : undefined;

  let jalaliDate = receivedJalaliDate || getCurrentJalaliDateStr();
  let time = receivedDateObj ? formatTimeFromDate(receivedDateObj) : getCurrentTimeStr();

  // Match YYYY/MM/DD or YY/MM/DD (e.g. 1403/08/15 or 03/08/15)
  const dateMatch = normalized.match(
    /\b(14\d{2}|0[2-9])[/.-](0?[1-9]|1[0-2])[/.-](0?[1-9]|[12]\d|3[01])\b/
  );
  if (dateMatch) {
    const rawYear = dateMatch[1];
    const fullYear = rawYear.length === 2 ? `14${rawYear}` : rawYear;
    const month = dateMatch[2].padStart(2, '0');
    const day = dateMatch[3].padStart(2, '0');
    jalaliDate = `${fullYear}/${month}/${day}`;
  } else {
    // Also support MM/DD without year (e.g. 08/15-20:15 in some Iranian bank SMS)
    const shortDateMatch = normalized.match(
      /(?:^|[\s_-])(0[1-9]|1[0-2])[/.-](0[1-9]|[12]\d|3[01])(?:[\s_-]|$)/
    );
    if (shortDateMatch) {
      const currentYear = jalaliDate.split('/')[0] || '1403';
      const month = shortDateMatch[1].padStart(2, '0');
      const day = shortDateMatch[2].padStart(2, '0');
      jalaliDate = `${currentYear}/${month}/${day}`;
    }
  }

  // Match HH:MM
  const timeMatch = normalized.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
  }

  // 5. Smart Title, Category, Subcategory & Tags Suggestion
  let title = type === 'expense' ? 'برداشت بانکی (پیامک)' : 'واریز بانکی (پیامک)';

  if (type === 'expense' && /خرید از\s+([^\n]+)/.test(normalized)) {
    const m = normalized.match(/خرید از\s+([^\n]+)/);
    if (m && m[1]) title = `خرید از ${m[1].trim()}`;
  } else if (type === 'expense' && /فروشگاه\s+([^\n]+)/.test(normalized)) {
    const m = normalized.match(/فروشگاه\s+([^\n]+)/);
    if (m && m[1]) title = `خرید از فروشگاه ${m[1].trim()}`;
  } else if (/کارت به کارت|انتقال پل|پایا|ساتنا|حواله/.test(normalized)) {
    title = type === 'expense' ? 'انتقال وجه / کارت به کارت' : 'دریافت حواله / واریز به حساب';
  } else if (type === 'expense' && /قسط|وام/.test(normalized)) {
    title = 'پرداخت قسط وام';
  } else if (type === 'expense' && /قبض|شارژ/.test(normalized)) {
    title = 'پرداخت قبض / شارژ';
  } else if (type === 'income' && /حقوق/.test(normalized)) {
    title = 'واریز حقوق';
  } else if (type === 'income' && /سود/.test(normalized)) {
    title = 'واریز سود بانکی';
  } else if (type === 'expense' && /خرید|پایانه فروش|پوز|pos/i.test(normalized)) {
    title = `خرید کارتی${detectedBankName ? ` (${detectedBankName})` : ''}`;
  } else if (detectedBankName) {
    title = `${type === 'expense' ? 'برداشت از' : 'واریز به'} ${detectedBankName}`;
  }

  // Match category & subcategory
  const typeCategories = categories.filter((c) => c.type === type);
  let chosenCat = typeCategories[0] || categories[0];
  let chosenSub = chosenCat?.subCategories?.[0]?.id || '';

  if (type === 'expense') {
    if (/هایپر|سوپر|کوروش|جانبو|میوه|نان|گوشت|پروتئین/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_groceries') || chosenCat;
      if (/میوه/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_fruit')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else if (/نان|شیرینی/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_bakery')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else if (/گوشت|پروتئین/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_meat')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else {
        chosenSub = chosenCat?.subCategories?.[0]?.id || '';
      }
    } else if (/رستوران|کافه|اسنپ فود|غذا|پیتزا|کباب/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_dining') || chosenCat;
      if (/کافه|قهوه/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_cafe')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else if (/اسنپ فود/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_fastfood')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else {
        chosenSub = chosenCat?.subCategories?.[0]?.id || '';
      }
    } else if (/اسنپ|تپسی|بنزین|سوخت|خودرو|پارکینگ/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_transport') || chosenCat;
      if (/اسنپ|تپسی/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_taxi')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else {
        chosenSub = chosenCat?.subCategories?.[0]?.id || '';
      }
    } else if (/داروخانه|پزشک|درمان|آزمایشگاه|بیمارستان/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_health') || chosenCat;
      if (/داروخانه/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_pharmacy')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else {
        chosenSub = chosenCat?.subCategories?.[0]?.id || '';
      }
    } else if (/قبض|اجاره|شارژ|قسط/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_home') || chosenCat;
      if (/قبض/.test(normalized)) {
        chosenSub = chosenCat?.subCategories?.find((s) => s.id === 'sub_bills')?.id || chosenCat?.subCategories?.[0]?.id || '';
      } else {
        chosenSub = chosenCat?.subCategories?.[0]?.id || '';
      }
    } else {
      chosenSub = chosenCat?.subCategories?.[0]?.id || '';
    }
  } else {
    if (/حقوق|پاداش|عیدی/.test(normalized)) {
      chosenCat = typeCategories.find((c) => c.id === 'cat_salary') || chosenCat;
      chosenSub = chosenCat?.subCategories?.[0]?.id || '';
    } else if (/سود/.test(normalized)) {
      chosenCat =
        typeCategories.find((c) => c.id === 'cat_freelance') ||
        typeCategories[0] ||
        chosenCat;
      chosenSub =
        chosenCat?.subCategories?.find((s) => s.id === 'sub_profit')?.id ||
        chosenCat?.subCategories?.[0]?.id ||
        '';
    } else {
      chosenSub = chosenCat?.subCategories?.[0]?.id || '';
    }
  }

  // Suggest initial tags if matching
  const suggestedTags: string[] = [];
  if (/قسط|وام/.test(normalized)) {
    const instTag = availableTags.find(
      (t) => t.id === 'tag_installment' || t.name.includes('قسط')
    );
    if (instTag) suggestedTags.push(instTag.id);
  }
  if (/اینترنتی|دیجی|اسنپ|آنلاین/.test(normalized)) {
    const onlineTag = availableTags.find(
      (t) => t.id === 'tag_online' || t.name.includes('اینترنتی')
    );
    if (onlineTag) suggestedTags.push(onlineTag.id);
  }

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
    receivedJalaliDate,
    time,
    detectedBankId,
    detectedBankName,
    matchedCardId: matchedCard?.id || '',
    spentBy: ownerPerson,
    recordedBy: recorderPerson,
    categoryId: chosenCat?.id || '',
    subCategoryId: chosenSub,
    tags: suggestedTags,
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
