import { AuroraBackgroundConfig } from '../types';
import {
  COLOR_DODGER_BLUE_2,
  COLOR_RADICAL_RED,
  COLOR_SHAMROCK,
  COLOR_YELLOW,
} from './colors';

export const GRADIENT_COLORS = [
  COLOR_RADICAL_RED,
  COLOR_DODGER_BLUE_2,
  COLOR_YELLOW,
  COLOR_SHAMROCK,
];
export const BLUR_AMOUNT = '4vw';

export const DEFAULT_CONFIG: AuroraBackgroundConfig = {
  colors: [
    COLOR_RADICAL_RED,
    COLOR_DODGER_BLUE_2,
    COLOR_YELLOW,
    COLOR_SHAMROCK,
  ],
  numBubbles: 4,
  animDuration: 5,
  blurAmount: BLUR_AMOUNT,
  bgColor: COLOR_DODGER_BLUE_2,
  useRandomness: false,
};

export const BUBBLE_MIN_RANDOM_WIDTH = 48;
export const BUBBLE_MAX_RANDOM_WIDTH = 52;

export const BUBBLE_MIN_RANDOM_HEIGHT = 48;
export const BUBBLE_MAX_RANDOM_HEIGHT = 52;
