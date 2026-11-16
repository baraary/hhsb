const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function formatMoney(amount: number, showUnit = false, unit = 'ریال'): string {
  const formatted = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  const persian = toPersianDigits(formatted);
  const sign = amount < 0 ? '-' : '';
  return showUnit ? `${sign}${persian} ${unit}` : `${sign}${persian}`;
}

export function formatCardNumber(cardNumber: string): string {
  const clean = toEnglishDigits(cardNumber).replace(/\D/g, '').slice(0, 16);
  const groups = clean.match(/.{1,4}/g) || [];
  return toPersianDigits(groups.join(' - '));
}

export const JALALI_MONTHS = [
  { number: '01', name: 'فروردین' },
  { number: '02', name: 'اردیبهشت' },
  { number: '03', name: 'خرداد' },
  { number: '04', name: 'تیر' },
  { number: '05', name: 'مرداد' },
  { number: '06', name: 'شهریور' },
  { number: '07', name: 'مهر' },
  { number: '08', name: 'آبان' },
  { number: '09', name: 'آذر' },
  { number: '10', name: 'دی' },
  { number: '11', name: 'بهمن' },
  { number: '12', name: 'اسفند' },
];

export function formatJalaliReadable(jalaliDate: string): string {
  if (!jalaliDate) return '';
  const parts = jalaliDate.split('/');
  if (parts.length !== 3) return toPersianDigits(jalaliDate);
  const [year, month, day] = parts;
  const monthObj = JALALI_MONTHS.find((m) => m.number === month.padStart(2, '0'));
  const monthName = monthObj ? monthObj.name : month;
  return `${toPersianDigits(parseInt(day, 10))} ${monthName} ${toPersianDigits(year)}`;
}

export function getMonthKey(jalaliDate: string): string {
  const parts = jalaliDate.split('/');
  if (parts.length < 2) return '1403/08';
  return `${parts[0]}/${parts[1].padStart(2, '0')}`;
}

export function formatMonthKeyReadable(monthKey: string): string {
  const [year, month] = monthKey.split('/');
  const monthObj = JALALI_MONTHS.find((m) => m.number === month?.padStart(2, '0'));
  return monthObj ? `${monthObj.name} ${toPersianDigits(year)}` : toPersianDigits(monthKey);
}

export function getCurrentTimeStr(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function getCurrentJalaliDateStr(): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value || '1403';
    const m = parts.find((p) => p.type === 'month')?.value || '08';
    const d = parts.find((p) => p.type === 'day')?.value || '15';
    return `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
  } catch {
    return '1403/08/15';
  }
}

export function isJalaliLeapYear(year: number): boolean {
  const r = ((year - 474) % 2820 + 2820) % 2820;
  return (((r + 474 + 38) * 682) % 2816) < 682;
}

export function getJalaliMonthLength(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

/**
 * Advances a Jalali date string (YYYY/MM/DD) by weekly, monthly, quarterly, or yearly recurrence
 */
export function advanceJalaliDate(
  jalaliDate: string,
  recurrence: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): string {
  const clean = toEnglishDigits(jalaliDate || '').trim();
  const parts = clean.split('/').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    return getCurrentJalaliDateStr();
  }
  let [year, month, day] = parts;

  if (recurrence === 'weekly') {
    day += 7;
    let maxDay = getJalaliMonthLength(year, month);
    while (day > maxDay) {
      day -= maxDay;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      maxDay = getJalaliMonthLength(year, month);
    }
  } else if (recurrence === 'monthly') {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const maxDay = getJalaliMonthLength(year, month);
    if (day > maxDay) day = maxDay;
  } else if (recurrence === 'quarterly') {
    month += 3;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    const maxDay = getJalaliMonthLength(year, month);
    if (day > maxDay) day = maxDay;
  } else if (recurrence === 'yearly') {
    year += 1;
    const maxDay = getJalaliMonthLength(year, month);
    if (day > maxDay) day = maxDay;
  }

  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Steps a Jalali date string (YYYY/MM/DD) backwards by one recurrence period
 */
export function rewindJalaliDate(
  jalaliDate: string,
  recurrence: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): string {
  const clean = toEnglishDigits(jalaliDate || '').trim();
  const parts = clean.split('/').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    return getCurrentJalaliDateStr();
  }
  let [year, month, day] = parts;

  if (recurrence === 'weekly') {
    day -= 7;
    while (day < 1) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day += getJalaliMonthLength(year, month);
    }
  } else if (recurrence === 'monthly') {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    const maxDay = getJalaliMonthLength(year, month);
    if (day > maxDay) day = maxDay;
  } else if (recurrence === 'quarterly') {
    month -= 3;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    const maxDay = getJalaliMonthLength(year, month);
    if (day > maxDay) day = maxDay;
  } else if (recurrence === 'yearly') {
    year -= 1;
    const maxDay = getJalaliMonthLength(year, month);
    if (day > maxDay) day = maxDay;
  }

  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

export function formatDateToJalaliStr(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value || '1403';
    const m = parts.find((p) => p.type === 'month')?.value || '08';
    const d = parts.find((p) => p.type === 'day')?.value || '15';
    return `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
  } catch {
    return getCurrentJalaliDateStr();
  }
}

export function formatTimeFromDate(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Shifts a Jalali date string (YYYY/MM/DD) by deltaDays (positive or negative)
 */
export function shiftJalaliDateByDays(jalaliDate: string, deltaDays: number): string {
  const clean = toEnglishDigits(jalaliDate || '').trim();
  const parts = clean.split('/').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    return getCurrentJalaliDateStr();
  }
  let [year, month, day] = parts;
  let remaining = Math.trunc(deltaDays);

  while (remaining > 0) {
    const maxDay = getJalaliMonthLength(year, month);
    if (day + remaining <= maxDay) {
      day += remaining;
      remaining = 0;
    } else {
      remaining -= maxDay - day + 1;
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  while (remaining < 0) {
    if (day + remaining >= 1) {
      day += remaining;
      remaining = 0;
    } else {
      remaining += day;
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day = getJalaliMonthLength(year, month);
    }
  }

  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

const PERSIAN_ONES = [
  '',
  'یک',
  'دو',
  'سه',
  'چهار',
  'پنج',
  'شش',
  'هفت',
  'هشت',
  'نه',
];

const PERSIAN_TEENS = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده',
];

const PERSIAN_TENS = [
  '',
  '',
  'بیست',
  'سی',
  'چهل',
  'پنجاه',
  'شصت',
  'هفتاد',
  'هشتاد',
  'نود',
];

const PERSIAN_HUNDREDS = [
  '',
  'صد',
  'دویست',
  'سیصد',
  'چهارصد',
  'پانصد',
  'ششصد',
  'هفتصد',
  'هشتصد',
  'نهصد',
];

const PERSIAN_SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد'];

function threeDigitsToPersianWords(n: number): string {
  if (n <= 0) return '';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) {
    parts.push(PERSIAN_HUNDREDS[h]);
  }
  if (rem >= 10 && rem <= 19) {
    parts.push(PERSIAN_TEENS[rem - 10]);
  } else {
    const t = Math.floor(rem / 10);
    const o = rem % 10;
    if (t > 0) parts.push(PERSIAN_TENS[t]);
    if (o > 0) parts.push(PERSIAN_ONES[o]);
  }
  return parts.join(' و ');
}

export function numberToPersianWords(num: number): string {
  const clean = Math.floor(Math.abs(num));
  if (!clean || isNaN(clean)) return '';
  if (clean >= 1_000_000_000_000_000) return toPersianDigits(clean);

  const chunks: string[] = [];
  let remaining = clean;
  let scaleIdx = 0;

  while (remaining > 0 && scaleIdx < PERSIAN_SCALES.length) {
    const group = remaining % 1000;
    if (group > 0) {
      const groupWords = threeDigitsToPersianWords(group);
      const scaleLabel = PERSIAN_SCALES[scaleIdx];
      chunks.unshift(scaleLabel ? `${groupWords} ${scaleLabel}` : groupWords);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIdx++;
  }

  return chunks.join(' و ');
}

/**
 * Always returns the Persian word equivalent in TOMAN (تومان) underneath amount inputs,
 * regardless of whether the app's active currencyUnit is 'ریال' or 'تومان'.
 */
export function formatAmountToTomanWords(
  numericAmount: number,
  currentUnit: 'تومان' | 'ریال' = 'ریال'
): string {
  if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) return '';
  const clean = Math.floor(Math.abs(numericAmount));

  if (currentUnit === 'ریال') {
    const tomanVal = Math.floor(clean / 10);
    const remRial = clean % 10;
    if (tomanVal === 0) {
      return `${numberToPersianWords(remRial)} ریال (کمتر از یک تومان)`;
    }
    const tomanWords = numberToPersianWords(tomanVal);
    if (remRial > 0) {
      return `${tomanWords} تومان و ${numberToPersianWords(remRial)} ریال`;
    }
    return `${tomanWords} تومان`;
  }

  return `${numberToPersianWords(clean)} تومان`;
}

