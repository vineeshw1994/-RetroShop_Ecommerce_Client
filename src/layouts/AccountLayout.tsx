import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiPackage,
  FiHeart,
  FiGift,
  FiMapPin,
  FiUser,
  FiLogOut,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { resetBasket } from '@/store/slices/basketSlice';
import { resetWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { initials } from '@/lib/format';
import cn from '@/lib/cn';
import { SmartImage } from '@/components/ui';

const NAV = [
  { to: '/account', label: 'Overview', icon: FiGrid, match: 'overview' as const },
  { to: '/account/orders', label: 'My orders', icon: FiPackage, match: 'orders' as const },
  { to: '/account/wishlist', label: 'Wishlist', icon: FiHeart, match: 'wishlist' as const },
  { to: '/account/requests', label: 'Game requests', icon: FiGift, match: 'requests' as const },
  { to: '/account/addresses', label: 'Addresses', icon: FiMapPin, match: 'addresses' as const },
  { to: '/account/profile', label: 'Profile & security', icon: FiUser, match: 'profile' as const },
];

const isAccountNavActive = (match: (typeof NAV)[number]['match'], pathname: string) => {
  switch (match) {
    case 'overview':
      return pathname === '/account';
    case 'orders':
      return pathname.startsWith('/account/orders');
    case 'wishlist':
      return pathname.startsWith('/account/wishlist');
    case 'requests':
      return pathname.startsWith('/account/requests');
    case 'addresses':
      return pathname.startsWith('/account/addresses');
    case 'profile':
      return pathname.startsWith('/account/profile');
    default:
      return false;
  }
};

const AccountLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    dispatch(resetBasket());
    dispatch(resetWishlist());
    dispatch(pushToast('You have been signed out', 'info'));
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[264px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50 p-4">
              {user?.avatar ? (
                <SmartImage
                  src={user.avatar}
                  alt={user.fullName}
                  wrapperClassName="h-11 w-11 shrink-0 rounded-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {initials(user?.fullName || '')}
                </span>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{user?.fullName}</p>
                <p className="truncate text-xs text-ink-500">{user?.email}</p>
              </div>
            </div>

            {/* Horizontal scroller on mobile, stacked list on desktop */}
            <nav className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:flex lg:flex-col">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.match === 'overview'}
                  className={() =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                      isAccountNavActive(item.match, location.pathname)
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    )
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 lg:mt-1 lg:border-t lg:border-ink-100"
              >
                <FiLogOut size={16} />
                Sign out
              </button>
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
