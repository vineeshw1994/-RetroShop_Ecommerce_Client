import { api } from '@/lib/api';
import { toParams } from './shop.service';
import type {
  AccountOverview,
  Address,
  AddressInput,
  GameRequest,
  PageMeta,
  User,
  WishlistEntry,
} from '@/types';

export const accountService = {
  overview: () => api.get<AccountOverview>('/account/overview'),

  updateProfile: (payload: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'marketingOptIn'>>) =>
    api.patch<{ user: User }>('/account/profile', payload),

  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.patch<{ user: User }>('/account/avatar', form);
  },

  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.patch<null>('/account/password', payload),

  listAddresses: () => api.get<Address[]>('/account/addresses'),
  createAddress: (payload: Partial<AddressInput>) => api.post<Address>('/account/addresses', payload),
  updateAddress: (id: number, payload: Partial<AddressInput>) =>
    api.patch<Address>(`/account/addresses/${id}`, payload),
  deleteAddress: (id: number) => api.delete<null>(`/account/addresses/${id}`),

  listWishlist: (query: { page?: number; limit?: number } = {}) =>
    api.get<WishlistEntry[]>('/account/wishlist', { params: toParams(query) }) as Promise<{
      success: boolean;
      data: WishlistEntry[];
      meta?: PageMeta;
    }>,

  toggleWishlist: (productId: number) =>
    api.post<{ productId: number; inWishlist: boolean }>('/account/wishlist/toggle', { productId }),

  listGameRequests: (query: { page?: number; limit?: number; status?: string } = {}) =>
    api.get<GameRequest[]>('/account/game-requests', { params: toParams(query) }) as Promise<{
      success: boolean;
      data: GameRequest[];
      meta?: PageMeta;
    }>,

  createGameRequest: (payload: {
    title: string;
    platform?: string;
    conditionPreference?: 'any' | 'new' | 'used';
    maxBudget?: number;
    notes?: string;
  }) => api.post<GameRequest>('/account/game-requests', payload),

  deleteGameRequest: (id: number) => api.delete<null>(`/account/game-requests/${id}`),

  createReview: (payload: { productId: number; rating: number; title?: string; body?: string }) =>
    api.post<unknown>('/account/reviews', payload),
};
