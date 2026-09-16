import { Link } from 'react-router-dom';
import { FiTruck, FiShield, FiRefreshCw, FiCreditCard } from 'react-icons/fi';
import { useAppSelector } from '@/store';
import { useShopSettings } from '@/hooks';

const LINKS = [
  {
    title: 'Shop',
    items: [
      { label: 'All products', to: '/search' },
      { label: 'On sale', to: '/search?onSale=true' },
      { label: 'New arrivals', to: '/search?sort=newest' },
      { label: 'Request a game', to: '/request-a-game' },
    ],
  },
  {
    title: 'My account',
    items: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
      { label: 'My orders', to: '/account/orders' },
      { label: 'Wishlist', to: '/account/wishlist' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Delivery & returns', to: '/delivery-and-returns' },
      { label: 'Terms & conditions', to: '/terms' },
      { label: 'Contact us', to: '/contact' },
    ],
  },
];

const Footer = () => {
  const categories = useAppSelector((state) => state.catalog.categories);
  const { returnDays } = useShopSettings();

  const promises = [
    { icon: FiShield, title: 'Warranty included', text: 'Every item is tested before dispatch' },
    { icon: FiTruck, title: 'Free over £50', text: 'Tracked 48 hour delivery' },
    ...(returnDays > 0
      ? [{ icon: FiRefreshCw, title: `${returnDays} day returns`, text: 'Change your mind, no fuss' }]
      : []),
    { icon: FiCreditCard, title: 'Secure checkout', text: 'Encrypted payments' },
  ];

  return (
    <footer className="mt-16 bg-ink-900 text-ink-300">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 lg:grid-cols-4 lg:px-6">
          {promises.map((promise) => (
            <div key={promise.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600/15 text-brand-400">
                <promise.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{promise.title}</p>
                <p className="text-xs text-ink-400">{promise.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5 lg:px-6">
        <div className="sm:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
              RS
            </span>
            <span className="text-lg font-black text-white">RetroShop</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-400">
            Pre-owned games, consoles and tech, cleaned, fully tested and backed by our warranty.
            Trade in what you no longer play and pick up your next favourite.
          </p>
        </div>

        {LINKS.map((group) => (
          <nav key={group.title}>
            <h3 className="text-sm font-bold text-white">{group.title}</h3>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-ink-400 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav>
          <h3 className="text-sm font-bold text-white">Platforms</h3>
          <ul className="mt-3 space-y-2">
            {categories.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link
                  to={`/category/${category.slug}`}
                  className="text-sm text-ink-400 transition hover:text-white"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-ink-500 sm:flex-row lg:px-6">
          <p>© {new Date().getFullYear()} RetroShop. All rights reserved.</p>
          <p>Prices include VAT where applicable.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
