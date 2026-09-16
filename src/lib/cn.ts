import clsx, { type ClassValue } from 'clsx';

/** Short helper for conditional class names. */
export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export default cn;
