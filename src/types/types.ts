type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;
type HEX = `#${string}`;

export type Color = RGB | RGBA | HEX;
export type NumBubbles = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface IGradientColor {
  index: number;
}

export interface AuroraBackgroundConfig {
  colors?: Array<Color>;
  numBubbles?: NumBubbles;
  animDuration?: number;
  blurAmount?: number | string;
  bgColor?: Color;
  useRandomness?: boolean;
  style?: Object;
  className?: string;
}

export interface IAuroraBackgroundProvider
  extends AuroraBackgroundConfig {
  children?: React.ReactNode;
}
