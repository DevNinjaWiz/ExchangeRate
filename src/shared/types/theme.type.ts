import { THEME_PALETTE } from '../constants';

export type Theme = (typeof THEME_PALETTE)[keyof typeof THEME_PALETTE];
