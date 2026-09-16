import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { adminAuthService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/api';
import { tokenStore } from '@/lib/storage';
import type { AdminUser, PermissionModule } from '@/types';

interface AdminAuthState {
  admin: AdminUser | null;
  permissionModules: PermissionModule[];
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  submitting: boolean;
  error: string | null;
}

const initialState: AdminAuthState = {
  admin: null,
  permissionModules: [],
  status: 'idle',
  submitting: false,
  error: null,
};

export const bootstrapAdmin = createAsyncThunk(
  'adminAuth/bootstrap',
  async (_, { rejectWithValue }) => {
    if (!tokenStore.getAccess('admin') && !tokenStore.getRefresh('admin')) {
      return rejectWithValue('no-session');
    }

    try {
      const response = await adminAuthService.me();
      return response.data;
    } catch {
      tokenStore.clear('admin');
      return rejectWithValue('no-session');
    }
  }
);

export const adminLogin = createAsyncThunk(
  'adminAuth/login',
  async (
    payload: { email: string; password: string; turnstileToken?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await adminAuthService.login(payload);
      const { admin, accessToken, refreshToken, permissionModules } = response.data;
      tokenStore.set('admin', accessToken, refreshToken);
      return { admin, permissionModules };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const adminLogout = createAsyncThunk('adminAuth/logout', async () => {
  try {
    await adminAuthService.logout();
  } finally {
    tokenStore.clear('admin');
  }
});

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    setAdmin: (state, action: PayloadAction<AdminUser>) => {
      state.admin = action.payload;
      state.status = 'authenticated';
    },
    adminSessionExpired: (state) => {
      state.admin = null;
      state.status = 'guest';
    },
    clearAdminAuthError: (state) => {
      state.error = null;
    },
    setAdminSession: (
      state,
      action: PayloadAction<{ admin: AdminUser; permissionModules: PermissionModule[] }>
    ) => {
      state.admin = action.payload.admin;
      state.permissionModules = action.payload.permissionModules;
      state.status = 'authenticated';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAdmin.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapAdmin.fulfilled, (state, action) => {
        state.admin = action.payload.admin;
        state.permissionModules = action.payload.permissionModules;
        state.status = 'authenticated';
      })
      .addCase(bootstrapAdmin.rejected, (state) => {
        state.admin = null;
        state.status = 'guest';
      })
      .addCase(adminLogin.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.submitting = false;
        state.admin = action.payload.admin;
        state.permissionModules = action.payload.permissionModules;
        state.status = 'authenticated';
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) || 'Could not sign you in';
      })
      .addCase(adminLogout.fulfilled, (state) => {
        state.admin = null;
        state.status = 'guest';
      });
  },
});

export const { setAdmin, adminSessionExpired, clearAdminAuthError, setAdminSession } =
  adminAuthSlice.actions;

export default adminAuthSlice.reducer;
