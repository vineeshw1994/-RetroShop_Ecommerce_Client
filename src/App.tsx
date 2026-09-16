import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { bootstrapAuth } from '@/store/slices/authSlice';
import { bootstrapAdmin } from '@/store/slices/adminAuthSlice';
import { Spinner, Toasts } from '@/components/ui';
import ShopLayout from '@/layouts/ShopLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AccountLayout from '@/layouts/AccountLayout';
import {
  RequireAdmin,
  RequireCustomer,
  RequirePermission,
  RequireSuperAdmin,
  RedirectIfAdmin,
  RedirectIfCustomer,
} from '@/routes/guards';

/* Storefront */
const Home = lazy(() => import('@/pages/shop/Home'));
const Catalog = lazy(() => import('@/pages/shop/Catalog'));
const ProductDetail = lazy(() => import('@/pages/shop/ProductDetail'));
const Basket = lazy(() => import('@/pages/shop/Basket'));
const Checkout = lazy(() => import('@/pages/shop/Checkout'));
const OrderComplete = lazy(() => import('@/pages/shop/OrderComplete'));
const RequestGame = lazy(() => import('@/pages/shop/RequestGame'));
const Contact = lazy(() => import('@/pages/shop/Contact'));
const DeliveryReturns = lazy(() => import('@/pages/shop/DeliveryReturns'));
const Terms = lazy(() => import('@/pages/shop/Terms'));
const NotFound = lazy(() => import('@/pages/shop/NotFound'));

/* Auth */
const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AdminLogin = lazy(() => import('@/pages/auth/AdminLogin'));
const AdminForgotPassword = lazy(() => import('@/pages/auth/AdminForgotPassword'));
const AdminResetPassword = lazy(() => import('@/pages/auth/AdminResetPassword'));

/* Customer account */
const AccountOverview = lazy(() => import('@/pages/account/AccountOverview'));
const AccountOrders = lazy(() => import('@/pages/account/Orders'));
const AccountOrderDetail = lazy(() => import('@/pages/account/OrderDetail'));
const AccountWishlist = lazy(() => import('@/pages/account/Wishlist'));
const AccountRequests = lazy(() => import('@/pages/account/GameRequests'));
const AccountAddresses = lazy(() => import('@/pages/account/Addresses'));
const AccountProfile = lazy(() => import('@/pages/account/Profile'));

/* Admin */
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const AdminProductForm = lazy(() => import('@/pages/admin/ProductForm'));
const AdminProductImport = lazy(() => import('@/pages/admin/ProductImport'));
const AdminCategoryImport = lazy(() => import('@/pages/admin/CategoryImport'));
const AdminProductGallery = lazy(() => import('@/pages/admin/ProductGallery'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminBanners = lazy(() => import('@/pages/admin/Banners'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('@/pages/admin/OrderDetail'));
const AdminInventory = lazy(() => import('@/pages/admin/Inventory'));
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'));
const AdminCustomerDetail = lazy(() => import('@/pages/admin/CustomerDetail'));
const AdminRequests = lazy(() => import('@/pages/admin/GameRequests'));
const AdminReports = lazy(() => import('@/pages/admin/Reports'));
const AdminCoupons = lazy(() => import('@/pages/admin/Coupons'));
const AdminContacts = lazy(() => import('@/pages/admin/Contacts'));
const AdminTransactions = lazy(() => import('@/pages/admin/Transactions'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminReturns = lazy(() => import('@/pages/admin/Returns'));
const AdminStaff = lazy(() => import('@/pages/admin/Staff'));
const AdminProfile = lazy(() => import('@/pages/admin/Profile'));

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-brand-600">
    <Spinner size="lg" />
  </div>
);

const App = () => {
  const dispatch = useAppDispatch();

  // Restore both sessions on boot. They are independent, so a signed-in
  // customer and a signed-in staff member can share one browser.
  useEffect(() => {
    void dispatch(bootstrapAuth());
    void dispatch(bootstrapAdmin());
  }, [dispatch]);

  return (
    <>
      <Toasts />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Customer auth */}
          <Route
            path="/login"
            element={
              <RedirectIfCustomer>
                <Login />
              </RedirectIfCustomer>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfCustomer>
                <Signup />
              </RedirectIfCustomer>
            }
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin auth */}
          <Route
            path="/admin/login"
            element={
              <RedirectIfAdmin>
                <AdminLogin />
              </RedirectIfAdmin>
            }
          />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />

          {/* Storefront */}
          <Route element={<ShopLayout />}>
            <Route index element={<Home />} />
            <Route path="/search" element={<Catalog />} />
            <Route path="/category/:slug" element={<Catalog />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/basket" element={<Basket />} />
            <Route path="/request-a-game" element={<RequestGame />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/delivery-and-returns" element={<DeliveryReturns />} />
            <Route path="/terms" element={<Terms />} />

            <Route
              path="/checkout"
              element={
                <RequireCustomer>
                  <Checkout />
                </RequireCustomer>
              }
            />
            <Route
              path="/order-complete/:orderNumber"
              element={
                <RequireCustomer>
                  <OrderComplete />
                </RequireCustomer>
              }
            />

            {/* Customer account */}
            <Route
              path="/account"
              element={
                <RequireCustomer>
                  <AccountLayout />
                </RequireCustomer>
              }
            >
              <Route index element={<AccountOverview />} />
              <Route path="orders" element={<AccountOrders />} />
              <Route path="orders/:orderNumber" element={<AccountOrderDetail />} />
              <Route path="wishlist" element={<AccountWishlist />} />
              <Route path="requests" element={<AccountRequests />} />
              <Route path="addresses" element={<AccountAddresses />} />
              <Route path="profile" element={<AccountProfile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route
              index
              element={
                <RequirePermission permission="dashboard:view">
                  <Dashboard />
                </RequirePermission>
              }
            />

            <Route
              path="products"
              element={
                <RequirePermission permission="products:view">
                  <AdminProducts />
                </RequirePermission>
              }
            />
            <Route
              path="products/new"
              element={
                <RequirePermission permission="products:create">
                  <AdminProductForm />
                </RequirePermission>
              }
            />
            <Route
              path="gallery"
              element={
                <RequirePermission permission={['products:view', 'categories:view', 'banners:view']}>
                  <AdminProductGallery />
                </RequirePermission>
              }
            />
            <Route
              path="products/import"
              element={
                <RequirePermission permission="products:create">
                  <AdminProductImport />
                </RequirePermission>
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <RequirePermission permission="products:update">
                  <AdminProductForm />
                </RequirePermission>
              }
            />

            <Route
              path="categories/import"
              element={
                <RequirePermission permission="categories:create">
                  <AdminCategoryImport />
                </RequirePermission>
              }
            />
            <Route
              path="categories"
              element={
                <RequirePermission permission="categories:view">
                  <AdminCategories />
                </RequirePermission>
              }
            />
            <Route
              path="banners"
              element={
                <RequirePermission permission="banners:view">
                  <AdminBanners />
                </RequirePermission>
              }
            />
            <Route
              path="orders"
              element={
                <RequirePermission permission="orders:view">
                  <AdminOrders />
                </RequirePermission>
              }
            />
            <Route
              path="orders/:id"
              element={
                <RequirePermission permission="orders:view">
                  <AdminOrderDetail />
                </RequirePermission>
              }
            />
            <Route
              path="transactions"
              element={
                <RequirePermission permission="orders:view">
                  <AdminTransactions />
                </RequirePermission>
              }
            />
            <Route
              path="returns"
              element={
                <RequirePermission permission="orders:view">
                  <AdminReturns />
                </RequirePermission>
              }
            />
            <Route
              path="inventory"
              element={
                <RequirePermission permission="inventory:view">
                  <AdminInventory />
                </RequirePermission>
              }
            />
            <Route
              path="customers"
              element={
                <RequirePermission permission="customers:view">
                  <AdminCustomers />
                </RequirePermission>
              }
            />
            <Route
              path="customers/:id"
              element={
                <RequirePermission permission="customers:view">
                  <AdminCustomerDetail />
                </RequirePermission>
              }
            />
            <Route
              path="requests"
              element={
                <RequirePermission permission="requests:view">
                  <AdminRequests />
                </RequirePermission>
              }
            />
            <Route
              path="reports"
              element={
                <RequirePermission permission="reports:view">
                  <AdminReports />
                </RequirePermission>
              }
            />
            <Route
              path="coupons"
              element={
                <RequirePermission permission="coupons:view">
                  <AdminCoupons />
                </RequirePermission>
              }
            />
            <Route
              path="contacts"
              element={
                <RequirePermission permission="contacts:view">
                  <AdminContacts />
                </RequirePermission>
              }
            />
            <Route
              path="staff"
              element={
                <RequireSuperAdmin>
                  <AdminStaff />
                </RequireSuperAdmin>
              }
            />
            <Route path="profile" element={<AdminProfile />} />
            <Route
              path="settings"
              element={
                <RequirePermission permission="settings:view">
                  <AdminSettings />
                </RequirePermission>
              }
            />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
