import { FiAward, FiCheckCircle, FiTag, FiTruck } from 'react-icons/fi';

const ITEMS = [
  { icon: FiAward, title: '12-Month Warranty', text: 'On eligible products' },
  { icon: FiCheckCircle, title: 'Tested & Cleaned', text: 'Quality you can trust' },
  { icon: FiTruck, title: 'Fast Delivery', text: 'Get gaming sooner' },
  { icon: FiTag, title: 'Great Prices', text: 'Premium tech for less' },
];

const TrustStrip = () => (
  <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {ITEMS.map((item) => (
      <li key={item.title} className="flex items-center gap-2.5 text-ink-800">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400">
          <item.icon size={16} />
        </span>
        <span>
          <span className="block text-xs font-bold">{item.title}</span>
          <span className="block text-[11px] text-ink-500">{item.text}</span>
        </span>
      </li>
    ))}
  </ul>
);

export default TrustStrip;
