import themeConfig from "../../theme.config.json";

export const theme = themeConfig;
export const colors = themeConfig.colors;
export const images = themeConfig.images;
export const business = themeConfig.business;
export const branding = (themeConfig as any).branding || {
  title: "",
  faviconUrl: "",
  appIconUrl: "",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  huge: 36,
};
