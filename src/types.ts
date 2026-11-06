export type PersonId = 'hootan' | 'fatemeh' | 'shared' | string;
export type RecorderId = 'hootan' | 'fatemeh' | string;
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

export type CardColorThemeId =
  | 'auto'
  | 'pastel_rose'
  | 'pastel_lavender'
  | 'pastel_mint'
  | 'pastel_sky'
  | 'pastel_peach'
  | 'pastel_lilac'
  | 'pastel_pistachio'
  | 'pastel_aqua'
  | 'pastel_champagne'
  | 'pastel_coral'
  | 'pastel_periwinkle'
  | 'pastel_pearl'
  | 'emerald_night'
  | 'royal_cobalt'
  | 'crimson_ruby'
  | 'obsidian_gold'
  | 'violet_nebula'
  | 'sunset_amber'
  | 'persian_turquoise'
  | 'midnight_slate'
  | 'rose_velvet'
  | 'forest_olive'
  | 'cyber_indigo'
  | 'copper_bronze';

export type CardPatternId =
  | 'silk_waves'
  | 'persian_girih'
  | 'isometric_prism'
  | 'orbital_aurora'
  | 'topographic'
  | 'circuit_nodes'
  | 'bauhaus_arcs'
  | 'guilloche'
  | 'starfield_mesh'
  | 'lotus_mandala'
  | 'hex_honeycomb'
  | 'aurora_ribbons'
  | 'fibonacci_shells'
  | 'origami_facets'
  | 'islamic_arabesque'
  | 'sound_spectrum'
  | 'celestial_compass'
  | 'japanese_seigaiha'
  | 'crystal_lattice'
  | 'minimal_glow';

export interface UserAccount {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: number;
  isAdmin?: boolean;
  pinCode?: string;
}

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
  owner?: string;
  initialBalance: number;
  expiryDate: string; // e.g., 05/03
  isDefault?: boolean;
  cardColorTheme?: CardColorThemeId; // 'auto' or custom pastel/glass gradient
  patternId?: CardPatternId; // Vector background pattern
}

export interface Transaction {
  id: string;
  title: string;
  amount: number; // Toman
  type: TransactionType;
  categoryId: string;
  subCategoryId: string;
  tags: string[]; // array of tag IDs
  spentBy: string;
  recordedBy: string;
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
  person?: string;
  cardId?: string;
  isPaid: boolean;
  recurrence?: ReminderRecurrence;
  totalInstallments?: number; // Optional total installments count (e.g. 12, 24)
  paidInstallments?: number; // Number of installments paid so far
  paidDates?: string[]; // Dates when installments were checked off
  note?: string;
}

export interface GitHubSyncConfig {
  enabled: boolean;
  repoOwner: string; // e.g. baraary
  repoName: string; // e.g. hhsb
  branch: string; // e.g. main
  filePath: string; // e.g. data/users/hootan-db.json
  token?: string; // Optional PAT if pushing directly from browser
  lastSyncedAt?: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  userName: string; // Name of this isolated user account
  hootanName: string; // Kept for backward compatibility
  fatemehName: string; // Kept for backward compatibility
  sharedLabel: string; // Kept for backward compatibility
  currencyUnit: 'تومان' | 'ریال';
  darkMode: boolean;
  themeMode?: ThemeMode;
  colorTheme: ColorThemeId;
  pinCode: string; // Per-user PIN lock
  monthlyTotalBudget: number; // Personal monthly total budget
  autoCheckClipboardSms?: boolean;
  githubSync?: GitHubSyncConfig;
}

export interface AppState {
  userId?: string;
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
