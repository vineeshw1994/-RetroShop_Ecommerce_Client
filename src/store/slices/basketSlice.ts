import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { basketService, shopService } from '@/services/shop.service';
import { getErrorMessage } from '@/lib/api';
import { guestBasket } from '@/lib/storage';
import type { Basket, BasketLine } from '@/types';

interface BasketState extends Basket {
  status: 'idle' | 'loading' | 'ready';
  /** Product id currently being added, so only that button shows a spinner. */
  pendingProductId: number | null;
  updatingLineId: number | null;
  error: string | null;
}

const emptySummary = {
  itemCount: 0,
  lineCount: 0,
  subtotal: 0,
  shippingFee: 0,
  discount: 0,
  total: 0,
  currency: 'GBP',
  freeShippingThreshold: 50,
  amountToFreeShipping: 0,
  hasIssues: false,
};

const initialState: BasketState = {
  lines: [],
  summary: emptySummary,
  status: 'idle',
  pendingProductId: null,
  updatingLineId: null,
  error: null,
};

const round = (value: number) => Math.round(value * 100) / 100;

/** Recompute totals for the guest basket, mirroring the server's rules. */
const priceGuestBasket = (lines: BasketLine[]): Basket => {
  const purchasable = lines.filter((line) => !line.isUnavailable);
  const subtotal = round(purchasable.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));

  return {
    lines,
    summary: {
      ...emptySummary,
      itemCount: purchasable.reduce((sum, line) => sum + line.quantity, 0),
      lineCount: lines.length,
      subtotal,
      shippingFee: 0,
      total: round(subtotal),
      amountToFreeShipping: 0,
      hasIssues: lines.some((line) => line.isUnavailable || line.exceedsStock),
    },
  };
};

/** Rebuild guest basket lines from localStorage ids by refetching the products. */
const loadGuestBasket = async (): Promise<Basket> => {
  const entries = guestBasket.read();
  if (!entries.length) return { lines: [], summary: emptySummary };

  const response = await shopService.getProducts({ limit: 100 });
  const byId = new Map(response.data.map((product) => [product.id, product]));

  const lines: BasketLine[] = entries
    .map((entry, index) => {
      const product = byId.get(entry.productId);
      if (!product) return null;

      const quantity = Math.min(entry.quantity, Math.max(1, product.stock));

      return {
        id: -(index + 1),
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        image: product.cardImage || product.primaryImage,
        condition: product.condition,
        platform: product.platform,
        unitPrice: product.effectivePrice,
        listPrice: product.price,
        quantity,
        lineTotal: round(product.effectivePrice * quantity),
        stock: product.stock,
        maxQuantity: product.stock,
        isUnavailable: product.stock === 0,
        exceedsStock: entry.quantity > product.stock,
      } satisfies BasketLine;
    })
    .filter((line): line is BasketLine => line !== null);

  return priceGuestBasket(lines);
};

export const fetchBasket = createAsyncThunk(
  'basket/fetch',
  async (isAuthenticated: boolean, { rejectWithValue }) => {
    try {
      if (!isAuthenticated) return await loadGuestBasket();
      const response = await basketService.get();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addToBasket = createAsyncThunk(
  'basket/add',
  async (
    payload: { productId: number; quantity?: number; isAuthenticated: boolean },
    { rejectWithValue }
  ) => {
    const quantity = payload.quantity ?? 1;

    try {
      if (!payload.isAuthenticated) {
        const entries = guestBasket.read();
        const existing = entries.find((entry) => entry.productId === payload.productId);

        if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
        else entries.push({ productId: payload.productId, quantity });

        guestBasket.write(entries);
        return { basket: await loadGuestBasket(), message: 'Added to your basket' };
      }

      const response = await basketService.add(payload.productId, quantity);
      return { basket: response.data, message: response.message || 'Added to your basket' };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateBasketLine = createAsyncThunk(
  'basket/update',
  async (
    payload: { lineId: number; productId: number; quantity: number; isAuthenticated: boolean },
    { rejectWithValue }
  ) => {
    try {
      if (!payload.isAuthenticated) {
        const entries = guestBasket
          .read()
          .map((entry) =>
            entry.productId === payload.productId
              ? { ...entry, quantity: payload.quantity }
              : entry
          )
          .filter((entry) => entry.quantity > 0);

        guestBasket.write(entries);
        return await loadGuestBasket();
      }

      const response = await basketService.update(payload.lineId, payload.quantity);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const removeBasketLine = createAsyncThunk(
  'basket/remove',
  async (
    payload: { lineId: number; productId: number; isAuthenticated: boolean },
    { rejectWithValue }
  ) => {
    try {
      if (!payload.isAuthenticated) {
        guestBasket.write(
          guestBasket.read().filter((entry) => entry.productId !== payload.productId)
        );
        return await loadGuestBasket();
      }

      const response = await basketService.remove(payload.lineId);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const clearBasket = createAsyncThunk(
  'basket/clear',
  async (isAuthenticated: boolean, { rejectWithValue }) => {
    try {
      if (!isAuthenticated) {
        guestBasket.clear();
        return { lines: [], summary: emptySummary };
      }
      const response = await basketService.clear();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'basket/coupon',
  async (code: string, { rejectWithValue }) => {
    try {
      const response = await basketService.applyCoupon(code);
      return { basket: response.data, message: response.message || 'Coupon applied' };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const basketSlice = createSlice({
  name: 'basket',
  initialState,
  reducers: {
    resetBasket: () => initialState,
  },
  extraReducers: (builder) => {
    const applyBasket = (state: BasketState, basket: Basket) => {
      state.lines = basket.lines;
      state.summary = basket.summary;
      state.status = 'ready';
      state.pendingProductId = null;
      state.updatingLineId = null;
    };

    builder
      .addCase(fetchBasket.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
      })
      .addCase(fetchBasket.fulfilled, (state, action) => applyBasket(state, action.payload))
      .addCase(fetchBasket.rejected, (state, action) => {
        state.status = 'ready';
        state.error = action.payload as string;
      })
      .addCase(addToBasket.pending, (state, action) => {
        state.pendingProductId = action.meta.arg.productId;
        state.error = null;
      })
      .addCase(addToBasket.fulfilled, (state, action) => applyBasket(state, action.payload.basket))
      .addCase(addToBasket.rejected, (state, action) => {
        state.pendingProductId = null;
        state.error = action.payload as string;
      })
      .addCase(updateBasketLine.pending, (state, action) => {
        state.updatingLineId = action.meta.arg.lineId;
      })
      .addCase(updateBasketLine.fulfilled, (state, action) => applyBasket(state, action.payload))
      .addCase(updateBasketLine.rejected, (state, action) => {
        state.updatingLineId = null;
        state.error = action.payload as string;
      })
      .addCase(removeBasketLine.pending, (state, action) => {
        state.updatingLineId = action.meta.arg.lineId;
      })
      .addCase(removeBasketLine.fulfilled, (state, action) => applyBasket(state, action.payload))
      .addCase(removeBasketLine.rejected, (state, action) => {
        state.updatingLineId = null;
        state.error = action.payload as string;
      })
      .addCase(clearBasket.fulfilled, (state, action) => applyBasket(state, action.payload))
      .addCase(applyCoupon.fulfilled, (state, action) => applyBasket(state, action.payload.basket));
  },
});

export const { resetBasket } = basketSlice.actions;

export default basketSlice.reducer;
