import type { ItemTypeKey, PlatformKey } from './shopNav';

export const SELL_CONDITIONS = [
  { key: 'excellent', label: 'Excellent', hint: 'Barely used, complete, no marks' },
  { key: 'very_good', label: 'Very good', hint: 'Light wear, fully working' },
  { key: 'good', label: 'Good', hint: 'Visible wear, tested and working' },
  { key: 'satisfactory', label: 'Satisfactory', hint: 'Heavy wear, still functional' },
] as const;

export type SellCondition = (typeof SELL_CONDITIONS)[number]['key'];

const BASE_PRICE: Record<ItemTypeKey, Record<PlatformKey, number>> = {
  consoles: { Switch: 145, Xbox: 195, PlayStation: 215 },
  games: { Switch: 18, Xbox: 16, PlayStation: 18 },
  accessories: { Switch: 24, Xbox: 22, PlayStation: 22 },
};

const CONDITION_MULT: Record<SellCondition, number> = {
  excellent: 1,
  very_good: 0.82,
  good: 0.65,
  satisfactory: 0.48,
};

export const STORAGE_OPTIONS = [
  { value: '', label: 'Not sure' },
  { value: '64GB', label: '64 GB' },
  { value: '256GB', label: '256 GB' },
  { value: '512GB', label: '512 GB' },
  { value: '1TB', label: '1 TB' },
];

const STORAGE_BONUS: Record<string, number> = {
  '256GB': 12,
  '512GB': 28,
  '1TB': 48,
};

export const GAME_TYPES = [
  { value: '', label: 'Any / not sure' },
  { value: 'standard', label: 'Standard edition' },
  { value: 'deluxe', label: 'Deluxe / special edition' },
  { value: 'steelbook', label: 'Steelbook / collector' },
];

const GAME_TYPE_BONUS: Record<string, number> = {
  deluxe: 6,
  steelbook: 10,
};

const roundQuote = (value: number) => Math.max(3, Math.round(value * 100) / 100);

export const quoteSellPrice = ({
  type,
  platform,
  condition,
  storage,
  gameType,
}: {
  type: ItemTypeKey;
  platform: PlatformKey;
  condition: SellCondition;
  storage?: string;
  gameType?: string;
}) => {
  let price = BASE_PRICE[type][platform] * CONDITION_MULT[condition];
  if (type === 'consoles' && storage) price += STORAGE_BONUS[storage] || 0;
  if (type === 'games' && gameType) price += GAME_TYPE_BONUS[gameType] || 0;
  return roundQuote(price);
};

export const conditionToApi = (condition: SellCondition): 'new' | 'used' =>
  condition === 'excellent' ? 'new' : 'used';
