/* Shapes returned by the Express API. Kept in one place so pages and slices
 * agree on the contract. */

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PageMeta;
  summary?: unknown;
  errors?: FieldError[] | null;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type ProductCondition = 'new' | 'like_new' | 'very_good' | 'good' | 'fair';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'card' | 'cash_on_delivery' | 'bank_transfer';

export type BannerPlacement = 'home_hero' | 'home_side' | 'promo_strip' | 'category_top';

export type GameRequestStatus = 'pending' | 'sourcing' | 'found' | 'unavailable' | 'fulfilled';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  marketingOptIn: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: 'super_admin' | 'staff';
  jobTitle: string | null;
  permissions: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdBy?: { id: number; name: string } | null;
}

export interface PermissionModule {
  key: string;
  label: string;
  description: string;
  actions: string[];
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  productCount?: number;
  children?: Category[];
  parent?: Pick<Category, 'id' | 'name' | 'slug'> | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  brand: string | null;
  platform: string | null;
  condition: ProductCondition;
  shortDescription: string | null;
  description: string | null;
  price: number;
  salePrice: number | null;
  costPrice: number | null;
  tradeInPrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  stock: number;
  lowStockThreshold: number;
  warrantyMonths: number;
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  viewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  images?: ProductImage[];
  primaryImage: string | null;
  cardImage: string | null;
  inStock: boolean;
  isLowStock: boolean;
  inWishlist?: boolean;
  canReview?: boolean;
  hasReviewed?: boolean;
  reviews?: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; avatar: string | null };
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image: string | null;
  mobileImage: string | null;
  linkUrl: string | null;
  linkType?: 'none' | 'category' | 'product';
  linkCategoryId?: number | null;
  linkProductId?: number | null;
  linkProductIds?: number[] | null;
  linkCategory?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  linkProduct?: Pick<Product, 'id' | 'name' | 'slug'> | null;
  ctaLabel: string | null;
  placement: BannerPlacement;
  theme: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  clickCount: number;
  isLive?: boolean;
  scheduleState?: 'live' | 'scheduled' | 'expired';
}

export interface HomeFeed {
  heroBanners: Banner[];
  sideBanners: Banner[];
  promoStrip: Banner[];
  categories: Category[];
  featured: Product[];
  newArrivals: Product[];
  bestSellers: Product[];
  onSale: Product[];
}

export interface FilterOptions {
  platforms: { value: string; count: number }[];
  brands: { value: string; count: number }[];
  conditions: { value: ProductCondition; label: string }[];
  priceRange: { min: number; max: number };
}

export interface BasketLine {
  id: number;
  productId: number;
  name: string;
  slug: string;
  sku: string;
  image: string | null;
  condition: ProductCondition;
  platform: string | null;
  unitPrice: number;
  listPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  maxQuantity: number;
  isUnavailable: boolean;
  exceedsStock: boolean;
}

export interface BasketSummary {
  itemCount: number;
  lineCount: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: string;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  hasIssues: boolean;
  couponCode?: string;
}

export interface Basket {
  lines: BasketLine[];
  summary: BasketSummary;
}

/** A guest basket entry held in localStorage before sign in. */
export interface GuestBasketEntry {
  productId: number;
  quantity: number;
}

export interface Address {
  id: number;
  userId: number;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  country: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'userId'>;

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postcode: string;
  country: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number | null;
  name: string;
  slug: string | null;
  sku: string | null;
  image: string | null;
  condition: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  product?: { id: number; slug: string; isActive: boolean; images?: ProductImage[] };
}

export interface OrderEvent {
  id: number;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  createdBy?: { id: number; name: string } | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: ShippingAddress;
  customerNote: string | null;
  adminNote: string | null;
  trackingNumber: string | null;
  courier: string | null;
  placedAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  paymentIntentId?: string | null;
  stripeRefundId?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  events?: OrderEvent[];
  customer?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
}

export interface WishlistEntry {
  id: number;
  addedAt: string;
  product: Product;
}

export interface ShopSettings {
  returnDays: number;
}

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ReturnRequest {
  id: number;
  orderId: number;
  userId: number;
  reason: string;
  status: ReturnRequestStatus;
  adminNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  order?: Pick<Order, 'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'total' | 'deliveredAt'> & {
    customer?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  };
  handledBy?: { id: number; name: string } | null;
}

export interface OrderReturnMeta {
  eligible: boolean;
  returnDays: number;
  daysRemaining: number;
  deadline: string | null;
  canRequest: boolean;
  request: Pick<ReturnRequest, 'id' | 'status' | 'reason' | 'adminNote' | 'createdAt' | 'respondedAt'> | null;
}

export interface StripeTransaction {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  type: string;
  status: string;
  description: string | null;
  chargeId: string | null;
  paymentIntentId: string | null;
  refundId: string | null;
  createdAt: string;
  availableOn: string | null;
  order: {
    id: number;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    total: number;
    customer: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  } | null;
  refundable: boolean;
}

export interface GameRequest {
  id: number;
  userId: number;
  title: string;
  platform: string | null;
  conditionPreference: 'any' | 'new' | 'used';
  maxBudget: number | null;
  notes: string | null;
  status: GameRequestStatus;
  adminResponse: string | null;
  linkedProductId: number | null;
  respondedAt: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  handledBy?: { id: number; name: string } | null;
  linkedProduct?: Pick<Product, 'id' | 'name' | 'slug'> | null;
}

export interface AccountOverview {
  orderCount: number;
  lifetimeSpend: number;
  wishlistCount: number;
  requestCount: number;
  recentOrders: Order[];
}

/* ----- Admin ----- */

export interface KpiValue {
  value: number;
  change: number;
}

export interface DashboardData {
  range: { from: string; to: string };
  kpis: {
    revenue: KpiValue;
    orders: KpiValue;
    averageOrderValue: KpiValue;
    newCustomers: KpiValue;
    unitsSold: KpiValue;
  };
  trend: { date: string; orders: number; revenue: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: { productId: number; name: string; units: number; revenue: number }[];
  topCategories: { category: string; units: number; revenue: number }[];
  alerts: { lowStockCount: number; pendingRequests: number; unreadContacts?: number; pendingReturns?: number };
  recentOrders: Order[];
}

export interface SalesReport {
  range: { from: string; to: string };
  groupBy: 'day' | 'week' | 'month';
  series: {
    period: string;
    orders: number;
    units: number;
    subtotal: number;
    shipping: number;
    revenue: number;
  }[];
  totals: { orders: number; units: number; revenue: number; shipping: number };
  byPaymentMethod: { paymentMethod: PaymentMethod; orders: number; revenue: number }[];
}

export interface ProductReport {
  range: { from: string; to: string };
  topSellers: {
    productId: number;
    name: string;
    sku: string;
    units: number;
    orderCount: number;
    revenue: number;
  }[];
  noSales: {
    id: number;
    name: string;
    sku: string;
    stock: number;
    price: number;
    primaryImage: string | null;
    listedAt: string;
  }[];
}

export interface CustomerReport {
  range: { from: string; to: string };
  signupTrend: { date: string; signups: number }[];
  topSpenders: { userId: number; name: string; email: string; orders: number; spend: number }[];
  loyalty: { oneTime: number; repeatBuyers: number };
}

export interface AdminCustomer extends User {
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
}

export interface CustomerDetail {
  customer: User & { addresses: Address[] };
  stats: { orderCount: number; totalSpend: number; averageOrderValue: number };
  orders: Order[];
  wishlist: { id: number; product: Pick<Product, 'id' | 'name' | 'slug' | 'price'> }[];
  gameRequests: GameRequest[];
}

export interface InventoryRow {
  id: number;
  name: string;
  sku: string;
  slug: string;
  stock: number;
  lowStockThreshold: number;
  price: number;
  costPrice: number | null;
  soldCount: number;
  isActive: boolean;
  platform: string | null;
  condition: ProductCondition;
  category?: { id: number; name: string };
  primaryImage: string | null;
  state: 'out' | 'low' | 'healthy';
  retailValue: number;
}

export interface InventorySummary {
  skuCount: number;
  unitsOnHand: number;
  retailValue: number;
  costValue: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export interface InventoryLog {
  id: number;
  productId: number;
  type: 'restock' | 'sale' | 'adjustment' | 'return' | 'cancellation';
  quantityChange: number;
  stockAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
  product?: { id: number; name: string; sku: string };
  admin?: { id: number; name: string } | null;
}

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  scope: 'all' | 'categories' | 'products';
  categoryIds: number[] | null;
  productIds: number[] | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'replied';
  replyBody: string | null;
  repliedAt: string | null;
  createdAt: string;
  repliedBy?: { id: number; name: string } | null;
}
