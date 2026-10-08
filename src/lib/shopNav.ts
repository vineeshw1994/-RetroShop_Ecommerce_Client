/** Edit these messages any time — they rotate on the top board. */
export const ROTATING_MESSAGES = [
  { text: 'Sell your tech — instant cash offers', to: '/sell' },
  { text: 'We buy your games, consoles and accessories', to: '/sell' },
  { text: 'New consoles in stock now', to: '/search?search=console' },
  { text: 'Trade in your games for cash', to: '/sell?type=games' },
  { text: 'Xbox, PlayStation and Switch — we buy them all', to: '/sell' },
] as const;

export const ITEM_TYPES = [
  { key: 'games', label: 'Games' },
  { key: 'consoles', label: 'Consoles' },
  { key: 'accessories', label: 'Accessories' },
] as const;

export const PLATFORMS = [
  { key: 'Switch', label: 'Switch' },
  { key: 'Xbox', label: 'Xbox' },
  { key: 'PlayStation', label: 'PlayStation' },
] as const;

export type ItemTypeKey = (typeof ITEM_TYPES)[number]['key'];
export type PlatformKey = (typeof PLATFORMS)[number]['key'];

export const buyHref = (type: ItemTypeKey, platform: PlatformKey) =>
  `/search?search=${encodeURIComponent(`${platform} ${type}`)}`;

export const sellHref = (type?: ItemTypeKey, platform?: PlatformKey) => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (platform) params.set('platform', platform);
  const query = params.toString();
  return query ? `/sell?${query}` : '/sell';
};

export const BUY_MENU = ITEM_TYPES.map((type) => ({
  ...type,
  children: PLATFORMS.map((platform) => ({
    ...platform,
    to: buyHref(type.key, platform.key),
  })),
}));

export const SELL_MENU = ITEM_TYPES.map((type) => ({
  ...type,
  children: PLATFORMS.map((platform) => ({
    ...platform,
    to: sellHref(type.key, platform.key),
  })),
}));
