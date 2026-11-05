import React, { useState } from 'react';
import {
  AppState,
  Category,
  TagItem,
  ColorThemeId,
  ThemeMode,
  TransactionType,
  BudgetGoal,
  GitHubSyncConfig,
} from '../types';
import { CircularIcon, AVAILABLE_ICONS, IconName } from './CircularIcon';
import { PWAInstallButton } from './PWAInstallButton';
import { formatMoney, toEnglishDigits, toPersianDigits } from '../utils/persian';
import { createPartnerMagicLink, detectGitHubPagesRepo } from '../utils/githubSync';

interface SettingsViewProps {
  state: AppState;
  onUpdateSettings: (partial: Partial<AppState['settings']>) => void;
  onUpdateBudget: (categoryId: string, monthlyLimit: number) => void;
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (catId: string) => void;
  onSaveTag: (tag: TagItem) => void;
  onDeleteTag: (tagId: string) => void;
  onImportState: (newState: AppState) => void;
  onResetDefaults: () => void;
  onManualSyncNow: () => Promise<void>;
  onLockAppNow?: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncErrorMessage?: string;
}

const COLOR_THEMES: { id: ColorThemeId; name: string; hex: string }[] = [
  { id: 'emerald', name: 'زمردی (پیش‌فرض)', hex: '#10b981' },
  { id: 'ocean', name: 'اقیانوسی (آبی)', hex: '#0ea5e9' },
  { id: 'rose', name: 'یاقوتی (رز)', hex: '#f43f5e' },
  { id: 'amber', name: 'کهربایی (طلایی)', hex: '#f59e0b' },
  { id: 'violet', name: 'بنفش سلطنتی', hex: '#8b5cf6' },
  { id: 'turquoise', name: 'فیروزه‌ای ایرانی', hex: '#06b6d4' },
  { id: 'monochrome', name: 'مونوکروم (سیاه و سفید)', hex: '#3f3f46' },
  { id: 'coral', name: 'مرجانی (نارنجی گرم)', hex: '#f97316' },
  { id: 'indigo', name: 'لاجوردی (نیلی)', hex: '#6366f1' },
  { id: 'olive', name: 'زیتونی (سبز طبیعت)', hex: '#84cc16' },
];

const PALETTE_COLORS = [
  '#10b981',
  '#0ea5e9',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#6366f1',
  '#06b6d4',
  '#14b8a6',
  '#84cc16',
  '#52525b',
  '#f97316',
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateSettings,
  onUpdateBudget,
  onSaveCategory,
  onDeleteCategory,
  onSaveTag,
  onDeleteTag,
  onImportState,
  onResetDefaults,
  onManualSyncNow,
  onLockAppNow,
  syncStatus,
  syncErrorMessage,
}) => {
  const { settings, categories, tags, budgets } = state;

  const [activeSection, setActiveSection] = useState<
    'appearance' | 'budgets' | 'categories' | 'tags' | 'backup'
  >('appearance');

  // Category Editor States
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catIcon, setCatIcon] = useState<IconName>('shopping-cart');
  const [catColor, setCatColor] = useState('#10b981');
  const [newSubName, setNewSubName] = useState('');

  // Tag Editor States
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#10b981');

  // PIN & Profile Save Feedback
  const [pinDraft, setPinDraft] = useState<string>(settings.pinCode || '');
  const [pinSavedToast, setPinSavedToast] = useState<string>('');

  // GitHub Sync Feedback & Magic Link
  const [ghSavedToast, setGhSavedToast] = useState<string>('');
  const [magicLinkCopied, setMagicLinkCopied] = useState<boolean>(false);

  const [importMessage, setImportMessage] = useState('');

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const getCategoryBudgetLimit = (categoryId: string): number => {
    const found = budgets.find((b) => b.categoryId === categoryId);
    return found ? found.monthlyLimit : 0;
  };

  const totalCategoryBudgetsSum = expenseCategories.reduce(
    (sum, cat) => sum + getCategoryBudgetLimit(cat.id),
    0
  );

  const startEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon((cat.icon as IconName) || 'shopping-cart');
    setCatColor(cat.color);
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const updated: Category = editingCat
      ? {
          ...editingCat,
          name: catName.trim(),
          type: catType,
          icon: catIcon,
          color: catColor,
        }
      : {
          id: `cat_${Date.now()}`,
          name: catName.trim(),
          type: catType,
          icon: catIcon,
          color: catColor,
          subCategories: [{ id: `sub_${Date.now()}`, name: 'عمومی', icon: catIcon }],
        };
    onSaveCategory(updated);
    setEditingCat(null);
    setCatName('');
  };

  const handleAddSubCategory = (cat: Category) => {
    if (!newSubName.trim()) return;
    const updated: Category = {
      ...cat,
      subCategories: [
        ...cat.subCategories,
        {
          id: `sub_${Date.now()}`,
          name: newSubName.trim(),
          icon: cat.icon,
        },
      ],
    };
    onSaveCategory(updated);
    if (editingCat?.id === cat.id) {
      setEditingCat(updated);
    }
    setNewSubName('');
  };

  const handleDeleteSubCategory = (cat: Category, subId: string) => {
    if (cat.subCategories.length <= 1) return;
    const updated: Category = {
      ...cat,
      subCategories: cat.subCategories.filter((s) => s.id !== subId),
    };
    onSaveCategory(updated);
    if (editingCat?.id === cat.id) {
      setEditingCat(updated);
    }
  };

  const handleRenameSubCategory = (cat: Category, subId: string, name: string) => {
    const updated: Category = {
      ...cat,
      subCategories: cat.subCategories.map((s) =>
        s.id === subId ? { ...s, name } : s
      ),
    };
    onSaveCategory(updated);
    if (editingCat?.id === cat.id) {
      setEditingCat(updated);
    }
  };

  const handleSaveTagForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    const updated: TagItem = editingTag
      ? { ...editingTag, name: tagName.trim(), color: tagColor }
      : { id: `tag_${Date.now()}`, name: tagName.trim(), color: tagColor };
    onSaveTag(updated);
    setEditingTag(null);
    setTagName('');
  };

  const handleGitHubSyncField = (partial: Partial<GitHubSyncConfig>) => {
    const current: GitHubSyncConfig = settings.githubSync || {
      enabled: true,
      repoOwner: '',
      repoName: '',
      branch: 'main',
      filePath: 'data/hamhesab-db.json',
      token: '',
    };
    onUpdateSettings({
      githubSync: {
        ...current,
        ...partial,
      },
    });
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hamhesab-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Single-File Standalone HTML for GitHub Pages / Mobile Upload
  const handleDownloadStandaloneHTML = () => {
    const standaloneHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl" class="${settings.darkMode ? 'dark' : ''}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>گزارش و نسخه پشتیبان هم‌حساب (${settings.hootanName} و ${settings.fatemehName})</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Vazirmatn', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .card { max-width: 820px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 24px; border: 1px solid #334155; }
  h1 { color: #10b981; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
  th, td { padding: 12px; border-bottom: 1px solid #334155; text-align: right; }
  th { color: #94a3b8; }
  .exp { color: #fb7185; font-weight: bold; }
  .inc { color: #34d399; font-weight: bold; }
</style>
</head>
<body>
  <div class="card">
    <h1>هم‌حساب | دفتر کل مالی ${settings.hootanName} و ${settings.fatemehName}</h1>
    <p>تعداد تراکنش‌های ذخیره شده: ${toPersianDigits(state.transactions.length)} مورد | تعداد کارت‌های بانکی: ${toPersianDigits(state.cards.length)} کارت</p>
    <table>
      <thead>
        <tr><th>عنوان</th><th>مبلغ (${settings.currencyUnit})</th><th>خرج/درآمد</th><th>ثبت‌کننده</th><th>تاریخ و ساعت</th></tr>
      </thead>
      <tbody>
        ${state.transactions
          .map(
            (t) => `<tr>
          <td>${t.title}</td>
          <td class="${t.type === 'expense' ? 'exp' : 'inc'}">${formatMoney(t.amount)}</td>
          <td>${
            t.spentBy === 'hootan'
              ? settings.hootanName
              : t.spentBy === 'fatemeh'
              ? settings.fatemehName
              : settings.sharedLabel
          }</td>
          <td>${t.recordedBy === 'hootan' ? settings.hootanName : settings.fatemehName}</td>
          <td>${toPersianDigits(t.jalaliDate)} - ${toPersianDigits(t.time)}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `index-hamhesab-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.cards)) {
          onImportState(parsed);
          setImportMessage('فایل پشتیبان با موفقیت بارگذاری و همگام‌سازی شد ✓');
          setTimeout(() => setImportMessage(''), 4000);
        } else {
          setImportMessage('فرمت فایل انتخاب شده معتبر نیست.');
        }
      } catch {
        setImportMessage('خطا در خواندن فایل JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Sub-Navigation inside Settings */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CircularIcon name="settings" size="md" color="#10b981" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              تنظیمات، بودجه‌بندی و همگام‌سازی خودکار
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              شخصی‌سازی ۱۰ تم رنگی (شامل مونوکروم)، سقف بودجه هر دسته‌بندی، زیردسته‌ها و سینک خودکار
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          {(
            [
              { id: 'appearance', label: 'ظاهر و ۱۰ تم رنگی' },
              { id: 'budgets', label: 'سقف بودجه دسته‌ها' },
              { id: 'categories', label: 'دسته‌ها و زیردسته‌ها' },
              { id: 'tags', label: 'مدیریت تگ‌ها' },
              { id: 'backup', label: 'سینک خودکار و گیت‌هاب' },
            ] as const
          ).map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSection === sec.id
                  ? 'theme-bg text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: APPEARANCE, DARK MODE, 10 COLOR THEMES & COUPLE NAMES */}
      {activeSection === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Dark Mode, Auto Phone Theme & 10 Color Themes */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CircularIcon
                  name={settings.darkMode ? 'moon' : 'sun'}
                  color={settings.darkMode ? '#8b5cf6' : '#f59e0b'}
                  size="md"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    حالت نمایش (روشن، تاریک، خودکار با گوشی) و ۱۰ تم رنگی
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تغییر خودکار بر اساس تم گوشی یا انتخاب دستی به همراه ۱۰ تم رنگی متنوع
                  </p>
                </div>
              </div>
            </div>

            {/* 3-Way Display Mode Switcher: Light / Dark / Auto (Phone System) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                حالت زمینه برنامه:
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                {(
                  [
                    { id: 'system', label: 'خودکار با گوشی 📱' },
                    { id: 'light', label: 'حالت روشن ☀️' },
                    { id: 'dark', label: 'دارک مود 🌙' },
                  ] as { id: ThemeMode; label: string }[]
                ).map((m) => {
                  const currentMode: ThemeMode =
                    settings.themeMode || (settings.darkMode ? 'dark' : 'light');
                  const isActive = currentMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (m.id === 'system') {
                          const prefersDark =
                            window.matchMedia &&
                            window.matchMedia('(prefers-color-scheme: dark)').matches;
                          onUpdateSettings({
                            themeMode: 'system',
                            darkMode: prefersDark,
                          });
                        } else {
                          onUpdateSettings({
                            themeMode: m.id,
                            darkMode: m.id === 'dark',
                          });
                        }
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'theme-bg text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10 Color Themes (Never grayscale so user can always see the real theme colors!) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                انتخاب تم رنگی دلخواه ({toPersianDigits(COLOR_THEMES.length)} تم):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
                {COLOR_THEMES.map((theme) => {
                  const isSelected = settings.colorTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onUpdateSettings({ colorTheme: theme.id })}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-900/5 dark:bg-white/15 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full shrink-0 shadow-inner flex items-center justify-center text-white text-xs border border-white/25"
                        style={{
                          background:
                            theme.id === 'monochrome'
                              ? 'linear-gradient(135deg, #71717a 0%, #18181b 100%)'
                              : theme.hex,
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Couple Names, Total Budget, Currency & Privacy PIN */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 h-fit">
            <div className="flex items-center gap-3">
              <CircularIcon name="users" size="md" color="#0ea5e9" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  مشخصات زوجین، بودجه کل و قفل خصوصی
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ویرایش نام‌ها، سقف بودجه ماهانه کل و رمز ورود اختصاصی
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  نام نفر اول (من)
                </label>
                <input
                  type="text"
                  value={settings.hootanName}
                  onChange={(e) => onUpdateSettings({ hootanName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  نام همسر
                </label>
                <input
                  type="text"
                  value={settings.fatemehName}
                  onChange={(e) => onUpdateSettings({ fatemehName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  عنوان خرج مشترک
                </label>
                <input
                  type="text"
                  value={settings.sharedLabel}
                  onChange={(e) => onUpdateSettings({ sharedLabel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  سقف بودجه کل ماهانه ({settings.currencyUnit})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMoney(settings.monthlyTotalBudget)}
                  onChange={(e) => {
                    const num = parseInt(
                      toEnglishDigits(e.target.value).replace(/\D/g, '') || '0',
                      10
                    );
                    onUpdateSettings({ monthlyTotalBudget: num });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  رمز ۴ رقمی ورود به برنامه
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="مثلاً: 1375"
                    value={pinDraft}
                    onChange={(e) =>
                      setPinDraft(
                        toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4)
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                  />
                  {settings.pinCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setPinDraft('');
                        onUpdateSettings({ pinCode: '' });
                        setPinSavedToast('قفل رمز ۴ رقمی غیرفعال شد.');
                        setTimeout(() => setPinSavedToast(''), 3500);
                      }}
                      className="px-2.5 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 text-[11px] font-extrabold cursor-pointer shrink-0"
                    >
                      حذف رمز
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Explicit Save PIN & Lock Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const cleanPin = toEnglishDigits(pinDraft).replace(/\D/g, '').slice(0, 4);
                  if (cleanPin.length > 0 && cleanPin.length < 4) {
                    setPinSavedToast('رمز ورود باید دقیقاً ۴ رقم باشد.');
                    setTimeout(() => setPinSavedToast(''), 3500);
                    return;
                  }
                  onUpdateSettings({ pinCode: cleanPin });
                  setPinSavedToast(
                    cleanPin
                      ? `رمز ۴ رقمی (${toPersianDigits(cleanPin)}) با موفقیت ذخیره شد ✓`
                      : 'تنظیمات بدون رمز ورود ذخیره شد ✓'
                  );
                  setTimeout(() => setPinSavedToast(''), 4000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-xs"
              >
                ذخیره رمز و مشخصات ✓
              </button>

              {settings.pinCode && onLockAppNow && (
                <button
                  type="button"
                  onClick={onLockAppNow}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer whitespace-nowrap"
                >
                  قفل کردن برنامه الان 🔒
                </button>
              )}
            </div>

            {pinSavedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {pinSavedToast}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: MONTHLY BUDGETS PER CATEGORY */}
      {activeSection === 'budgets' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <CircularIcon name="pie-chart" size="md" color="#10b981" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  تنظیم سقف بودجه ماهانه برای هر دسته‌بندی هزینه
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  مقادیر تعیین شده در این بخش مستقیماً در صفحه «آمارها» با نمودار پیشرفت (Progress Bar) مقایسه می‌شوند
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="text-[11px] text-slate-400 block">مجموع بودجه دسته‌ها</span>
                <span className="text-sm font-black theme-text tabular-nums">
                  {formatMoney(totalCategoryBudgetsSum, true, settings.currencyUnit)}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ monthlyTotalBudget: totalCategoryBudgetsSum })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
              >
                تنظیم به عنوان بودجه کل
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expenseCategories.map((cat) => {
              const currentLimit = getCategoryBudgetLimit(cat.id);
              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CircularIcon name={cat.icon} color={cat.color} size="md" />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {toPersianDigits(cat.subCategories.length)} زیردسته
                      </span>
                    </div>
                  </div>

                  <div className="w-44 shrink-0">
                    <label className="block text-[10px] text-slate-400 mb-1 text-left">
                      سقف ماهانه ({settings.currencyUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={currentLimit > 0 ? formatMoney(currentLimit) : ''}
                      placeholder="بدون سقف (۰)"
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        const val = parseInt(raw || '0', 10);
                        onUpdateBudget(cat.id, val);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-extrabold tabular-nums text-left text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: EDIT CATEGORIES & SUBCATEGORIES */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Form to Add / Edit Category */}
          <form
            onSubmit={handleSaveCategoryForm}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {editingCat ? `ویرایش دسته‌بندی «${editingCat.name}»` : 'افزودن دسته‌بندی اصلی جدید'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                نام دسته‌بندی
              </label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="مثلاً: تعمیرات و دکوراسیون"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCatType('expense')}
                className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  catType === 'expense'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                دسته هزینه
              </button>
              <button
                type="button"
                onClick={() => setCatType('income')}
                className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  catType === 'income'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                دسته درآمد
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                انتخاب رنگ آیکون دایره‌ای
              </label>
              <div className="flex flex-wrap gap-2">
                {PALETTE_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCatColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs cursor-pointer ${
                      catColor === hex ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white' : ''
                    }`}
                  >
                    {catColor === hex ? '✓' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                انتخاب وکتور آیکون دایره‌ای
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setCatIcon(ic.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border cursor-pointer ${
                      catIcon === ic.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <CircularIcon name={ic.id} color={catColor} size="sm" />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-full">
                      {ic.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer"
              >
                {editingCat ? 'بروزرسانی دسته‌بندی' : '+ افزودن دسته‌بندی'}
              </button>
              {editingCat && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCat(null);
                    setCatName('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
              )}
            </div>
          </form>

          {/* List of Categories & Editable Subcategories */}
          <div className="lg:col-span-7 space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CircularIcon name={cat.icon} color={cat.color} size="md" />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {cat.name}
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {cat.type === 'expense' ? 'دسته هزینه' : 'دسته درآمد'} ·{' '}
                        {toPersianDigits(cat.subCategories.length)} زیردسته
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditCategory(cat)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      ویرایش
                    </button>
                    {categories.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-bold cursor-pointer"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable Subcategories */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    زیردسته‌ها (برای ویرایش نام، مستقیم تایپ کنید):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.subCategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700"
                      >
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleRenameSubCategory(cat, sub.id, e.target.value)
                          }
                          className="flex-1 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                        {cat.subCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSubCategory(cat, sub.id)}
                            className="text-rose-500 text-xs font-bold px-1 cursor-pointer"
                            title="حذف زیردسته"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Add Subcategory */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={`افزودن زیردسته جدید به ${cat.name}...`}
                      value={editingCat?.id === cat.id ? newSubName : ''}
                      onFocus={() => setEditingCat(cat)}
                      onChange={(e) => {
                        setEditingCat(cat);
                        setNewSubName(e.target.value);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubCategory(cat)}
                      className="px-3 py-1.5 rounded-xl theme-bg text-white text-xs font-bold cursor-pointer"
                    >
                      + ثبت زیردسته
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: EDIT TAGS */}
      {activeSection === 'tags' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <form
            onSubmit={handleSaveTagForm}
            className="md:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 h-fit"
          >
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {editingTag ? `ویرایش تگ #${editingTag.name}` : 'افزودن تگ جدید'}
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                عنوان تگ (بدون #)
              </label>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="مثلاً: سفر_شمال یا قسط_وام"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                رنگ تگ
              </label>
              <div className="flex flex-wrap gap-2">
                {PALETTE_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setTagColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs cursor-pointer ${
                      tagColor === hex ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white' : ''
                    }`}
                  >
                    {tagColor === hex ? '✓' : ''}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer"
            >
              {editingTag ? 'ذخیره تغییرات تگ' : '+ افزودن تگ'}
            </button>
          </form>

          <div className="md:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              فهرست تگ‌های فعال (قابل ویرایش و حذف)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <CircularIcon name="tag" color={tag.color} size="sm" />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      #{tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTag(tag);
                        setTagName(tag.name);
                        setTagColor(tag.color);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-[11px] font-bold cursor-pointer"
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTag(tag.id)}
                      className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-[11px] font-bold cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: ZERO-TOKEN AUTO SYNC & GITHUB BACKUP */}
      {activeSection === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Zero-Token Automatic Sync Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <CircularIcon name="refresh" size="md" color="#10b981" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    همگام‌سازی خودکار دوطرفه روی گیت‌هاب (GitHub Pages)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    توکن را فقط یک‌بار در گوشی خودتان ذخیره کنید؛ گوشی {settings.fatemehName} خودکار وصل می‌شود
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await onManualSyncNow();
                  setGhSavedToast('همگام‌سازی با گیت‌هاب انجام شد ✓');
                  setTimeout(() => setGhSavedToast(''), 3500);
                }}
                className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0"
              >
                {syncStatus === 'syncing' ? 'در حال سینک...' : 'همگام‌سازی الان ↻'}
              </button>
            </div>

            {/* Direct GitHub Connection Form (Always Visible with Save Button) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    نام کاربری گیت‌هاب (Owner)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder={detectGitHubPagesRepo().repoOwner || 'hootan'}
                    value={settings.githubSync?.repoOwner || ''}
                    onChange={(e) =>
                      handleGitHubSyncField({ repoOwner: e.target.value.trim() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    نام ریپازیتوری (مثلاً hhsb)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder={detectGitHubPagesRepo().repoName || 'hhsb'}
                    value={settings.githubSync?.repoName || ''}
                    onChange={(e) =>
                      handleGitHubSyncField({ repoName: e.target.value.trim() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  توکن دسترسی گیت‌هاب (Personal Access Token با دسترسی repo)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={settings.githubSync?.token || ''}
                  onChange={(e) =>
                    handleGitHubSyncField({ token: e.target.value.trim() })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  نکته: این توکن به صورت رمزنگاری‌شده (`syncVault`) در فایل دیتابیس گیت‌هاب ذخیره می‌شود تا گیت‌هاب آن را باطل نکند و گوشی {settings.fatemehName} هم به صورت خودکار و بدون نیاز به وارد کردن توکن به آن متصل شود!
                </span>
              </div>

              {/* Save & Connect Button + Partner Magic Link Button */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const auto = detectGitHubPagesRepo();
                    const owner = settings.githubSync?.repoOwner || auto.repoOwner;
                    const repo = settings.githubSync?.repoName || auto.repoName;
                    handleGitHubSyncField({
                      enabled: true,
                      repoOwner: owner,
                      repoName: repo,
                    });
                    setGhSavedToast('در حال ذخیره و ارسال دیتابیس به گیت‌هاب...');
                    await onManualSyncNow();
                    setGhSavedToast(
                      'تنظیمات ذخیره شد و دیتابیس با گیت‌هاب همگام‌سازی گردید ✓'
                    );
                    setTimeout(() => setGhSavedToast(''), 5000);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  ذخیره توکن و اتصال به گیت‌هاب ✓
                </button>

                {settings.githubSync?.token && (
                  <button
                    type="button"
                    onClick={() => {
                      const auto = detectGitHubPagesRepo();
                      const link = createPartnerMagicLink({
                        enabled: true,
                        repoOwner: settings.githubSync?.repoOwner || auto.repoOwner,
                        repoName: settings.githubSync?.repoName || auto.repoName,
                        branch: settings.githubSync?.branch || 'main',
                        filePath: settings.githubSync?.filePath || 'data/hamhesab-db.json',
                        token: settings.githubSync?.token || '',
                      });
                      navigator.clipboard?.writeText(link);
                      setMagicLinkCopied(true);
                      setTimeout(() => setMagicLinkCopied(false), 4000);
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer whitespace-nowrap"
                  >
                    {magicLinkCopied
                      ? 'لینک اختصاصی فاطمه کپی شد ✓'
                      : `کپی لینک ورود خودکار برای ${settings.fatemehName} 🔗`}
                  </button>
                )}
              </div>

              {ghSavedToast && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                  {ghSavedToast}
                </div>
              )}

              {syncStatus === 'error' && syncErrorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
                  {syncErrorMessage}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <p className="font-bold text-slate-900 dark:text-white">
                آیا لازم است توکن را در گوشی {settings.fatemehName} هم وارد کنم؟ خیر!
              </p>
              <p>
                ۱. کافی است فقط **یک‌بار** توکن گیت‌هاب را در کادر بالا وارد کرده و دکمه **«ذخیره توکن و اتصال به گیت‌هاب ✓»** را بزنید.
              </p>
              <p>
                ۲. برنامه توکن را به صورت رمزنگاری‌شده (`syncVault`) در فایل دیتابیس ریپازیتوری شما ذخیره می‌کند. وقتی {settings.fatemehName} آدرس سایت گیت‌هاب شما را باز کند، گوشی او به صورت خودکار کلید رمزنگاری‌شده را دریافت کرده و بدون نیاز به تایپ هیچ توکنی، دوطرفه سینک می‌شود!
              </p>
              <p>
                ۳. همچنین دکمه **«کپی لینک ورود خودکار برای {settings.fatemehName} 🔗»** در بالا قرار داده شده که اگر ریپازیتوری شما Private است، با فرستادن آن لینک در تلگرام/واتساپ برای {settings.fatemehName}، با یک کلیک گوشی او هم متصل می‌شود.
              </p>
            </div>
          </div>

          {/* Manual File Export / Import & APK / PWA Installation Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 h-fit">
            <PWAInstallButton
              repoOwner={settings.githubSync?.repoOwner}
              repoName={settings.githubSync?.repoName}
              variant="settings"
            />

            <div className="flex items-center gap-3 pt-2">
              <CircularIcon name="download" size="md" color="#0ea5e9" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  خروجی فایل پشتیبان و گزارش موبایل
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  دانلود فایل دیتابیس JSON یا گزارش تک‌صفحه‌ای HTML
                </p>
              </div>
            </div>

            {importMessage && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {importMessage}
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full py-3 px-4 rounded-2xl theme-gradient text-white text-xs font-extrabold flex items-center justify-between shadow-md cursor-pointer"
              >
                <span>دانلود فایل پشتیبان کامل (JSON)</span>
                <span>⬇</span>
              </button>

              <label className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold flex items-center justify-between cursor-pointer transition-colors">
                <span>بارگذاری فایل پشتیبان (JSON)</span>
                <span>⬆</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadStandaloneHTML}
                className="w-full py-3 px-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-between cursor-pointer"
              >
                <span>دانلود فایل گزارش تک‌صفحه‌ای HTML</span>
                <span>📄</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                بازگردانی داده‌های نمونه اولیه:
              </span>
              <button
                type="button"
                onClick={onResetDefaults}
                className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
              >
                بازنشانی اطلاعات پیش‌فرض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
