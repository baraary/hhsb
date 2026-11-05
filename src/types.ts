export type PersonId = 'hootan' | 'fatemeh' | 'shared';
export type RecorderId = 'hootan' | 'fatemeh';
export type TransactionType = 'expense' | 'income';
export type ColorThemeId =
  | 'emerald'
  | 'ocean'
  | 'rose'
  | 'amber'
  | 'violet'
  | 'turquoise'
  | 'monochrome'
  | 'coral'
  | 'indigo'
  | 'olive';

export interface SubCategory {
  id: string;
  name: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  subCategories: SubCategory[];
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
}

export type IranianBankId =
  | 'mellat'
  | 'melli'
  | 'saman'
  | 'pasargad'
  | 'parsian'
  | 'tejarat'
  | 'saderat'
  | 'maskan'
  | 'keshavarzi'
  | 'sepah'
  | 'blu'
  | 'resalat'
  | 'ayandeh'
  | 'shahr'
  | 'gardeshgari'
  | 'eghtesad_novin'
  | 'refah'
  | 'mehr_iran'
  | 'sina'
  | 'karafarin'
  | 'dey'
  | 'sarmayeh'
  | 'postbank'
  | 'bankino'
  | 'izbank'
  | 'khavarmianeh'
  | 'sanat_madan'
  | 'tosee_taavon'
  | 'other';

export interface BankCard {
  id: string;
  title: string;
  bankId: IranianBankId;
  cardNumber: string; // 16 digits
  shebaNumber?: string;
  owner: 'hootan' | 'fatemeh' | 'shared';
  initialBalance: number;
  expiryDate: string; // e.g., 05/03
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number; // Toman
  type: TransactionType;
  categoryId: string;
  subCategoryId: string;
  tags: string[]; // array of tag IDs
  spentBy: PersonId; // هوتن | فاطمه | مشترک (در صورت درآمد: دریافت‌کننده)
  recordedBy: RecorderId; // ثبت شده توسط هوتن یا فاطمه
  cardId: string;
  jalaliDate: string; // YYYY/MM/DD e.g., 1403/08/14
  time: string; // HH:mm e.g., 19:45
  note?: string;
  smsHash?: string; // Prevents duplicate bank SMS imports
  createdAt: number;
}

export interface BudgetGoal {
  id: string;
  categoryId: string;
  monthlyLimit: number; // Toman
}

export type ReminderRecurrence = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface DueReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // e.g., 1403/08/25
  category: 'installment' | 'rent' | 'debt' | 'receivable' | 'bill';
  person: PersonId;
  cardId?: string;
  isPaid: boolean;
  recurrence?: ReminderRecurrence;
  totalInstallments?: number; // Optional total installments count (e.g. 12, 24)
  paidInstallments?: number; // Number of installments paid so far
  note?: string;
}

export interface GitHubSyncConfig {
  enabled: boolean;
  repoOwner: string; // e.g. hootan
  repoName: string; // e.g. hamhesab-data
  branch: string; // e.g. main
  filePath: string; // e.g. public/data/hamhesab-db.json
  token?: string; // Optional PAT if pushing directly from browser
  lastSyncedAt?: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  hootanName: string;
  fatemehName: string;
  sharedLabel: string;
  currencyUnit: 'تومان' | 'ریال';
  darkMode: boolean;
  themeMode?: ThemeMode;
  colorTheme: ColorThemeId;
  pinCode: string; // Optional security lock for private GitHub Pages
  monthlyTotalBudget: number;
  autoCheckClipboardSms?: boolean; // Optional auto-detect bank SMS on app focus
  githubSync?: GitHubSyncConfig;
}

export interface AppState {
  transactions: Transaction[];
  cards: BankCard[];
  categories: Category[];
  tags: TagItem[];
  budgets: BudgetGoal[];
  reminders?: DueReminder[];
  dismissedReminderIds?: string[];
  importedSmsHashes?: string[];
  settings: AppSettings;
  updatedAt?: number;
}
