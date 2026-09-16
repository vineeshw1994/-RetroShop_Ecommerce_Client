import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { shopService } from '@/services/shop.service';
import { getErrorMessage } from '@/lib/api';
import type { Category, HomeFeed } from '@/types';

interface CatalogState {
  home: HomeFeed | null;
  homeStatus: 'idle' | 'loading' | 'ready' | 'error';
  categories: Category[];
  categoriesStatus: 'idle' | 'loading' | 'ready';
  error: string | null;
}

const initialState: CatalogState = {
  home: null,
  homeStatus: 'idle',
  categories: [],
  categoriesStatus: 'idle',
  error: null,
};

export const fetchHomeFeed = createAsyncThunk('catalog/home', async (_, { rejectWithValue }) => {
  try {
    const response = await shopService.getHomeFeed();
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchCategories = createAsyncThunk(
  'catalog/categories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await shopService.getCategories();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeFeed.pending, (state) => {
        state.homeStatus = 'loading';
      })
      .addCase(fetchHomeFeed.fulfilled, (state, action) => {
        state.home = action.payload;
        state.homeStatus = 'ready';
      })
      .addCase(fetchHomeFeed.rejected, (state, action) => {
        state.homeStatus = 'error';
        state.error = action.payload as string;
      })
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesStatus = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.categoriesStatus = 'ready';
      });
  },
});

export default catalogSlice.reducer;
