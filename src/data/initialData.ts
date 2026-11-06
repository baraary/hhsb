import {
  AppState,
  Category,
  TagItem,
  BankCard,
  Transaction,
  BudgetGoal,
  DueReminder,
  ColorThemeId,
  UserAccount,
} from '../types';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'hootan',
    name: 'هوتن',
    avatarColor: '#10b981',
    createdAt: 1700000000000,
  },
  {
    id: 'fatemeh',
    name: 'فاطمه',
    avatarColor: '#f43f5e',
    createdAt: 1700000001000,
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat_groceries',
    name: 'خوراک و روزمره',
    type: 'expense',
    icon: 'shopping-cart',
    color: '#10b981',
    subCategories: [
      { id: 'sub_supermarket', name: 'سوپرمارکت و لبنیات', icon: 'shopping-cart' },
      { id: 'sub_fruit', name: 'میوه و تره‌بار', icon: 'shopping-bag' },
      { id: 'sub_meat', name: 'پروتئینی و گوشت', icon: 'utensils' },
      { id: 'sub_bakery', name: 'نانوایی و شیرینی', icon: 'coffee' },
    ],
  },
  {
    id: 'cat_dining',
    name: 'رستوران و کافه',
    type: 'expense',
    icon: 'utensils',
    color: '#f59e0b',
    subCategories: [
      { id: 'sub_restaurant', name: 'رستوران و شام بیرون', icon: 'utensils' },
      { id: 'sub_cafe', name: 'کافه و قهوه', icon: 'coffee' },
      { id: 'sub_fastfood', name: 'سفارش آنلاین (اسنپ‌فود)', icon: 'smartphone' },
    ],
  },
  {
    id: 'cat_home',
    name: 'مسکن و قبوض',
    type: 'expense',
    icon: 'home',
    color: '#3b82f6',
    subCategories: [
      { id: 'sub_rent', name: 'اجاره و شارژ ساختمان', icon: 'home' },
      { id: 'sub_bills', name: 'قبض آب، برق، گاز و اینترنت', icon: 'smartphone' },
      { id: 'sub_appliances', name: 'لوازم و تعمیرات منزل', icon: 'settings' },
    ],
  },
  {
    id: 'cat_transport',
    name: 'خودرو و تردد',
    type: 'expense',
    icon: 'car',
    color: '#6366f1',
    subCategories: [
      { id: 'sub_fuel', name: 'بنزین و سوخت', icon: 'fuel' },
      { id: 'sub_taxi', name: 'اسنپ و تپسی', icon: 'car' },
      { id: 'sub_car_service', name: 'سرویس روغن و تعمیرات', icon: 'settings' },
    ],
  },
  {
    id: 'cat_fashion',
    name: 'پوشاک و زیبایی',
    type: 'expense',
    icon: 'sparkles',
    color: '#ec4899',
    subCategories: [
      { id: 'sub_clothes', name: 'لباس و کفش', icon: 'shopping-bag' },
      { id: 'sub_cosmetics', name: 'آرایشی و بهداشتی', icon: 'sparkles' },
      { id: 'sub_salon', name: 'آرایشگاه و پیرایش', icon: 'scissors' },
    ],
  },
  {
    id: 'cat_health',
    name: 'سلامت و درمان',
    type: 'expense',
    icon: 'heart-pulse',
    color: '#ef4444',
    subCategories: [
      { id: 'sub_doctor', name: 'ویزیت پزشک و آزمایش', icon: 'stethoscope' },
      { id: 'sub_pharmacy', name: 'داروخانه و مکمل', icon: 'heart-pulse' },
      { id: 'sub_sport', name: 'باشگاه و ورزش', icon: 'award' },
    ],
  },
  {
    id: 'cat_fun',
    name: 'تفریح، سفر و هدیه',
    type: 'expense',
    icon: 'plane',
    color: '#8b5cf6',
    subCategories: [
      { id: 'sub_travel', name: 'سفر و اقامتگاه', icon: 'plane' },
      { id: 'sub_gift', name: 'هدیه و مناسبت‌ها', icon: 'gift' },
      { id: 'sub_cinema', name: 'سینما، کنسرت و اشتراک', icon: 'tv' },
    ],
  },
  {
    id: 'cat_salary',
    name: 'حقوق و درآمد ثابت',
    type: 'income',
    icon: 'briefcase',
    color: '#10b981',
    subCategories: [
      { id: 'sub_monthly_salary', name: 'حقوق ماهانه شرکت', icon: 'briefcase' },
      { id: 'sub_bonus', name: 'پاداش و عیدی', icon: 'award' },
    ],
  },
  {
    id: 'cat_freelance',
    name: 'پروژه و سرمایه‌گذاری',
    type: 'income',
    icon: 'trending-up',
    color: '#06b6d4',
    subCategories: [
      { id: 'sub_project', name: 'پروژه فریلنسری', icon: 'dollar' },
      { id: 'sub_profit', name: 'سود بانکی و صندوق طلا', icon: 'trending-up' },
    ],
  },
];

export const INITIAL_TAGS: TagItem[] = [
  { id: 'tag_debt', name: 'بدهی', color: '#ef4444' },
  { id: 'tag_receivable', name: 'طلب', color: '#10b981' },
  { id: 'tag_installment', name: 'قسط و تعهدات', color: '#6366f1' },
  { id: 'tag_essential', name: 'ضروری', color: '#14b8a6' },
  { id: 'tag_weekend', name: 'آخر هفته', color: '#f59e0b' },
  { id: 'tag_guest', name: 'مهمانی', color: '#ec4899' },
  { id: 'tag_savings', name: 'پس‌انداز', color: '#06b6d4' },
  { id: 'tag_online', name: 'خرید اینترنتی', color: '#8b5cf6' },
];

export const INITIAL_CARDS: BankCard[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_BUDGETS: BudgetGoal[] = [
  { id: 'b_1', categoryId: 'cat_groceries', monthlyLimit: 8500000 },
  { id: 'b_2', categoryId: 'cat_dining', monthlyLimit: 3500000 },
  { id: 'b_3', categoryId: 'cat_home', monthlyLimit: 2500000 },
  { id: 'b_4', categoryId: 'cat_transport', monthlyLimit: 2500000 },
  { id: 'b_5', categoryId: 'cat_fashion', monthlyLimit: 4500000 },
  { id: 'b_6', categoryId: 'cat_health', monthlyLimit: 2500000 },
  { id: 'b_7', categoryId: 'cat_fun', monthlyLimit: 4000000 },
];

export const INITIAL_REMINDERS: DueReminder[] = [];

export function createCleanUserState(
  userId: string,
  userName: string,
  colorTheme: ColorThemeId = userId === 'fatemeh' ? 'rose' : 'emerald',
  repoOwner = '',
  repoName = '',
  token = ''
): AppState {
  return {
    userId,
    transactions: [],
    cards: [],
    categories: INITIAL_CATEGORIES,
    tags: INITIAL_TAGS,
    budgets: INITIAL_BUDGETS,
    reminders: [],
    dismissedReminderIds: ['rem_1', 'rem_2', 'rem_3'],
    importedSmsHashes: [],
    updatedAt: 0,
    settings: {
      userName,
      hootanName: userName,
      fatemehName: '',
      sharedLabel: '',
      currencyUnit: 'تومان',
      darkMode: true,
      themeMode: 'system',
      colorTheme,
      pinCode: '',
      monthlyTotalBudget: 25000000,
      githubSync: {
        enabled: true,
        repoOwner,
        repoName,
        branch: 'main',
        filePath: `data/users/${userId}-db.json`,
        token,
      },
    },
  };
}

export const INITIAL_STATE: AppState = createCleanUserState('hootan', 'هوتن', 'emerald');
