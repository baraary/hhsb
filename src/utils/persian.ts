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

export function formatMoney(amount: number, showUnit = false, unit = 'تومان'): string {
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
