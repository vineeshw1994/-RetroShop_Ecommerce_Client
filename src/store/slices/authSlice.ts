import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authService, type LoginPayload, type SignupPayload } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/api';
import { guestBasket, tokenStore } from '@/lib/storage';
import type { PermissionModule, User } from '@/types';
import { setAdminSession } from './adminAuthSlice';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  submitting: boolean;
  error: string | null;
  /** Email awaiting OTP entry, so the verify screen survives a refresh. */
  pendingVerificationEmail: string | null;
  pendingResetEmail: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  submitting: false,
  error: null,
  pendingVerificationEmail: null,
  pendingResetEmail: null,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  if (!tokenStore.getAccess('customer') && !tokenStore.getRefresh('customer')) {
    return rejectWithValue('no-session');
  }

  try {
    const response = await authService.me();
    return response.data.user;
  } catch {
    tokenStore.clear('customer');
    return rejectWithValue('no-session');
  }
});

export const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue, dispatch }) => {
    try {
      const response = await authService.login({ ...payload, guestBasket: guestBasket.read() });
      const {
        user,
        accessToken,
        refreshToken,
        admin,
        adminAccessToken,
        adminRefreshToken,
        permissionModules,
      } = response.data;
      tokenStore.set('customer', accessToken, refreshToken);
      guestBasket.clear();

      if (admin && adminAccessToken && adminRefreshToken) {
        tokenStore.set('admin', adminAccessToken, adminRefreshToken);
        dispatch(
          setAdminSession({
            admin,
            permissionModules: permissionModules || [],
          })
        );
      }

      return user;
    } catch (error) {
      // A 403 with requiresVerification means "go to the OTP screen", not a failure.
      const payloadData = (error as { payload?: { data?: { requiresVerification?: boolean; email?: string } } })
        .payload;
      if (payloadData?.data?.requiresVerification) {
        return rejectWithValue({
          message: getErrorMessage(error),
          requiresVerification: true,
          email: payloadData.data.email,
        });
      }
      return rejectWithValue({ message: getErrorMessage(error) });
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (payload: SignupPayload, { rejectWithValue }) => {
    try {
      const response = await authService.signup(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue({ message: getErrorMessage(error) });
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (payload: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail({
        ...payload,
        guestBasket: guestBasket.read(),
      });
      const { user, accessToken, refreshToken } = response.data;
      tokenStore.set('customer', accessToken, refreshToken);
      guestBasket.clear();
      return user;
    } catch (error) {
      return rejectWithValue({ message: getErrorMessage(error) });
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } finally {
    tokenStore.clear('customer');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    sessionExpired: (state) => {
      state.user = null;
      state.status = 'guest';
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setPendingVerificationEmail: (state, action: PayloadAction<string | null>) => {
      state.pendingVerificationEmail = action.payload;
    },
    setPendingResetEmail: (state, action: PayloadAction<string | null>) => {
      state.pendingResetEmail = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.status = 'guest';
      })
      .addCase(login.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.submitting = false;
        state.user = action.payload;
        state.status = 'authenticated';
        state.pendingVerificationEmail = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.submitting = false;
        const payload = action.payload as
          | { message: string; requiresVerification?: boolean; email?: string }
          | undefined;
        state.error = payload?.message || 'Could not sign you in';
        if (payload?.requiresVerification && payload.email) {
          state.pendingVerificationEmail = payload.email;
        }
      })
      .addCase(signup.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.submitting = false;
        state.pendingVerificationEmail = action.payload.email;
      })
      .addCase(signup.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as { message: string })?.message || 'Could not create account';
      })
      .addCase(verifyEmail.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.submitting = false;
        state.user = action.payload;
        state.status = 'authenticated';
        state.pendingVerificationEmail = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as { message: string })?.message || 'Could not verify';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'guest';
      });
  },
});

export const {
  setUser,
  sessionExpired,
  clearAuthError,
  setPendingVerificationEmail,
  setPendingResetEmail,
} = authSlice.actions;

export default authSlice.reducer;
