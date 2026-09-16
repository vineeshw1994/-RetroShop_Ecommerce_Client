import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UiState {
  toasts: Toast[];
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  basketDrawerOpen: boolean;
  adminSidebarCollapsed: boolean;
}

const initialState: UiState = {
  toasts: [],
  mobileMenuOpen: false,
  searchOpen: false,
  basketDrawerOpen: false,
  adminSidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    pushToast: {
      reducer: (state, action: PayloadAction<Toast>) => {
        // Skip duplicate messages that are already on screen.
        if (state.toasts.some((toast) => toast.message === action.payload.message)) return;
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare: (message: string, variant: ToastVariant = 'success') => ({
        payload: { id: nanoid(), message, variant },
      }),
    },
    dismissToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
    },
    setBasketDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.basketDrawerOpen = action.payload;
    },
    toggleAdminSidebar: (state) => {
      state.adminSidebarCollapsed = !state.adminSidebarCollapsed;
    },
  },
});

export const {
  pushToast,
  dismissToast,
  setMobileMenuOpen,
  setSearchOpen,
  setBasketDrawerOpen,
  toggleAdminSidebar,
} = uiSlice.actions;

export default uiSlice.reducer;
