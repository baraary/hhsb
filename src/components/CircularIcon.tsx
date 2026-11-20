import React from 'react';
import {
  ShoppingCart,
  Home,
  Car,
  Utensils,
  HeartPulse,
  Sparkles,
  Gift,
  Wallet,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
  PieChart,
  Archive,
  Settings,
  Plus,
  Search,
  Calendar,
  Bell,
  Users,
  Tag,
  Lock,
  Moon,
  Sun,
  Download,
  RefreshCw,
  Check,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Coffee,
  Smartphone,
  Plane,
  Shield,
  Shirt,
  Fuel,
  Bus,
  Bike,
  Zap,
  Droplets,
  Flame,
  Wifi,
  GraduationCap,
  BookOpen,
  Dumbbell,
  Pill,
  Stethoscope,
  Baby,
  PawPrint,
  Wrench,
  Briefcase,
  Laptop,
  Gamepad2,
  Film,
  Music,
  Camera,
  Scissors,
  Landmark,
  Coins,
  PiggyBank,
  Receipt,
  Umbrella,
  Trees,
  Watch,
  Gem,
  Package,
  Store,
  Building2,
  Sofa,
  Hammer,
  Ticket,
  UtensilsCrossed,
} from 'lucide-react';

export type IconName =
  | 'shopping-cart'
  | 'home'
  | 'car'
  | 'utensils'
  | 'heart-pulse'
  | 'sparkles'
  | 'gift'
  | 'wallet'
  | 'banknote'
  | 'credit-card'
  | 'trending-up'
  | 'trending-down'
  | 'pie-chart'
  | 'archive'
  | 'settings'
  | 'plus'
  | 'search'
  | 'calendar'
  | 'bell'
  | 'users'
  | 'tag'
  | 'lock'
  | 'moon'
  | 'sun'
  | 'download'
  | 'refresh'
  | 'check'
  | 'x'
  | 'arrow-up-right'
  | 'arrow-down-left'
  | 'coffee'
  | 'smartphone'
  | 'plane'
  | 'shield'
  | 'shirt'
  | 'fuel'
  | 'bus'
  | 'bike'
  | 'zap'
  | 'droplets'
  | 'flame'
  | 'wifi'
  | 'graduation-cap'
  | 'book-open'
  | 'dumbbell'
  | 'pill'
  | 'stethoscope'
  | 'baby'
  | 'paw-print'
  | 'wrench'
  | 'briefcase'
  | 'laptop'
  | 'gamepad-2'
  | 'film'
  | 'music'
  | 'camera'
  | 'scissors'
  | 'landmark'
  | 'coins'
  | 'piggy-bank'
  | 'receipt'
  | 'umbrella'
  | 'trees'
  | 'watch'
  | 'gem'
  | 'package'
  | 'store'
  | 'building-2'
  | 'sofa'
  | 'hammer'
  | 'ticket'
  | 'utensils-crossed';

const ICON_MAP: Record<IconName, React.ElementType> = {
  'shopping-cart': ShoppingCart,
  home: Home,
  car: Car,
  utensils: Utensils,
  'heart-pulse': HeartPulse,
  sparkles: Sparkles,
  gift: Gift,
  wallet: Wallet,
  banknote: Banknote,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'pie-chart': PieChart,
  archive: Archive,
  settings: Settings,
  plus: Plus,
  search: Search,
  calendar: Calendar,
  bell: Bell,
  users: Users,
  tag: Tag,
  lock: Lock,
  moon: Moon,
  sun: Sun,
  download: Download,
  refresh: RefreshCw,
  check: Check,
  x: X,
  'arrow-up-right': ArrowUpRight,
  'arrow-down-left': ArrowDownLeft,
  coffee: Coffee,
  smartphone: Smartphone,
  plane: Plane,
  shield: Shield,
  shirt: Shirt,
  fuel: Fuel,
  bus: Bus,
  bike: Bike,
  zap: Zap,
  droplets: Droplets,
  flame: Flame,
  wifi: Wifi,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  dumbbell: Dumbbell,
  pill: Pill,
  stethoscope: Stethoscope,
  baby: Baby,
  'paw-print': PawPrint,
  wrench: Wrench,
  briefcase: Briefcase,
  laptop: Laptop,
  'gamepad-2': Gamepad2,
  film: Film,
  music: Music,
  camera: Camera,
  scissors: Scissors,
  landmark: Landmark,
  coins: Coins,
  'piggy-bank': PiggyBank,
  receipt: Receipt,
  umbrella: Umbrella,
  trees: Trees,
  watch: Watch,
  gem: Gem,
  package: Package,
  store: Store,
  'building-2': Building2,
  sofa: Sofa,
  hammer: Hammer,
  ticket: Ticket,
  'utensils-crossed': UtensilsCrossed,
};

export const AVAILABLE_ICONS: { id: IconName; label: string }[] = [
  // خرید و خوراک
  { id: 'shopping-cart', label: 'سوپرمارکت' },
  { id: 'store', label: 'فروشگاه' },
  { id: 'package', label: 'خرید آنلاین' },
  { id: 'utensils', label: 'رستوران' },
  { id: 'utensils-crossed', label: 'فست‌فود' },
  { id: 'coffee', label: 'کافه و چای' },
  { id: 'shirt', label: 'پوشاک و مد' },
  { id: 'watch', label: 'اکسسوری' },
  { id: 'gem', label: 'جواهرات' },
  { id: 'gift', label: 'هدیه و مناسبت' },
  // خانه و قبوض
  { id: 'home', label: 'خانه و اجاره' },
  { id: 'building-2', label: 'شارژ ساختمان' },
  { id: 'sofa', label: 'لوازم منزل' },
  { id: 'hammer', label: 'بازسازی' },
  { id: 'wrench', label: 'تعمیرات' },
  { id: 'zap', label: 'قبض برق' },
  { id: 'droplets', label: 'قبض آب' },
  { id: 'flame', label: 'قبض گاز' },
  { id: 'wifi', label: 'اینترنت' },
  { id: 'smartphone', label: 'موبایل و شارژ' },
  // حمل‌ونقل و سفر
  { id: 'car', label: 'خودرو' },
  { id: 'fuel', label: 'بنزین و سوخت' },
  { id: 'bus', label: 'حمل‌ونقل' },
  { id: 'bike', label: 'پیک و دوچرخه' },
  { id: 'plane', label: 'سفر و بلیط' },
  // سلامت، ورزش و زیبایی
  { id: 'heart-pulse', label: 'درمان و سلامت' },
  { id: 'stethoscope', label: 'ویزیت پزشک' },
  { id: 'pill', label: 'داروخانه' },
  { id: 'dumbbell', label: 'ورزش و باشگاه' },
  { id: 'scissors', label: 'آرایشگاه' },
  { id: 'sparkles', label: 'زیبایی' },
  { id: 'baby', label: 'کودک' },
  { id: 'paw-print', label: 'حیوان خانگی' },
  // آموزش، کار و دیجیتال
  { id: 'graduation-cap', label: 'آموزش و کلاس' },
  { id: 'book-open', label: 'کتاب و مطالعه' },
  { id: 'briefcase', label: 'کار و درآمد' },
  { id: 'laptop', label: 'لپ‌تاپ و گجت' },
  // تفریح و فرهنگ
  { id: 'film', label: 'سینما و فیلم' },
  { id: 'music', label: 'موسیقی' },
  { id: 'gamepad-2', label: 'بازی و سرگرمی' },
  { id: 'camera', label: 'عکاسی و هنر' },
  { id: 'ticket', label: 'بلیط و رویداد' },
  { id: 'trees', label: 'طبیعت و پارک' },
  // مالی، بانک و سرمایه‌گذاری
  { id: 'wallet', label: 'کیف پول' },
  { id: 'banknote', label: 'حقوق و نقد' },
  { id: 'credit-card', label: 'کارت بانکی' },
  { id: 'landmark', label: 'بانک و اقساط' },
  { id: 'coins', label: 'طلا و سکه' },
  { id: 'piggy-bank', label: 'پس‌انداز' },
  { id: 'trending-up', label: 'سرمایه‌گذاری' },
  { id: 'receipt', label: 'مالیات و عوارض' },
  { id: 'umbrella', label: 'بیمه' },
  { id: 'shield', label: 'امنیت و ضمانت' },
  { id: 'tag', label: 'سایر موارد' },
];

export const CATEGORY_PALETTE_COLORS: string[] = [
  '#10b981', // زمردی
  '#059669', // سبز جنگلی
  '#22c55e', // سبز روشن
  '#84cc16', // لیمویی
  '#14b8a6', // آبی‌سبز
  '#06b6d4', // فیروزه‌ای
  '#0ea5e9', // آبی آسمانی
  '#3b82f6', // آبی کلاسیک
  '#2563eb', // آبی کبالت
  '#6366f1', // نیلی
  '#8b5cf6', // بنفش
  '#a855f7', // ارغوانی
  '#d946ef', // سرخابی
  '#ec4899', // صورتی
  '#f43f5e', // رز یاقوتی
  '#ef4444', // قرمز
  '#dc2626', // زرشکی
  '#f97316', // نارنجی
  '#ea580c', // مرجانی تیره
  '#f59e0b', // کهربایی
  '#eab308', // طلایی
  '#a16207', // برنزی
  '#64748b', // خاکستری سرد
  '#334155', // ذغالی
];

interface CircularIconProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'soft' | 'solid' | 'glass';
  className?: string;
}

export const CircularIcon: React.FC<CircularIconProps> = ({
  name,
  color = '#10b981',
  size = 'md',
  variant = 'soft',
  className = '',
}) => {
  const IconComponent = ICON_MAP[name as IconName] || Tag;

  const sizeMap = {
    xs: { box: 'w-7 h-7', icon: 14 },
    sm: { box: 'w-9 h-9', icon: 17 },
    md: { box: 'w-11 h-11', icon: 20 },
    lg: { box: 'w-13 h-13', icon: 24 },
    xl: { box: 'w-16 h-16', icon: 28 },
  };

  const { box, icon } = sizeMap[size];

  const getStyle = (): React.CSSProperties => {
    if (variant === 'solid') {
      return {
        backgroundColor: color,
        color: '#ffffff',
        boxShadow: `0 6px 18px -4px ${color}66`,
      };
    }
    if (variant === 'glass') {
      return {
        backgroundColor: 'rgba(255,255,255,0.16)',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.22)',
      };
    }
    // Soft translucent circular badge
    return {
      backgroundColor: `${color}1f`,
      color: color,
      border: `1px solid ${color}33`,
    };
  };

  return (
    <span
      style={getStyle()}
      className={`${box} rounded-full inline-flex items-center justify-center shrink-0 transition-transform duration-200 ${className}`}
    >
      <IconComponent size={icon} strokeWidth={2.1} />
    </span>
  );
};
