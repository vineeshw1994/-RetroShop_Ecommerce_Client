import { adminApi, downloadFile } from '@/lib/api';
import { toParams } from './shop.service';
import type {
  AdminCustomer,
  AdminUser,
  Banner,
  Category,
  CustomerDetail,
  CustomerReport,
  DashboardData,
  Coupon,
  ContactMessage,
  GameRequest,
  InventoryLog,
  InventoryRow,
  InventorySummary,
  Order,
  OrderStatus,
  PageMeta,
  PermissionModule,
  Product,
  ProductReport,
  SalesReport,
  User,
} from '@/types';

interface Paged<T> {
  success: boolean;
  data: T[];
  meta?: PageMeta;
  summary?: unknown;
}

/** Build multipart form data, skipping empty optional fields. */
const toFormData = (
  values: object,
  files: Record<string, File | File[] | null | undefined> = {},
  arrays: Record<string, string[] | undefined> = {}
) => {
  const form = new FormData();

  Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((entry) => form.append(key, String(entry)));
      return;
    }
    form.append(key, String(value));
  });

  Object.entries(arrays).forEach(([key, entries]) => {
    entries?.forEach((entry) => form.append(key, entry));
  });

  Object.entries(files).forEach(([key, file]) => {
    if (!file) return;
    if (Array.isArray(file)) file.forEach((entry) => form.append(key, entry));
    else form.append(key, file);
  });

  return form;
};

export interface UploadFile {
  url: string;
  name: string;
  folder: string;
  size: number;
  updatedAt: string;
}

export const adminUploadService = {
  list: (query: { page?: number; limit?: number; folder?: string; search?: string } = {}) =>
    adminApi.get<UploadFile[]>('/admin/uploads', { params: toParams(query) }) as Promise<
      Paged<UploadFile>
    >,

  uploadProducts: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return adminApi.post<UploadFile[]>('/admin/uploads/products', form);
  },
};

export const adminDashboardService = {
  get: (range: { dateFrom?: string; dateTo?: string } = {}) =>
    adminApi.get<DashboardData>('/admin/dashboard', { params: toParams(range) }),
};

export const adminAlertService = {
  get: () =>
    adminApi.get<{
      lowStockCount: number;
      pendingRequests: number;
      unreadContacts: number;
      pendingReturns: number;
    }>('/admin/alerts'),
};

export const adminReportService = {
  sales: (query: { dateFrom?: string; dateTo?: string; groupBy?: string } = {}) =>
    adminApi.get<SalesReport>('/admin/reports/sales', { params: toParams(query) }),

  products: (query: { dateFrom?: string; dateTo?: string } = {}) =>
    adminApi.get<ProductReport>('/admin/reports/products', { params: toParams(query) }),

  customers: (query: { dateFrom?: string; dateTo?: string } = {}) =>
    adminApi.get<CustomerReport>('/admin/reports/customers', { params: toParams(query) }),

  exportSales: (query: { dateFrom?: string; dateTo?: string; groupBy?: string; format?: 'csv' | 'xlsx' } = {}) =>
    downloadFile(
      `/admin/reports/sales/export?${new URLSearchParams(toParams(query)).toString()}`,
      `sales-report.${query.format === 'xlsx' ? 'xlsx' : 'csv'}`
    ),

  exportProducts: (query: { dateFrom?: string; dateTo?: string; format?: 'csv' | 'xlsx' } = {}) =>
    downloadFile(
      `/admin/reports/products/export?${new URLSearchParams(toParams(query)).toString()}`,
      `product-report.${query.format === 'xlsx' ? 'xlsx' : 'csv'}`
    ),

  exportCustomers: (query: { dateFrom?: string; dateTo?: string; format?: 'csv' | 'xlsx' } = {}) =>
    downloadFile(
      `/admin/reports/customers/export?${new URLSearchParams(toParams(query)).toString()}`,
      `customer-report.${query.format === 'xlsx' ? 'xlsx' : 'csv'}`
    ),
};

export interface AdminProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  platform?: string;
  condition?: string;
  status?: 'active' | 'inactive';
  featured?: boolean;
  stock?: 'in' | 'low' | 'out';
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

export const adminProductService = {
  list: (query: AdminProductQuery = {}) =>
    adminApi.get<Product[]>('/admin/products', { params: toParams(query) }) as Promise<Paged<Product>>,

  get: (id: number) =>
    adminApi.get<{
      product: Product;
      stats: { unitsSold: number };
      inventoryLogs: InventoryLog[];
    }>(`/admin/products/${id}`),

  create: (
    values: Record<string, unknown>,
    images?: File[],
    cardImage?: File | null,
    options: { existingImageUrls?: string[]; cardImageUrl?: string | null } = {}
  ) =>
    adminApi.post<Product>(
      '/admin/products',
      toFormData(
        {
          ...values,
          ...(options.cardImageUrl ? { cardImageUrl: options.cardImageUrl } : {}),
        },
        { images, cardImage },
        { existingImageUrls: options.existingImageUrls }
      )
    ),

  update: (
    id: number,
    values: Record<string, unknown>,
    images?: File[],
    cardImage?: File | null,
    options: {
      existingImageUrls?: string[];
      cardImageUrl?: string | null;
      clearCardImage?: boolean;
    } = {}
  ) =>
    adminApi.patch<Product>(
      `/admin/products/${id}`,
      toFormData(
        {
          ...values,
          ...(options.cardImageUrl ? { cardImageUrl: options.cardImageUrl } : {}),
          ...(options.clearCardImage ? { clearCardImage: true } : {}),
        },
        { images, cardImage },
        { existingImageUrls: options.existingImageUrls }
      )
    ),

  clone: (id: number) => adminApi.post<Product>(`/admin/products/${id}/clone`),

  remove: (id: number) => adminApi.delete<{ archived: boolean }>(`/admin/products/${id}`),

  removeImage: (productId: number, imageId: number) =>
    adminApi.delete<null>(`/admin/products/${productId}/images/${imageId}`),

  setPrimaryImage: (productId: number, imageId: number) =>
    adminApi.patch<null>(`/admin/products/${productId}/images/${imageId}/primary`),

  bulk: (ids: number[], action: 'activate' | 'deactivate' | 'feature' | 'unfeature') =>
    adminApi.post<null>('/admin/products/bulk', { ids, action }),
};

export interface ProductImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; sku: string; message: string }[];
  warnings: { row: number; sku: string; message: string }[];
}

export const adminProductImportService = {
  downloadTemplate: () =>
    downloadFile('/admin/products/import/template', 'product-import-template-15-items.xlsx'),

  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return adminApi.post<ProductImportSummary>('/admin/products/import', form);
  },
};

export interface CategoryImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; name: string; message: string }[];
  warnings: { row: number; name: string; message: string }[];
}

export const adminCategoryImportService = {
  downloadTemplate: () =>
    downloadFile('/admin/categories/import/template', 'category-import-template.xlsx'),

  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return adminApi.post<CategoryImportSummary>('/admin/categories/import', form);
  },
};

export const adminCategoryService = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    adminApi.get<Category[]>('/admin/categories', { params: toParams(query) }) as Promise<
      Paged<Category>
    >,

  tree: () => adminApi.get<Category[]>('/admin/categories/tree'),

  create: (
    values: Record<string, unknown>,
    image?: File | null,
    options: { imageUrl?: string | null } = {}
  ) =>
    adminApi.post<Category>(
      '/admin/categories',
      toFormData(
        {
          ...values,
          ...(options.imageUrl ? { imageUrl: options.imageUrl } : {}),
        },
        { image }
      )
    ),

  update: (
    id: number,
    values: Record<string, unknown>,
    image?: File | null,
    options: { imageUrl?: string | null; clearImage?: boolean } = {}
  ) =>
    adminApi.patch<Category>(
      `/admin/categories/${id}`,
      toFormData(
        {
          ...values,
          ...(options.imageUrl ? { imageUrl: options.imageUrl } : {}),
          ...(options.clearImage ? { clearImage: true } : {}),
        },
        { image }
      )
    ),

  remove: (id: number) => adminApi.delete<null>(`/admin/categories/${id}`),

  reorder: (items: { id: number; sortOrder: number }[]) =>
    adminApi.post<null>('/admin/categories/reorder', { items }),
};

export const adminBannerService = {
  list: (query: { page?: number; limit?: number; search?: string; placement?: string; status?: string } = {}) =>
    adminApi.get<Banner[]>('/admin/banners', { params: toParams(query) }) as Promise<Paged<Banner>>,

  get: (id: number) => adminApi.get<Banner>(`/admin/banners/${id}`),

  create: (values: Record<string, unknown>, files: { image?: File | null; mobileImage?: File | null } = {}) =>
    adminApi.post<Banner>('/admin/banners', toFormData(values, files)),

  update: (
    id: number,
    values: Record<string, unknown>,
    files: { image?: File | null; mobileImage?: File | null } = {}
  ) => adminApi.patch<Banner>(`/admin/banners/${id}`, toFormData(values, files)),

  remove: (id: number) => adminApi.delete<null>(`/admin/banners/${id}`),

  reorder: (items: { id: number; sortOrder: number }[]) =>
    adminApi.post<null>('/admin/banners/reorder', { items }),
};

export interface AdminOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
  sort?: string;
}

export const adminOrderService = {
  list: (query: AdminOrderQuery = {}) =>
    adminApi.get<Order[]>('/admin/orders', { params: toParams(query) }) as Promise<
      Paged<Order> & { summary?: { statusCounts: Record<string, number> } }
    >,

  get: (id: number) =>
    adminApi.get<Order>(`/admin/orders/${id}`) as Promise<{
      success: boolean;
      data: Order;
      meta?: { allowedTransitions: OrderStatus[] };
    }>,

  updateStatus: (
    id: number,
    payload: {
      status: OrderStatus;
      note?: string;
      trackingNumber?: string;
      courier?: string;
      notifyCustomer?: boolean;
    }
  ) => adminApi.patch<Order>(`/admin/orders/${id}/status`, payload),

  updateDetails: (
    id: number,
    payload: {
      adminNote?: string;
      trackingNumber?: string;
      courier?: string;
      paymentStatus?: string;
    }
  ) => adminApi.patch<Order>(`/admin/orders/${id}`, payload),

  remove: (id: number) => adminApi.delete<null>(`/admin/orders/${id}`),

  exportCsv: (query: AdminOrderQuery = {}, format: 'csv' | 'xlsx' = 'csv') => {
    const params = new URLSearchParams({ ...toParams(query), format }).toString();
    return downloadFile(
      `/admin/orders/export${params ? `?${params}` : ''}`,
      `orders.${format === 'xlsx' ? 'xlsx' : 'csv'}`
    );
  },
};

export const adminInventoryService = {
  list: (query: { page?: number; limit?: number; search?: string; state?: string; categoryId?: number; sort?: string } = {}) =>
    adminApi.get<InventoryRow[]>('/admin/inventory', { params: toParams(query) }) as Promise<
      Paged<InventoryRow> & { summary?: InventorySummary }
    >,

  logs: (query: { page?: number; limit?: number; productId?: number; type?: string } = {}) =>
    adminApi.get<InventoryLog[]>('/admin/inventory/logs', { params: toParams(query) }) as Promise<
      Paged<InventoryLog>
    >,

  alerts: () => adminApi.get<InventoryRow[]>('/admin/inventory/alerts'),

  adjust: (
    id: number,
    payload: { quantityChange: number; type?: string; note?: string; reference?: string }
  ) => adminApi.post<{ product: Product; log: InventoryLog }>(`/admin/inventory/${id}/adjust`, payload),

  setStock: (id: number, payload: { stock: number; note?: string }) =>
    adminApi.patch<Product>(`/admin/inventory/${id}`, payload),
};

export const adminCustomerService = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string; verified?: string; sort?: string } = {}) =>
    adminApi.get<AdminCustomer[]>('/admin/customers', { params: toParams(query) }) as Promise<
      Paged<AdminCustomer> & {
        summary?: { total: number; active: number; verified: number; subscribed: number };
      }
    >,

  get: (id: number) => adminApi.get<CustomerDetail>(`/admin/customers/${id}`),

  setStatus: (id: number, isActive: boolean) =>
    adminApi.patch<User>(`/admin/customers/${id}/status`, { isActive }),

  exportCsv: (format: 'csv' | 'xlsx' = 'csv') =>
    downloadFile(`/admin/customers/export?format=${format}`, `customers.${format === 'xlsx' ? 'xlsx' : 'csv'}`),
};

export const adminRequestService = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    adminApi.get<GameRequest[]>('/admin/requests', { params: toParams(query) }) as Promise<
      Paged<GameRequest> & { summary?: { statusCounts: Record<string, number> } }
    >,

  respond: (
    id: number,
    payload: {
      status?: string;
      adminResponse?: string;
      linkedProductId?: number | null;
      notifyCustomer?: boolean;
    }
  ) => adminApi.patch<GameRequest>(`/admin/requests/${id}`, payload),

  remove: (id: number) => adminApi.delete<null>(`/admin/requests/${id}`),
};

export interface StaffInput {
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  role?: 'staff' | 'super_admin';
  permissions?: string[];
  fullAccess?: boolean;
  isActive?: boolean;
  password?: string;
}

export const adminStaffService = {
  list: (query: { page?: number; limit?: number; search?: string; role?: string; status?: string } = {}) =>
    adminApi.get<AdminUser[]>('/admin/staff', { params: toParams(query) }) as Promise<Paged<AdminUser>>,

  get: (id: number) =>
    adminApi.get<{ staff: AdminUser; modules: PermissionModule[] }>(`/admin/staff/${id}`),

  permissionCatalogue: () =>
    adminApi.get<{ modules: PermissionModule[]; defaults: string[] }>('/admin/staff/permissions'),

  create: (values: StaffInput, avatar?: File | null) =>
    adminApi.post<{ staff: AdminUser; temporaryPassword?: string }>(
      '/admin/staff',
      toFormData(values, { avatar })
    ),

  update: (id: number, values: Partial<StaffInput>, avatar?: File | null) =>
    adminApi.patch<AdminUser>(
      `/admin/staff/${id}`,
      toFormData(values, { avatar })
    ),

  setPermissions: (id: number, payload: { permissions?: string[]; fullAccess?: boolean }) =>
    adminApi.patch<AdminUser>(`/admin/staff/${id}/permissions`, payload),

  resetPassword: (id: number) =>
    adminApi.post<{ temporaryPassword: string }>(`/admin/staff/${id}/reset-password`),

  remove: (id: number) => adminApi.delete<null>(`/admin/staff/${id}`),
};

export const adminProfileService = {
  update: (payload: { name?: string; email?: string; phone?: string; jobTitle?: string }) =>
    adminApi.patch<{ admin: AdminUser }>('/admin/profile', payload),

  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return adminApi.patch<{ admin: AdminUser }>('/admin/profile/avatar', form);
  },

  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => adminApi.patch<null>('/admin/profile/password', payload),
};

export const adminCouponService = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string; scope?: string } = {}) =>
    adminApi.get<Coupon[]>('/admin/coupons', { params: toParams(query) }) as Promise<Paged<Coupon>>,
  get: (id: number) => adminApi.get<Coupon>(`/admin/coupons/${id}`),
  create: (payload: Record<string, unknown>) => adminApi.post<Coupon>('/admin/coupons', payload),
  update: (id: number, payload: Record<string, unknown>) =>
    adminApi.patch<Coupon>(`/admin/coupons/${id}`, payload),
  remove: (id: number) => adminApi.delete<null>(`/admin/coupons/${id}`),
};

export const adminContactService = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    adminApi.get<ContactMessage[]>('/admin/contacts', { params: toParams(query) }) as Promise<
      Paged<ContactMessage> & { summary?: { unread: number } }
    >,
  get: (id: number) => adminApi.get<ContactMessage>(`/admin/contacts/${id}`),
  reply: (id: number, reply: string) =>
    adminApi.post<ContactMessage>(`/admin/contacts/${id}/reply`, { reply }),
};

export const adminTransactionService = {
  list: (query: {
    limit?: number;
    startingAfter?: string;
    endingBefore?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) =>
    adminApi.get<import('@/types').StripeTransaction[]>('/admin/transactions', {
      params: toParams(query),
    }) as Promise<{
      success: boolean;
      data: import('@/types').StripeTransaction[];
      meta?: { hasMore: boolean; nextCursor: string | null; previousCursor: string | null };
    }>,

  refundOrder: (orderId: number, payload: { note?: string; reason?: string } = {}) =>
    adminApi.post<Order>(`/admin/orders/${orderId}/refund`, payload),

  refundPaymentIntent: (payload: { paymentIntentId: string; note?: string; reason?: string }) =>
    adminApi.post<Order>('/admin/transactions/refund', payload),
};

export const adminSettingsService = {
  get: () => adminApi.get<import('@/types').ShopSettings>('/admin/settings'),
  update: (payload: { returnDays?: number }) =>
    adminApi.patch<import('@/types').ShopSettings>('/admin/settings', payload),
};

export const adminReturnService = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    adminApi.get<import('@/types').ReturnRequest[]>('/admin/returns', {
      params: toParams(query),
    }) as Promise<Paged<import('@/types').ReturnRequest>>,

  respond: (
    id: number,
    payload: {
      status: import('@/types').ReturnRequestStatus;
      adminNote?: string;
      issueRefund?: boolean;
    }
  ) => adminApi.patch<import('@/types').ReturnRequest>(`/admin/returns/${id}`, payload),
};
