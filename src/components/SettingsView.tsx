import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  LayoutGrid,
  GalleryHorizontalEnd,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Search,
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
import {
  CircularIcon,
  AVAILABLE_ICONS,
  CATEGORY_PALETTE_COLORS,
  IconName,
} from './CircularIcon';
import { PWAInstallButton } from './PWAInstallButton';
import {
  formatMoney,
  formatAmountToTomanWords,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/persian';
import { createPartnerMagicLink, detectGitHubPagesRepo } from '../utils/githubSync';
import {
  isAndroidApkWithSmsSupport,
  hasAndroidNotificationPermission,
  requestAndroidNotificationPermission,
} from '../utils/bankSmsParser';

export type SettingsSectionId =
  | 'hub'
  | 'account'
  | 'security'
  | 'appearance'
  | 'app'
  | 'categories'
  | 'tags'
  | 'budgets'
  | 'sync'
  | 'backup';

interface SettingsViewProps {
  state: AppState;
  users: UserAccount[];
  activeUserId: string;
  onSwitchUser: (userId: string) => void;
  onCreateUser: (name: string, initialPin?: string) => void;
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
  requestedSection?: SettingsSectionId | null;
  onConsumeRequestedSection?: () => void;
  onSubPageOpenChange?: (isSubPageOpen: boolean) => void;
  resetToHubSignal?: number;
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

interface SectionMeta {
  id: Exclude<SettingsSectionId, 'hub'>;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}

const SECTION_META: Record<Exclude<SettingsSectionId, 'hub'>, SectionMeta> = {
  account: {
    id: 'account',
    title: 'حساب کاربری و کاربران',
    description: 'نام نمایشی، تعویض حساب و مدیریت کاربران مجزا',
    icon: 'users',
    color: '#10b981',
  },
  security: {
    id: 'security',
    title: 'امنیت و رمز ورود',
    description: 'رمز ۴ رقمی، حالت محرمانه و قفل فوری برنامه',
    icon: 'lock',
    color: '#6366f1',
  },
  appearance: {
    id: 'appearance',
    title: 'ظاهر، تم رنگی و واحد پول',
    description: 'حالت روز و شب، ۱۰ تم رنگی، ریال/تومان و نمای کارت‌ها',
    icon: 'sparkles',
    color: '#0ea5e9',
  },
  app: {
    id: 'app',
    title: 'نصب و امکانات اپلیکیشن',
    description: 'نسخه اندروید، ویجت، اعلان پیامک و نصب روی گوشی',
    icon: 'smartphone',
    color: '#14b8a6',
  },
  categories: {
    id: 'categories',
    title: 'دسته‌بندی‌ها و زیردسته‌ها',
    description: 'افزودن، ویرایش رنگ و آیکون و مدیریت زیردسته‌ها',
    icon: 'shopping-cart',
    color: '#f59e0b',
  },
  tags: {
    id: 'tags',
    title: 'مدیریت تگ‌ها',
    description: 'ساخت و شخصی‌سازی برچسب‌های رنگی تراکنش‌ها',
    icon: 'tag',
    color: '#ec4899',
  },
  budgets: {
    id: 'budgets',
    title: 'سقف بودجه ماهانه',
    description: 'تعیین بودجه کل ماه و سقف هر دسته‌بندی هزینه',
    icon: 'pie-chart',
    color: '#10b981',
  },
  sync: {
    id: 'sync',
    title: 'همگام‌سازی ابری گیت‌هاب',
    description: 'ذخیره‌سازی خودکار ابری و ساخت لینک اتصال سریع',
    icon: 'refresh',
    color: '#06b6d4',
  },
  backup: {
    id: 'backup',
    title: 'پشتیبان‌گیری، گزارش و پاک‌سازی',
    description: 'خروجی و ورودی JSON، گزارش HTML و بازنشانی حساب',
    icon: 'download',
    color: '#f43f5e',
  },
};

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
  requestedSection,
  onConsumeRequestedSection,
  onSubPageOpenChange,
  resetToHubSignal,
}) => {
  const { settings, categories, tags, budgets } = state;
  const userName = settings.userName || settings.hootanName || 'کاربر';
  const isAdminHootan = activeUserId === 'hootan';
  const activeUserObj = users.find((u) => u.id === activeUserId);
  const isAndroidApk = isAndroidApkWithSmsSupport();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('hub');

  // Open requested sub-section (e.g. from StatsView -> Budgets)
  useEffect(() => {
    if (requestedSection) {
      setActiveSection(requestedSection);
      onConsumeRequestedSection?.();
    }
  }, [requestedSection, onConsumeRequestedSection]);

  // Reset to Hub when parent triggers back signal (e.g. Android hardware Back button)
  useEffect(() => {
    if (resetToHubSignal && resetToHubSignal > 0) {
      setActiveSection('hub');
    }
  }, [resetToHubSignal]);

  useEffect(() => {
    onSubPageOpenChange?.(activeSection !== 'hub');
  }, [activeSection, onSubPageOpenChange]);

  // New User Creation state (Admin only)
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userActionNotice, setUserActionNotice] = useState('');
  const [confirmClearData, setConfirmClearData] = useState(false);

  // Category Editor States
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catIcon, setCatIcon] = useState<IconName>('shopping-cart');
  const [catColor, setCatColor] = useState('#10b981');
  const [catFilterType, setCatFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [iconSearch, setIconSearch] = useState('');
  const [newSubNamesByCat, setNewSubNamesByCat] = useState<Record<string, string>>({});

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

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const filteredCategoriesList = useMemo(() => {
    if (catFilterType === 'all') return categories;
    return categories.filter((c) => c.type === catFilterType);
  }, [categories, catFilterType]);

  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return AVAILABLE_ICONS;
    return AVAILABLE_ICONS.filter(
      (ic) => ic.label.toLowerCase().includes(q) || ic.id.toLowerCase().includes(q)
    );
  }, [iconSearch]);

  const getCategoryBudgetLimit = (categoryId: string): number => {
    const found = budgets.find((b) => b.categoryId === categoryId);
    return found ? found.monthlyLimit : 0;
  };

  const totalCategoryBudgetsSum = expenseCategories.reduce(
    (sum, cat) => sum + getCategoryBudgetLimit(cat.id),
    0
  );

  const openSection = (sec: Exclude<SettingsSectionId, 'hub'>) => {
    setActiveSection(sec);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon((cat.icon as IconName) || 'shopping-cart');
    setCatColor(cat.color);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    const draft = (newSubNamesByCat[cat.id] || '').trim();
    if (!draft) return;
    const updated: Category = {
      ...cat,
      subCategories: [
        ...cat.subCategories,
        {
          id: `sub_${Date.now()}`,
          name: draft,
          icon: cat.icon,
        },
      ],
    };
    onSaveCategory(updated);
    if (editingCat?.id === cat.id) {
      setEditingCat(updated);
    }
    setNewSubNamesByCat((prev) => ({ ...prev, [cat.id]: '' }));
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
    const clean = tagName.trim().replace(/^#+/, '');
    if (!clean) return;
    const updated: TagItem = editingTag
      ? { ...editingTag, name: clean, color: tagColor }
      : { id: `tag_${Date.now()}`, name: clean, color: tagColor };
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

  // Live subtitles for the Settings Hub rows
  const currentThemeMode: ThemeMode =
    settings.themeMode || (settings.darkMode ? 'dark' : 'light');
  const themeModeLabel =
    currentThemeMode === 'system'
      ? 'خودکار با گوشی'
      : currentThemeMode === 'dark'
      ? 'حالت تاریک'
      : 'حالت روشن';
  const currentColorThemeName =
    COLOR_THEMES.find((t) => t.id === settings.colorTheme)?.name.split(' ')[0] || 'زمردی';

  const renderHubRow = (
    id: Exclude<SettingsSectionId, 'hub'>,
    subtitle: string,
    trailingBadge?: string
  ) => {
    const meta = SECTION_META[id];
    return (
      <button
        key={id}
        type="button"
        onClick={() => openSection(id)}
        className="w-full min-h-[64px] px-4 py-3.5 flex items-center gap-3.5 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800/80 transition-colors cursor-pointer"
      >
        <CircularIcon name={meta.icon} color={meta.color} size="md" variant="soft" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
            {meta.title}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {subtitle}
          </div>
        </div>
        {trailingBadge && (
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
            {trailingBadge}
          </span>
        )}
        <ChevronLeft size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </button>
    );
  };

  // =========================================================================
  // MAIN SETTINGS HUB (Native App Grouped List)
  // =========================================================================
  if (activeSection === 'hub') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        {/* Account Identity Header Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => openSection('account')}
            className="flex items-center gap-3.5 min-w-0 flex-1 text-right cursor-pointer group"
          >
            <div
              className="w-13 h-13 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm"
              style={{ backgroundColor: activeUserObj?.avatarColor || '#10b981' }}
            >
              {userName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {userName}
                </h2>
                {isAdminHootan && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShieldCheck size={13} />
                    <span>مدیر</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                {toPersianDigits(state.transactions.length)} تراکنش ·{' '}
                {toPersianDigits(state.cards.length)} کارت بانکی · واحد {settings.currencyUnit}
              </p>
            </div>
          </button>

          {onLockAppNow && (
            <button
              type="button"
              onClick={onLockAppNow}
              className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Lock size={14} strokeWidth={2.3} />
              <span>قفل حساب</span>
            </button>
          )}
        </div>

        {/* Group 1: Account & Security */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 px-2">
            حساب کاربری و امنیت
          </h3>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
            {renderHubRow(
              'account',
              isAdminHootan
                ? `حساب فعال: ${userName} · مدیریت ${toPersianDigits(users.length)} کاربر مجزا`
                : `نام نمایشی: ${userName} · حساب شخصی مجزا`
            )}
            {renderHubRow(
              'security',
              `${settings.pinCode ? 'رمز ۴ رقمی فعال' : 'بدون رمز'} · ${
                settings.privacyMode ? 'حالت محرمانه روشن' : 'نمایش عادی مبالغ'
              }`
            )}
          </div>
        </section>

        {/* Group 2: Appearance & App */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 px-2">
            ظاهر و تنظیمات برنامه
          </h3>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
            {renderHubRow(
              'appearance',
              `${themeModeLabel} · تم ${currentColorThemeName} · واحد ${settings.currencyUnit}`
            )}
            {renderHubRow(
              'app',
              isAndroidApk
                ? `نسخه اندروید ${toPersianDigits(
                    window.AndroidSmsBridge?.getNativeAppVersion?.() || '5.0'
                  )} · ویجت و اعلان پس‌زمینه`
                : 'نصب اپلیکیشن اندروید و افزودن به صفحه اصلی'
            )}
          </div>
        </section>

        {/* Group 3: Financial Personalization */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 px-2">
            مدیریت مالی و شخصی‌سازی
          </h3>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
            {renderHubRow(
              'categories',
              `${toPersianDigits(AVAILABLE_ICONS.length)} آیکون و ${toPersianDigits(
                CATEGORY_PALETTE_COLORS.length
              )} رنگ قابل انتخاب`,
              `${toPersianDigits(categories.length)} دسته`
            )}
            {renderHubRow(
              'tags',
              'ساخت و ویرایش برچسب‌های رنگی برای گزارش‌گیری سریع',
              `${toPersianDigits(tags.length)} تگ`
            )}
            {renderHubRow(
              'budgets',
              settings.monthlyTotalBudget > 0
                ? `بودجه کل ماه: ${formatMoney(
                    settings.monthlyTotalBudget,
                    true,
                    settings.currencyUnit
                  )}`
                : 'تعیین سقف بودجه ماهانه برای هر دسته‌بندی'
            )}
          </div>
        </section>

        {/* Group 4: Sync & Backup */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 px-2">
            همگام‌سازی و پشتیبان‌گیری
          </h3>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
            {renderHubRow(
              'sync',
              settings.githubSync?.token
                ? syncStatus === 'syncing'
                  ? 'در حال همگام‌سازی ابری...'
                  : syncStatus === 'error'
                  ? 'خطا در همگام‌سازی (برای بررسی بزنید)'
                  : 'متصل به گیت‌هاب · همگام‌سازی خودکار فعال'
                : 'اتصال به ریپازیتوری گیت‌هاب و ساخت لینک دعوت'
            )}
            {renderHubRow(
              'backup',
              'خروجی و بازیابی فایل JSON · گزارش HTML · بازنشانی حساب'
            )}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // SUB-PAGE SHELL HEADER (Shared across all dedicated settings pages)
  // =========================================================================
  const activeMeta = SECTION_META[activeSection];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* Dedicated Sub-Page Top Bar with RTL Back Button */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveSection('hub')}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-extrabold cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
            <span>تنظیمات</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <CircularIcon
              name={activeMeta.icon}
              color={activeMeta.color}
              size="sm"
              variant="soft"
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {activeMeta.title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {activeMeta.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SUB-PAGE 1: ACCOUNT & MULTI-USER MANAGEMENT                         */}
      {/* =================================================================== */}
      {activeSection === 'account' && (
        <div className="space-y-5">
          {/* Display Name Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              نام نمایشی حساب فعلی
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={userName}
                onChange={(e) =>
                  onUpdateSettings({
                    userName: e.target.value,
                    hootanName: e.target.value,
                  })
                }
                placeholder="نام نمایشی شما..."
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                تغییرات به‌صورت خودکار ذخیره می‌شوند.
              </span>
            </div>
          </div>

          {/* Multi-User Isolated Accounts Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  حساب‌های کاربری مجزا (ایزوله و مستقل)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  هر کاربر دیتابیس، کارت‌ها، تراکنش‌ها، رمز ورود و تنظیمات کاملاً جداگانه‌ای دارد.
                </p>
              </div>

              {isAdminHootan ? (
                <button
                  type="button"
                  onClick={() => setIsAddingUser((prev) => !prev)}
                  className="min-h-[42px] px-4 py-2 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                >
                  {isAddingUser ? (
                    <>
                      <X size={14} />
                      <span>بستن فرم</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} strokeWidth={2.5} />
                      <span>افزودن کاربر جدید</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>افزودن کاربر جدید مخصوص مدیر اصلی است</span>
                </div>
              )}
            </div>

            {isAdminHootan && isAddingUser && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleanPin = toEnglishDigits(newUserPin).replace(/\D/g, '').slice(0, 4);
                  if (!newUserName.trim() || cleanPin.length !== 4) return;
                  const createdName = newUserName.trim();
                  onCreateUser(createdName, cleanPin);
                  setNewUserName('');
                  setNewUserPin('');
                  setIsAddingUser(false);
                  setUserActionNotice(`حساب کاربری «${createdName}» ساخته شد و در سرور ذخیره گردید.`);
                  setTimeout(() => setUserActionNotice(''), 4000);
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
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={4}
                  value={newUserPin}
                  onChange={(e) =>
                    setNewUserPin(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="رمز ۴ رقمی"
                  className="w-full sm:w-36 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center tabular-nums text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newUserName.trim() || newUserPin.length !== 4}
                  className="px-5 py-2.5 rounded-xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>ساخت حساب</span>
                </button>
              </form>
            )}

            {userActionNotice && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {userActionNotice}
              </div>
            )}

            {isAdminHootan ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                {users.map((u) => {
                  const isCurrent = u.id === activeUserId;
                  const isUserAdmin = u.id === 'hootan';
                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-emerald-500/8'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCurrent) onSwitchUser(u.id);
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 text-right cursor-pointer"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                          style={{ backgroundColor: u.avatarColor || '#10b981' }}
                        >
                          {u.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {u.name}
                            </span>
                            {isUserAdmin && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck size={12} />
                                <span>مدیر</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            {isCurrent ? (
                              <>
                                <Check size={12} className="text-emerald-500" />
                                <span>حساب فعال فعلی</span>
                              </>
                            ) : (
                              <>
                                <Lock size={11} />
                                <span>ورود با رمز اختصاصی</span>
                                <ArrowLeft size={11} />
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      {!isCurrent &&
                        onDeleteUser &&
                        u.id !== 'hootan' &&
                        u.id !== 'fatemeh' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteUser(u.id);
                              setUserActionNotice(`حساب کاربری «${u.name}» به طور کامل حذف شد.`);
                              setTimeout(() => setUserActionNotice(''), 4000);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-1 shrink-0 cursor-pointer"
                            title={`حذف کامل اکانت ${u.name}`}
                          >
                            <Trash2 size={13} />
                            <span>حذف</span>
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  شما با حساب شخصی <strong>«{userName}»</strong> وارد شده‌اید. حساب سایر کاربران قفل است و ورود به آن‌ها فقط با رمز ۴ رقمی همان کاربر امکان‌پذیر است.
                </div>

                {onLockAppNow && (
                  <button
                    type="button"
                    onClick={onLockAppNow}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Lock size={13} strokeWidth={2.4} />
                    <span>تعویض کاربر با رمز</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 2: SECURITY, PIN & PRIVACY                                 */}
      {/* =================================================================== */}
      {activeSection === 'security' && (
        <div className="space-y-5">
          {/* 4-Digit PIN Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                رمز ۴ رقمی ورود به حساب «{userName}»
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                بدون این رمز هیچ‌کس روی این دستگاه یا دستگاه‌های دیگر نمی‌تواند وارد حساب شما شود.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                رمز عددی ۴ رقمی
              </label>
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
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-sans tabular-nums font-black tracking-[0.5em] text-center text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const cleanPin = toEnglishDigits(pinDraft).replace(/\D/g, '').slice(0, 4);
                  if (cleanPin.length !== 4) {
                    setPinSavedToast('برای امنیت حساب، رمز ورود باید دقیقاً ۴ رقم باشد.');
                    setTimeout(() => setPinSavedToast(''), 3500);
                    return;
                  }
                  onUpdateSettings({ pinCode: cleanPin });
                  setPinSavedToast(
                    `رمز ۴ رقمی (${toPersianDigits(cleanPin)}) برای حساب ${userName} ذخیره و فعال شد.`
                  );
                  setTimeout(() => setPinSavedToast(''), 4000);
                }}
                className="flex-1 min-h-[46px] py-2.5 px-4 rounded-2xl theme-bg text-white text-xs sm:text-sm font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={15} strokeWidth={2.5} />
                <span>ذخیره رمز ۴ رقمی</span>
              </button>

              {onLockAppNow && (
                <button
                  type="button"
                  onClick={onLockAppNow}
                  className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-extrabold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Lock size={14} strokeWidth={2.4} />
                  <span>قفل فوری / تعویض کاربر</span>
                </button>
              )}
            </div>

            {pinSavedToast && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {pinSavedToast}
              </div>
            )}
          </div>

          {/* Privacy Mode Toggle Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                {settings.privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  حالت محرمانه (مخفی‌سازی موجودی و مبالغ)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  مناسب استفاده از برنامه در مکان‌های عمومی و روی ویجت صفحه اصلی
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdateSettings({ privacyMode: !settings.privacyMode })}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer shrink-0 transition-colors ${
                settings.privacyMode
                  ? 'theme-bg text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {settings.privacyMode ? 'فعال' : 'غیرفعال'}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 3: APPEARANCE, COLOR THEME, CURRENCY & CARDS LAYOUT        */}
      {/* =================================================================== */}
      {activeSection === 'appearance' && (
        <div className="space-y-5">
          {/* 3-Way Light / Dark / System Mode */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                حالت زمینه برنامه
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                در حالت «خودکار با گوشی»، برنامه به‌صورت زنده با تم روز و شب سیستم هماهنگ می‌شود.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
              {(
                [
                  { id: 'system', label: 'خودکار با گوشی', Icon: Smartphone },
                  { id: 'light', label: 'حالت روشن', Icon: Sun },
                  { id: 'dark', label: 'حالت تاریک', Icon: Moon },
                ] as { id: ThemeMode; label: string; Icon: React.ElementType }[]
              ).map((m) => {
                const isActive = currentThemeMode === m.id;
                const ModeIcon = m.Icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (m.id === 'system') {
                        let prefersDark =
                          window.matchMedia &&
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
                        try {
                          if (typeof window.AndroidSmsBridge?.isSystemDarkMode === 'function') {
                            prefersDark = Boolean(window.AndroidSmsBridge.isSystemDarkMode());
                          }
                        } catch {
                          // fallback
                        }
                        onUpdateSettings({ themeMode: 'system', darkMode: prefersDark });
                      } else {
                        onUpdateSettings({ themeMode: m.id, darkMode: m.id === 'dark' });
                      }
                    }}
                    className={`min-h-[44px] py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              تم رنگی برنامه ({toPersianDigits(COLOR_THEMES.length)} رنگ)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COLOR_THEMES.map((theme) => {
                const isSelected = settings.colorTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onUpdateSettings({ colorTheme: theme.id })}
                    className={`min-h-[48px] flex items-center gap-2.5 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-900/5 dark:bg-white/12 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white border border-white/25"
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

          {/* Currency Unit & Cards Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                واحد پولی برنامه
              </h3>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ currencyUnit: 'ریال' })}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    settings.currencyUnit === 'ریال'
                      ? 'theme-bg text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ریال (پیش‌فرض بانکی)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ currencyUnit: 'تومان' })}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    settings.currencyUnit === 'تومان'
                      ? 'theme-bg text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  تومان
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                با تغییر بین ریال و تومان، تمامی مبالغ فعلی متناسب با واحد جدید تنظیم می‌شوند و معادل حروفی زیر کادرها همیشه به تومان نمایش داده می‌شود.
              </p>
            </div>

            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                نحوه نمایش کارت‌های بانکی
              </h3>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ cardsViewMode: 'carousel' })}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    (settings.cardsViewMode || 'carousel') === 'carousel'
                      ? 'theme-bg text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <GalleryHorizontalEnd size={14} strokeWidth={2.3} />
                  <span>اسکرول افقی</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ cardsViewMode: 'grid' })}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    settings.cardsViewMode === 'grid'
                      ? 'theme-bg text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <LayoutGrid size={14} strokeWidth={2.3} />
                  <span>لیست شبکه‌ای</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                تعیین کنید کارت‌ها در صفحه «کارت‌ها» به شکل اسلایدر افقی ورق‌زدنی نمایش داده شوند یا به‌صورت شبکه‌ای زیر هم.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 4: APP INSTALL & NATIVE ANDROID CAPABILITIES               */}
      {/* =================================================================== */}
      {activeSection === 'app' && (
        <div className="space-y-5">
          {isAndroidApk && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone size={16} className="theme-text" />
                  <span>
                    امکانات بومی اندروید (نسخه{' '}
                    {toPersianDigits(
                      window.AndroidSmsBridge?.getNativeAppVersion?.() || '5.0'
                    )}
                    )
                  </span>
                </h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  اجرای آنی آفلاین‌اول
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5">
                <p>
                  • برای افزودن <strong>ویجت هم‌حساب</strong> روی صفحه اصلی گوشی، انگشت خود را روی فضای خالی صفحه اصلی نگه دارید ← Widgets ← هم‌حساب را انتخاب کنید.
                </p>
                <p>
                  • با فعال بودن اعلان پیامک بانکی، حتی زمانی که برنامه بسته است با دریافت پیامک واریز یا برداشت، اعلان ثبت سریع نمایش داده می‌شود.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {!hasAndroidNotificationPermission() && (
                  <button
                    type="button"
                    onClick={() => requestAndroidNotificationPermission()}
                    className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold cursor-pointer"
                  >
                    فعال‌سازی اعلان پیامک بانکی در پس‌زمینه
                  </button>
                )}

                {typeof window.AndroidSmsBridge?.clearWebCacheAndReload === 'function' && (
                  <button
                    type="button"
                    onClick={() => window.AndroidSmsBridge?.clearWebCacheAndReload?.()}
                    className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    <span>به‌روزرسانی فوری نسخه وب (پاک‌سازی کش)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
            <PWAInstallButton
              repoOwner={settings.githubSync?.repoOwner}
              repoName={settings.githubSync?.repoName}
              variant="settings"
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 5: CATEGORIES & SUBCATEGORIES (54 ICONS & 24 COLORS)       */}
      {/* =================================================================== */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Create / Edit Category Form */}
          <form
            onSubmit={handleSaveCategoryForm}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <CircularIcon name={catIcon} color={catColor} size="sm" variant="solid" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {editingCat ? `ویرایش «${editingCat.name}»` : 'ساخت دسته‌بندی جدید'}
                </h3>
              </div>
              {editingCat && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCat(null);
                    setCatName('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                نام دسته‌بندی
              </label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="مثلاً: ورزش و باشگاه، حیوان خانگی..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setCatType('expense')}
                className={`py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                  catType === 'expense'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                دسته هزینه
              </button>
              <button
                type="button"
                onClick={() => setCatType('income')}
                className={`py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                  catType === 'income'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                دسته درآمد
              </button>
            </div>

            {/* 24 Colors Picker (Padded so ring is never clipped) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  انتخاب رنگ ({toPersianDigits(CATEGORY_PALETTE_COLORS.length)} رنگ)
                </label>
              </div>
              <div className="flex flex-wrap gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
                {CATEGORY_PALETTE_COLORS.map((hex) => {
                  const active = catColor === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCatColor(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white cursor-pointer transition-transform ${
                        active
                          ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      aria-label={`انتخاب رنگ ${hex}`}
                    >
                      {active && <Check size={13} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 54 Icons Picker with Search + Padded Grid (Zero Clipping) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  انتخاب آیکون ({toPersianDigits(AVAILABLE_ICONS.length)} آیکون)
                </label>
              </div>
              <div className="relative mb-2">
                <Search
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="جستجوی آیکون (مثلاً: ورزش، قبض، سفر، دارو)..."
                  className="w-full pr-8 pl-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
                {filteredIcons.map((ic) => {
                  const active = catIcon === ic.id;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setCatIcon(ic.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/12 text-slate-900 dark:text-white'
                          : 'border-transparent bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <CircularIcon
                        name={ic.id}
                        color={catColor}
                        size="sm"
                        variant={active ? 'solid' : 'soft'}
                      />
                      <span className="text-[10px] font-bold truncate max-w-full">
                        {ic.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!catName.trim()}
              className="w-full min-h-[44px] py-2.5 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer disabled:opacity-45 flex items-center justify-center gap-1.5"
            >
              {editingCat ? (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>ذخیره تغییرات دسته‌بندی</span>
                </>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} />
                  <span>افزودن دسته‌بندی جدید</span>
                </>
              )}
            </button>
          </form>

          {/* Existing Categories List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                فهرست دسته‌بندی‌ها ({toPersianDigits(filteredCategoriesList.length)})
              </span>
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {(
                  [
                    { id: 'all', label: 'همه' },
                    { id: 'expense', label: 'هزینه' },
                    { id: 'income', label: 'درآمد' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCatFilterType(f.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all ${
                      catFilterType === f.id
                        ? 'theme-bg text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredCategoriesList.map((cat) => (
              <div
                key={cat.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CircularIcon name={cat.icon} color={cat.color} size="md" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {cat.type === 'expense' ? 'دسته هزینه' : 'دسته درآمد'} ·{' '}
                        {toPersianDigits(cat.subCategories.length)} زیردسته
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditCategory(cat)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      ویرایش
                    </button>
                    {categories.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold cursor-pointer"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories List & Inline Add */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
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
                      placeholder={`افزودن زیردسته جدید به «${cat.name}»...`}
                      value={newSubNamesByCat[cat.id] || ''}
                      onChange={(e) =>
                        setNewSubNamesByCat((prev) => ({
                          ...prev,
                          [cat.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubCategory(cat);
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={!(newSubNamesByCat[cat.id] || '').trim()}
                      onClick={() => handleAddSubCategory(cat)}
                      className="px-3 py-2 rounded-xl theme-bg text-white text-xs font-bold cursor-pointer disabled:opacity-45 flex items-center gap-1 shrink-0"
                    >
                      <Plus size={13} />
                      <span>افزودن</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 6: TAGS MANAGEMENT (24 COLORS)                             */}
      {/* =================================================================== */}
      {activeSection === 'tags' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSaveTagForm}
            className="md:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {editingTag ? `ویرایش تگ #${editingTag.name}` : 'افزودن تگ جدید'}
              </h3>
              {editingTag && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTag(null);
                    setTagName('');
                  }}
                  className="text-xs font-bold text-slate-500 cursor-pointer"
                >
                  انصراف
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                عنوان تگ (بدون #)
              </label>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="مثلاً: سفر_شمال، ضروری، قسط_وام"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                رنگ تگ ({toPersianDigits(CATEGORY_PALETTE_COLORS.length)} رنگ)
              </label>
              <div className="flex flex-wrap gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
                {CATEGORY_PALETTE_COLORS.map((hex) => {
                  const active = tagColor === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setTagColor(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white cursor-pointer transition-transform ${
                        active
                          ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      aria-label={`انتخاب رنگ ${hex}`}
                    >
                      {active && <Check size={13} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!tagName.trim()}
              className="w-full min-h-[44px] py-2.5 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer disabled:opacity-45 flex items-center justify-center gap-1.5"
            >
              {editingTag ? (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>ذخیره تغییرات تگ</span>
                </>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} />
                  <span>افزودن تگ</span>
                </>
              )}
            </button>
          </form>

          <div className="md:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              فهرست تگ‌های فعال ({toPersianDigits(tags.length)})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CircularIcon name="tag" color={tag.color} size="sm" />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                      #{tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTag(tag);
                        setTagName(tag.name);
                        setTagColor(tag.color);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
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

      {/* =================================================================== */}
      {/* SUB-PAGE 7: MONTHLY TOTAL & PER-CATEGORY BUDGETS                    */}
      {/* =================================================================== */}
      {activeSection === 'budgets' && (
        <div className="space-y-5">
          {/* Monthly Total Budget Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  سقف بودجه کل ماهانه
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  مجموع مخارج ماه شما در داشبورد و آمارها با این سقف مقایسه می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ monthlyTotalBudget: totalCategoryBudgetsSum })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                برابر با مجموع دسته‌ها ({formatMoney(totalCategoryBudgetsSum, true, settings.currencyUnit)})
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                مبلغ سقف ماهانه ({settings.currencyUnit})
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={settings.monthlyTotalBudget > 0 ? formatMoney(settings.monthlyTotalBudget) : ''}
                placeholder="۰"
                onChange={(e) => {
                  const num = parseInt(
                    toEnglishDigits(e.target.value).replace(/\D/g, '') || '0',
                    10
                  );
                  onUpdateSettings({ monthlyTotalBudget: num });
                }}
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              {settings.monthlyTotalBudget > 0 && (
                <p className="mt-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  معادل به تومان:{' '}
                  {formatAmountToTomanWords(
                    settings.monthlyTotalBudget,
                    settings.currencyUnit
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Per-Category Budget Limits */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  سقف بودجه هر دسته‌بندی هزینه
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  در صفحه «آمارها» میزان مصرف هر دسته نسبت به سقف آن نمایش داده می‌شود
                </p>
              </div>
              <div className="text-left shrink-0">
                <span className="text-[10px] text-slate-400 block">مجموع دسته‌ها</span>
                <span className="text-xs sm:text-sm font-black theme-text tabular-nums">
                  {formatMoney(totalCategoryBudgetsSum, true, settings.currencyUnit)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expenseCategories.map((cat) => {
                const currentLimit = getCategoryBudgetLimit(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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

                    <div className="w-40 shrink-0">
                      <label className="block text-[10px] text-slate-400 mb-1 text-left">
                        سقف ({settings.currencyUnit})
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currentLimit > 0 ? formatMoney(currentLimit) : ''}
                        placeholder="بدون سقف"
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
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 8: GITHUB CLOUD SYNC & MAGIC LINK                          */}
      {/* =================================================================== */}
      {activeSection === 'sync' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                همگام‌سازی ابری حساب «{userName}» روی گیت‌هاب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ذخیره در فایل اختصاصی <code dir="ltr">{defaultUserFilePath}</code> (کاملاً جدا از سایر کاربران)
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                await onManualSyncNow();
                setGhSavedToast('پشتیبان‌گیری حساب شما در گیت‌هاب انجام شد');
                setTimeout(() => setGhSavedToast(''), 3500);
              }}
              className="min-h-[42px] px-4 py-2 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
            >
              <RefreshCw
                size={14}
                className={syncStatus === 'syncing' ? 'animate-spin' : ''}
              />
              <span>{syncStatus === 'syncing' ? 'در حال سینک...' : 'سینک همین الان'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
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
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl theme-bg text-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
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
                  className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
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
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {ghSavedToast}
              </div>
            )}

            {syncStatus === 'error' && syncErrorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
                {syncErrorMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-PAGE 9: BACKUP, EXPORT, IMPORT & DATA RESET                     */}
      {/* =================================================================== */}
      {activeSection === 'backup' && (
        <div className="space-y-5">
          {/* Backup & Export Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                پشتیبان‌گیری و خروجی فایل حساب «{userName}»
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                دانلود فایل دیتابیس JSON برای بازیابی بعدی، یا گزارش تک‌صفحه‌ای HTML قابل چاپ
              </p>
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
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl theme-gradient text-white text-xs sm:text-sm font-extrabold flex items-center justify-between shadow-sm cursor-pointer"
              >
                <span>دانلود فایل پشتیبان JSON ({userName})</span>
                <Download size={16} strokeWidth={2.4} />
              </button>

              <label className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-extrabold flex items-center justify-between cursor-pointer transition-colors">
                <span>بارگذاری و بازیابی فایل JSON در این حساب</span>
                <Upload size={16} strokeWidth={2.4} />
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
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-extrabold flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>دانلود فایل گزارش تک‌صفحه‌ای HTML</span>
                <FileText size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* Danger Zone: Wipe Current User Data */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-rose-500/30 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  پاک‌سازی کامل داده‌های حساب «{userName}» (شروع از صفر)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حذف تمام تراکنش‌ها، یادآورها و کارت‌های قبلی این کاربر برای شروع کاملاً تمیز
                </p>
              </div>

              {!confirmClearData ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearData(true)}
                  className="min-h-[42px] px-4 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold cursor-pointer shrink-0 self-start sm:self-auto"
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
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold cursor-pointer"
                  >
                    بله، کامل پاک شود
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearData(false)}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
