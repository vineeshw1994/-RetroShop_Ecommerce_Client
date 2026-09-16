import { api } from '@/lib/api';
import type {
  Basket,
  Category,
  FilterOptions,
  HomeFeed,
  Order,
  PageMeta,
  Product,
  ShopSettings,
} from '@/types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  platform?: string;
  condition?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  minRating?: number;
  ids?: string;
  sort?: string;
}

/** Drop empty values so the URL stays clean and cacheable. */
export const toParams = (query: object) => {
  const params: Record<string, string> = {};
  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params[key] = String(value);
  });
  return params;
};

export const shopService = {
  getHomeFeed: () => api.get<HomeFeed>('/shop/home'),

  getProducts: (query: ProductQuery = {}) =>
    api.get<Product[]>('/shop/products', { params: toParams(query) }),

  getFilterOptions: (category?: string) =>
    api.get<FilterOptions>('/shop/products/filters', {
      params: category ? { category } : undefined,
    }),

  getProduct: (slug: string) =>
    api.get<{ product: Product; related: Product[] }>(`/shop/products/${slug}`),

  getSuggestions: (term: string) =>
    api.get<{
      products: { id: number; name: string; slug: string; price: number; primaryImage: string | null }[];
      categories: Pick<Category, 'id' | 'name' | 'slug'>[];
    }>('/shop/products/suggestions', { params: { q: term } }),

  getCategories: () => api.get<Category[]>('/shop/categories'),

  getCategory: (slug: string) => api.get<Category>(`/shop/categories/${slug}`),

  getSettings: () => api.get<ShopSettings>('/shop/settings'),
};

export const basketService = {
  get: () => api.get<Basket>('/basket'),
  add: (productId: number, quantity = 1) => api.post<Basket>('/basket', { productId, quantity }),
  update: (id: number, quantity: number) => api.patch<Basket>(`/basket/${id}`, { quantity }),
  remove: (id: number) => api.delete<Basket>(`/basket/${id}`),
  clear: () => api.delete<Basket>('/basket'),
  merge: (items: { productId: number; quantity: number }[]) =>
    api.post<Basket>('/basket/merge', { items }),
  applyCoupon: (code: string) => api.post<Basket>('/basket/coupon', { code }),
};

export interface CheckoutPayload {
  addressId?: number;
  shippingAddress?: Record<string, string>;
  paymentMethod?: 'card' | 'cash_on_delivery' | 'bank_transfer';
  customerNote?: string;
  couponCode?: string;
}

export const orderService = {
  checkout: (payload: CheckoutPayload) =>
    api.post<Order>('/orders/checkout', payload) as Promise<{
      success: boolean;
      data: Order;
      meta?: { clientSecret: string | null };
      message?: string;
    }>,

  list: (query: { page?: number; limit?: number; status?: string; search?: string } = {}) =>
    api.get<Order[]>('/orders', { params: toParams(query) }) as Promise<{
      success: boolean;
      data: Order[];
      meta?: PageMeta;
    }>,

  get: (orderNumber: string) =>
    api.get<Order>(`/orders/${orderNumber}`) as Promise<{
      success: boolean;
      data: Order;
      meta?: { return: import('@/types').OrderReturnMeta };
    }>,

  confirmPayment: (orderNumber: string) => api.post<Order>(`/orders/${orderNumber}/pay`),

  cancel: (orderNumber: string, reason?: string) =>
    api.post<Order>(`/orders/${orderNumber}/cancel`, { reason }),

  requestReturn: (orderNumber: string, reason: string) =>
    api.post<unknown>(`/orders/${orderNumber}/return-request`, { reason }),
};

export const contactService = {
  submit: (payload: { name: string; email: string; phone?: string; subject: string; message: string }) =>
    api.post<{ id: number }>('/contact', payload),
};
