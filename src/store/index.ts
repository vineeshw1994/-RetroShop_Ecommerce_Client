import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import authReducer, { sessionExpired } from './slices/authSlice';
import adminAuthReducer, { adminSessionExpired } from './slices/adminAuthSlice';
import basketReducer from './slices/basketSlice';
import catalogReducer from './slices/catalogSlice';
import wishlistReducer from './slices/wishlistSlice';
import uiReducer, { pushToast } from './slices/uiSlice';
import { onSessionExpired } from '@/lib/api';

const store = configureStore({
  reducer: {
    auth: authReducer,
    adminAuth: adminAuthReducer,
    basket: basketReducer,
    catalog: catalogReducer,
    wishlist: wishlistReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActionPaths: ['meta.arg', 'payload.file'] },
    }),
});

// Let the axios layer tell Redux when a refresh has definitively failed.
onSessionExpired('customer', () => {
  store.dispatch(sessionExpired());
  store.dispatch(pushToast('Your session expired, please sign in again', 'warning'));
});

onSessionExpired('admin', () => {
  store.dispatch(adminSessionExpired());
  store.dispatch(pushToast('Your session expired, please sign in again', 'warning'));
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
