export type ProductCategory = 'games' | 'subscriptions' | 'psn_cards' | 'steam_cards';

export type UserRole = 'owner' | 'staff' | 'customer';

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'pending_payment'
  | 'payment_proof'
  | 'payment_confirmed'
  | 'delivered'
  | 'refunded';

export type PaymentMethodType = 'cliq' | 'bank_transfer' | 'cash_pickup';
export type PaymentMethod = PaymentMethodType;

export type Language = 'ar' | 'en';
export type ThemeMode = 'dark' | 'light';
export type Currency = 'JOD' | 'USD';

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  category: ProductCategory;
  priceJOD: number;
  priceUSD: number;
  originalPriceJOD?: number;
  originalPriceUSD?: number;
  rating: number;
  reviewsCount: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  badgeAr?: string;
  badgeEn?: string;
  image: string;
  platform: 'PS5' | 'PS4 & PS5' | 'PS4' | 'Steam / PC' | 'Global / Multi';
  regionAr: string;
  regionEn: string;
  deliveryTypeAr: string;
  deliveryTypeEn: string;
  shortDescAr: string;
  shortDescEn: string;
  descriptionAr: string;
  descriptionEn: string;
  featuresAr: string[];
  featuresEn: string[];
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productNameAr: string;
  productNameEn: string;
  category: ProductCategory;
  priceJOD: number;
  priceUSD: number;
  quantity: number;
  image: string;
  digitalCodeOrCredentials?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  twitter?: string;
  youtube?: string;
  telegram?: string;
  discord?: string;
  snapchat?: string;
  linkedin?: string;
}

export interface BrandingSettings {
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  bannerUrl?: string;
  headerBannerUrl?: string;
  customHeaderTitleAr?: string;
  customHeaderTitleEn?: string;
  sloganAr?: string;
  sloganEn?: string;
  accentColor?: string;
  primaryAccentColor?: string;
}

export interface DeliveryCompany {
  id: string;
  nameAr: string;
  nameEn: string;
  phone?: string;
  trackingUrl?: string;
  estimatedDaysAr: string;
  estimatedDaysEn: string;
  active: boolean;
}

export interface GovernorateDeliveryRate {
  id: string;
  nameAr: string;
  nameEn: string;
  priceJOD: number;
  estimatedDaysAr?: string;
  estimatedDaysEn?: string;
  active: boolean;
}

export type GovernorateRate = GovernorateDeliveryRate;

export interface FulfillmentSettings {
  allowPickup: boolean;
  pickupAddressAr: string;
  pickupAddressEn: string;
  pickupHoursAr: string;
  pickupHoursEn: string;
  pickupPhone: string;
  pickupInstructionsAr: string;
  pickupInstructionsEn: string;
  allowDelivery: boolean;
  freeDeliveryThresholdJOD?: number;
  governorates: GovernorateDeliveryRate[];
  deliveryCompanies: DeliveryCompany[];
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  noteAr: string;
  noteEn: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredDeliveryMethod: 'whatsapp' | 'email' | 'both';
  fulfillmentType: 'pickup' | 'delivery';
  shippingGovernorate?: string;
  shippingAddress?: string;
  shippingNotes?: string;
  shippingCostJOD: number;
  shippingCostUSD: number;
  deliveryCompanyId?: string;
  deliveryCompanyName?: string;
  paymentMethod: PaymentMethodType;
  paymentProofImage?: string;
  paymentReference?: string;
  items: OrderItem[];
  subtotalJOD: number;
  subtotalUSD: number;
  discountJOD: number;
  discountUSD: number;
  totalJOD: number;
  totalUSD: number;
  appliedPromoCode?: string;
  notes?: string;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  digitalDeliveries?: {
    itemTitle: string;
    codeOrAccount: string;
    instructionsAr: string;
    instructionsEn: string;
  }[];
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  city?: string;
  registeredAt: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'authenticator' | 'whatsapp' | 'sms' | 'email';
  twoFactorSecret?: string;
  twoFactorPhone?: string;
  twoFactorBackupCodes?: string[];
  twoFactorCreatedAt?: string;
  emailVerified?: boolean;
  sensitiveActionVerifiedUntil?: number; // session timestamp for step-up verification
}

export type SensitiveActionType = 
  | 'admin_access'
  | 'profile_update'
  | 'password_change'
  | 'role_update'
  | 'factory_reset'
  | 'store_settings_update'
  | 'delete_product'
  | 'export_data';

export interface SensitiveVerificationChallenge {
  id: string;
  actionType: SensitiveActionType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  targetEmail: string;
  targetPhone?: string;
  code: string; // 6-digit code e.g. "849201"
  expiresAt: number; // ms timestamp
  deliveryChannel: 'email' | 'sms' | 'whatsapp';
  attemptsCount: number;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
}

export interface SimulatedEmailMessage {
  id: string;
  toEmail: string;
  subjectAr: string;
  subjectEn: string;
  code: string;
  actionNameAr: string;
  actionNameEn: string;
  timestamp: string;
  expiresInSeconds: number;
  channel: 'email' | 'sms' | 'whatsapp';
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId?: string; // 'admin' or user ID
  ticketId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  subject: string;
  orderNumber?: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  lastActivity: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' or specific user ID
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'order' | 'system' | 'promo' | 'support';
  linkHash?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface StoreSettings {
  storeNameAr: string;
  storeNameEn: string;
  taglineAr: string;
  taglineEn: string;
  descriptionAr: string;
  descriptionEn: string;
  whatsappNumber: string;
  contactPhone: string;
  contactEmail: string;
  locationAr: string;
  locationEn: string;
  cliqAlias: string;
  cliqIBAN: string;
  bankNameAr: string;
  bankNameEn: string;
  bankAccountName: string;
  bankIBAN: string;
  cashPickupLocationAr: string;
  cashPickupLocationEn: string;
  deliveryNoteAr: string;
  deliveryNoteEn: string;
  isMaintenanceMode: boolean;
  maintenanceMessageAr: string;
  maintenanceMessageEn: string;
  defaultCurrency: Currency;
  usdExchangeRate: number; // 1 JOD = ~1.41 USD (or 1 USD = 0.71 JOD)
  lowStockGlobalThreshold: number;
  socialLinks: SocialLinks;
  branding: BrandingSettings;
  fulfillment: FulfillmentSettings;
}

export interface StoreState {
  settings: StoreSettings;
  products: Product[];
  users: User[];
  reviews: Review[];
  orders: Order[];
  supportTickets: SupportTicket[];
  supportMessages: SupportMessage[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  siteVisits: number;
  promoCodes: {
    code: string;
    discountPercent?: number;
    discountFixedJOD?: number;
    active: boolean;
  }[];
}
