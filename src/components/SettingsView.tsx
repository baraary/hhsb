import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Sun,
  Moon,
  Lock,
  Link2,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Check,
  ShieldCheck,
  Plus,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  AppState,
  Category,
  TagItem,
  ColorThemeId,
  ThemeMode,
  TransactionType,
  GitHubSyncConfig,
  UserAccount,
} from '../types';
import { CircularIcon, AVAILABLE_ICONS, IconName } from './CircularIcon';
import { PWAInstallButton } from './PWAInstallButton';
import { formatMoney, toEnglishDigits, toPersianDigits } from '../utils/persian';
import { createPartnerMagicLink, detectGitHubPagesRepo } from '../utils/githubSync';

interface SettingsViewProps {
  state: AppState;
  users: UserAccount[];
  activeUserId: string;
  onSwitchUser: (userId: string) => void;
  onCreateUser: (name: string) => void;
  onDeleteUser?: (userId: string) => void;
  onUpdateSettings: (partial: Partial<AppState['settings']>) => void;
  onUpdateBudget: (categoryId: string, monthlyLimit: number) => void;
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (catId: string) => void;
  onSaveTag: (tag: TagItem) => void;
  onDeleteTag: (tagId: string) => void;
  onImportState: (newState: AppState) => void;
  onClearCurrentUserData: () => void;
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
  users,
  activeUserId,
  onSwitchUser,
  onCreateUser,
  onDeleteUser,
  onUpdateSettings,
  onUpdateBudget,
  onSaveCategory,
  onDeleteCategory,
  onSaveTag,
  onDeleteTag,
  onImportState,
  onClearCurrentUserData,
  onManualSyncNow,
  onLockAppNow,
  syncStatus,
  syncErrorMessage,
}) => {
  const { settings, categories, tags, budgets } = state;
  const userName = settings.userName || settings.hootanName || 'کاربر';
  const isAdminHootan = activeUserId === 'hootan';

  const [activeSection, setActiveSection] = useState<
    'appearance' | 'budgets' | 'categories' | 'tags' | 'backup'
  >('appearance');

  // New User Creation state (Only accessible to Hootan)
  const [newUserName, setNewUserName] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);

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

  useEffect(() => {
    setPinDraft(settings.pinCode || '');
  }, [settings.pinCode, activeUserId]);

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

  const defaultUserFilePath = `data/users/${activeUserId}-db.json`;

  const handleGitHubSyncField = (partial: Partial<GitHubSyncConfig>) => {
    const current: GitHubSyncConfig = settings.githubSync || {
      enabled: true,
      repoOwner: '',
      repoName: '',
      branch: 'main',
      filePath: defaultUserFilePath,
      token: '',
    };
    onUpdateSettings({
      githubSync: {
        ...current,
        filePath: defaultUserFilePath,
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
    a.download = `hamhesab-${activeUserId}-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Single-File Standalone HTML Report
  const handleDownloadStandaloneHTML = () => {
    const standaloneHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl" class="${settings.darkMode ? 'dark' : ''}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>گزارش مالی شخصی ${userName}</title>
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
    <h1>هم‌حساب | دفتر کل مالی شخصی ${userName}</h1>
    <p>تعداد تراکنش‌های ذخیره شده: ${toPersianDigits(state.transactions.length)} مورد | تعداد کارت‌های بانکی: ${toPersianDigits(state.cards.length)} کارت</p>
    <table>
      <thead>
        <tr><th>عنوان</th><th>مبلغ (${settings.currencyUnit})</th><th>نوع</th><th>تاریخ و ساعت</th></tr>
      </thead>
      <tbody>
        ${state.transactions
          .map(
            (t) => `<tr>
          <td>${t.title}</td>
          <td class="${t.type === 'expense' ? 'exp' : 'inc'}">${formatMoney(t.amount)}</td>
          <td>${t.type === 'expense' ? 'هزینه' : 'درآمد'}</td>
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
    a.download = `hamhesab-${activeUserId}-report.html`;
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
          setImportMessage('فایل پشتیبان با موفقیت در حساب شما بارگذاری شد');
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
      {/* Sub-Navigation inside Settings (Isolated from Page Tab Swipe) */}
      <div
        data-no-swipe="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <CircularIcon name="settings" size="md" color="#10b981" />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              تنظیمات حساب شخصی «{userName}» و مدیریت کاربران
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حساب‌های کاربری کاملاً مجزا بدون دسترسی به دیتای یکدیگر + تم و بودجه اختصاصی
            </p>
          </div>
        </div>

        <div
          data-no-swipe="true"
          className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-x-auto max-w-full touch-pan-x"
        >
          {(
            [
              { id: 'appearance', label: 'کاربران و ظاهر اپ' },
              { id: 'budgets', label: 'سقف بودجه دسته‌ها' },
              { id: 'categories', label: 'دسته‌ها و زیردسته‌ها' },
              { id: 'tags', label: 'مدیریت تگ‌ها' },
              { id: 'backup', label: 'پشتیبان‌گیری و گیت‌هاب' },
            ] as const
          ).map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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

      {/* SECTION 1: MULTI-USER ISOLATED ACCOUNTS & APPEARANCE */}
      {activeSection === 'appearance' && (
        <div className="space-y-5">
          {/* Multi-User Account Switcher & Admin Creator Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CircularIcon name="users" size="md" color="#10b981" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    حساب‌های کاربری مجزا (ایزوله و مستقل)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    هر کاربر دیتابیس، کارت‌ها، تراکنش‌ها، رمز ورود و تنظیمات کاملاً جداگانه‌ای دارد.
                  </p>
                </div>
              </div>

              {isAdminHootan ? (
                <button
                  type="button"
                  onClick={() => setIsAddingUser((prev) => !prev)}
                  className="px-4 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                >
                  {isAddingUser ? (
                    <>
                      <X size={14} />
                      <span>بستن فرم</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} strokeWidth={2.5} />
                      <span>افزودن کاربر جدید (ویژه مدیر)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 self-start sm:self-auto">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>افزودن کاربر جدید مخصوص مدیر اصلی (هوتن) است</span>
                </div>
              )}
            </div>

            {isAdminHootan && isAddingUser && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newUserName.trim()) return;
                  onCreateUser(newUserName.trim());
                  setNewUserName('');
                  setIsAddingUser(false);
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="نام کاربر جدید (مثلاً: علی، سارا...)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>ساخت حساب کاربری مستقل</span>
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {users.map((u) => {
                const isCurrent = u.id === activeUserId;
                const isUserAdmin = u.id === 'hootan';
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (!isCurrent) onSwitchUser(u.id);
                    }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: u.avatarColor || '#10b981' }}
                      >
                        {u.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </span>
                          {isUserAdmin && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck size={12} />
                              <span>مدیر</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          {isCurrent ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span>حساب فعال فعلی</span>
                            </>
                          ) : (
                            <>
                              <span>ورود به این حساب</span>
                              <ArrowLeft size={11} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdminHootan &&
                      !isCurrent &&
                      onDeleteUser &&
                      u.id !== 'hootan' &&
                      u.id !== 'fatemeh' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUser(u.id);
                          }}
                          className="text-xs text-rose-500 hover:underline font-bold px-2 py-1 cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Personal Appearance: Dark Mode & 10 Color Themes */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <CircularIcon
                  name={settings.darkMode ? 'moon' : 'sun'}
                  color={settings.darkMode ? '#8b5cf6' : '#f59e0b'}
                  size="md"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    تم و ظاهر اختصاصی حساب «{userName}»
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تم رنگی و حالت تاریک/روشن فقط برای حساب کاربری شما ذخیره می‌شود
                  </p>
                </div>
              </div>

              {/* 3-Way Display Mode Switcher with Vector Icons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  حالت زمینه برنامه:
                </label>
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                  {(
                    [
                      { id: 'system', label: 'خودکار با گوشی', Icon: Smartphone },
                      { id: 'light', label: 'حالت روشن', Icon: Sun },
                      { id: 'dark', label: 'دارک مود', Icon: Moon },
                    ] as { id: ThemeMode; label: string; Icon: React.ElementType }[]
                  ).map((m) => {
                    const currentMode: ThemeMode =
                      settings.themeMode || (settings.darkMode ? 'dark' : 'light');
                    const isActive = currentMode === m.id;
                    const ModeIcon = m.Icon;
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
                        className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          isActive
                            ? 'theme-bg text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <ModeIcon size={14} strokeWidth={2.3} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 10 Color Themes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                  انتخاب تم رنگی ({toPersianDigits(COLOR_THEMES.length)} تم):
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
                          className="w-6 h-6 rounded-full shrink-0 shadow-inner flex items-center justify-center text-white border border-white/25"
                          style={{
                            background:
                              theme.id === 'monochrome'
                                ? 'linear-gradient(135deg, #71717a 0%, #18181b 100%)'
                                : theme.hex,
                          }}
                        >
                          {isSelected && <Check size={13} strokeWidth={2.8} />}
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

            {/* Right Column: User Name, Personal Budget, PIN Lock & Reset Account Data */}
            <div className="space-y-5">
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CircularIcon name="lock" size="md" color="#10b981" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      مشخصات، بودجه کل و رمز ورود حساب «{userName}»
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      با گذاشتن رمز ۴ رقمی، هیچ‌کس بدون رمز نمی‌تواند وارد حساب شما شود
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      نام نمایشی حساب کاربری
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) =>
                        onUpdateSettings({
                          userName: e.target.value,
                          hootanName: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      سقف بودجه ماهانه ({settings.currencyUnit})
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
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    رمز ۴ رقمی ورود به حساب {userName}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="مثلاً: 1375 (خالی = بدون رمز)"
                      value={pinDraft}
                      onChange={(e) =>
                        setPinDraft(
                          toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4)
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-sans tabular-nums font-bold text-center text-slate-900 dark:text-white"
                    />
                    {settings.pinCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setPinDraft('');
                          onUpdateSettings({ pinCode: '' });
                          setPinSavedToast(`قفل رمز ۴ رقمی برای حساب ${userName} حذف شد.`);
                          setTimeout(() => setPinSavedToast(''), 3500);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-extrabold cursor-pointer shrink-0"
                      >
                        حذف رمز
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPin = toEnglishDigits(pinDraft)
                        .replace(/\D/g, '')
                        .slice(0, 4);
                      if (cleanPin.length > 0 && cleanPin.length < 4) {
                        setPinSavedToast('رمز ورود باید دقیقاً ۴ رقم باشد.');
                        setTimeout(() => setPinSavedToast(''), 3500);
                        return;
                      }
                      onUpdateSettings({ pinCode: cleanPin });
                      setPinSavedToast(
                        cleanPin
                          ? `رمز ۴ رقمی (${toPersianDigits(
                              cleanPin
                            )}) برای حساب ${userName} ذخیره شد`
                          : `تنظیمات بدون رمز برای حساب ${userName} ذخیره شد`
                      );
                      setTimeout(() => setPinSavedToast(''), 4000);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    <span>ذخیره رمز و تنظیمات حساب</span>
                  </button>

                  {settings.pinCode && onLockAppNow && (
                    <button
                      type="button"
                      onClick={onLockAppNow}
                      className="py-2.5 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Lock size={13} strokeWidth={2.4} />
                      <span>قفل کردن حساب الان</span>
                    </button>
                  )}
                </div>

                {pinSavedToast && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                    {pinSavedToast}
                  </div>
                )}
              </div>

              {/* Clean Reset / Wipe Current User Data Card */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-rose-500/30 p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      پاک‌سازی کامل داده‌های حساب «{userName}» (شروع از صفر)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      حذف تمام تراکنش‌ها، یادآورها و کارت‌های قبلی این کاربر برای شروع کاملاً تمیز
                    </p>
                  </div>

                  {!confirmClearData ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClearData(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold cursor-pointer shrink-0"
                    >
                      پاک‌سازی اطلاعات حساب
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClearCurrentUserData();
                          setConfirmClearData(false);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold cursor-pointer"
                      >
                        بله، کامل پاک شود
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearData(false)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
                  مقادیر تعیین شده در این بخش مستقیماً در صفحه «آمارها» با نمودار پیشرفت مقایسه می‌شوند
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
                    {catColor === hex && <Check size={13} strokeWidth={2.8} />}
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
                className="flex-1 py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1"
              >
                {editingCat ? (
                  <>
                    <Check size={14} />
                    <span>بروزرسانی دسته‌بندی</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>افزودن دسته‌بندی</span>
                  </>
                )}
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
                      ویرایش دسته
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

                {/* Subcategories List & Inline Rename/Add */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {cat.subCategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 rounded-xl px-2.5 py-1"
                      >
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleRenameSubCategory(cat, sub.id, e.target.value)
                          }
                          className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 w-24 focus:outline-none"
                        />
                        {cat.subCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSubCategory(cat, sub.id)}
                            className="text-rose-500 text-xs font-bold cursor-pointer flex items-center"
                            title="حذف زیردسته"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

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
                      className="px-3 py-1.5 rounded-xl theme-bg text-white text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>ثبت زیردسته</span>
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
                    {tagColor === hex && <Check size={13} strokeWidth={2.8} />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1"
            >
              {editingTag ? (
                <>
                  <Check size={14} />
                  <span>ذخیره تغییرات تگ</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>افزودن تگ</span>
                </>
              )}
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

      {/* SECTION 5: ISOLATED PER-USER GITHUB BACKUP & FILE EXPORT */}
      {activeSection === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Per-User Isolated GitHub Sync Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <CircularIcon name="refresh" size="md" color="#10b981" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    پشتیبان‌گیری ابری اختصاصی حساب «{userName}» روی گیت‌هاب
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ذخیره در فایل مجزای <code dir="ltr">{defaultUserFilePath}</code> (جدا از سایر کاربران)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await onManualSyncNow();
                  setGhSavedToast('پشتیبان‌گیری حساب شما در گیت‌هاب انجام شد');
                  setTimeout(() => setGhSavedToast(''), 3500);
                }}
                className="px-3.5 py-2 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw
                  size={13}
                  className={syncStatus === 'syncing' ? 'animate-spin' : ''}
                />
                <span>{syncStatus === 'syncing' ? 'در حال سینک...' : 'سینک الان'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    نام کاربری گیت‌هاب (Owner)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder={detectGitHubPagesRepo().repoOwner || 'baraary'}
                    value={settings.githubSync?.repoOwner || ''}
                    onChange={(e) =>
                      handleGitHubSyncField({ repoOwner: e.target.value.trim() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  توکن دسترسی گیت‌هاب (Personal Access Token)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={settings.githubSync?.token || ''}
                  onChange={(e) =>
                    handleGitHubSyncField({ token: e.target.value.trim() })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white"
                />
              </div>

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
                      filePath: defaultUserFilePath,
                    });
                    setGhSavedToast('در حال ذخیره فایل اختصاصی شما در گیت‌هاب...');
                    await onManualSyncNow();
                    setGhSavedToast(
                      `فایل اختصاصی حساب ${userName} با گیت‌هاب همگام‌سازی شد`
                    );
                    setTimeout(() => setGhSavedToast(''), 5000);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>ذخیره و سینک فایل اختصاصی {userName}</span>
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
                        filePath: defaultUserFilePath,
                        token: settings.githubSync?.token || '',
                      });
                      navigator.clipboard?.writeText(link);
                      setMagicLinkCopied(true);
                      setTimeout(() => setMagicLinkCopied(false), 4000);
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    {magicLinkCopied ? (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>لینک اتصال کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Link2 size={14} strokeWidth={2.3} />
                        <span>کپی لینک اتصال سریع</span>
                      </>
                    )}
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
                  خروجی فایل پشتیبان حساب «{userName}»
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  دانلود فایل دیتابیس JSON یا گزارش تک‌صفحه‌ای HTML اختصاصی این کاربر
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
                <span>دانلود فایل پشتیبان JSON ({userName})</span>
                <Download size={15} strokeWidth={2.4} />
              </button>

              <label className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold flex items-center justify-between cursor-pointer transition-colors">
                <span>بارگذاری فایل پشتیبان JSON در این حساب</span>
                <Upload size={15} strokeWidth={2.4} />
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
                <FileText size={15} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
