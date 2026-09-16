import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';

interface WishlistState {
  /** Product ids the signed-in customer has saved. */
  productIds: number[];
  status: 'idle' | 'loading' | 'ready';
  togglingId: number | null;
}

const initialState: WishlistState = {
  productIds: [],
  status: 'idle',
  togglingId: null,
};

export const fetchWishlistIds = createAsyncThunk(
  'wishlist/fetchIds',
  async (_, { rejectWithValue }) => {
    try {
      const response = await accountService.listWishlist({ limit: 100 });
      return response.data.map((entry) => entry.product.id);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  'wishlist/toggle',
  async (productId: number, { rejectWithValue }) => {
    try {
      const response = await accountService.toggleWishlist(productId);
      return { ...response.data, message: response.message };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlist: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlistIds.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWishlistIds.fulfilled, (state, action) => {
        state.productIds = action.payload;
        state.status = 'ready';
      })
      .addCase(fetchWishlistIds.rejected, (state) => {
        state.status = 'ready';
      })
      .addCase(toggleWishlist.pending, (state, action) => {
        state.togglingId = action.meta.arg;
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        state.togglingId = null;
        const { productId, inWishlist } = action.payload;
        state.productIds = inWishlist
          ? [...new Set([...state.productIds, productId])]
          : state.productIds.filter((id) => id !== productId);
      })
      .addCase(toggleWishlist.rejected, (state) => {
        state.togglingId = null;
      });
  },
});

export const { resetWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
