import { Platform, Dimensions } from 'react-native';
import { rf, rs, getScreenSize, isTablet, isSmallDevice } from '../utils/responsive';

// Light Theme Colors
const LIGHT_COLORS = {
  // Primary Colors
  lightBlue: '#D9EFF7',      // Very light blue - backgrounds
  mediumBlue: '#9BBBFC',     // Light blue - secondary elements
  darkPurple: '#4741A6',     // Dark purple - primary text/buttons
  golden: '#F9CE69',         // Golden yellow - accent/highlights
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#7F8C8D',
  lightGray: '#A0A0A0',
  
  // Status Colors
  success: '#27AE60',
  error: '#E74C3C',
  warning: '#F39C12',
  
  // Background variants
  background: '#D9EFF7',
  cardBackground: '#FFFFFF',
  inputBackground: '#F8F9FA',
  text: '#4741A6',
  secondaryText: '#7F8C8D',
};

// Dark Theme Colors
const DARK_COLORS = {
  // Primary Colors
  lightBlue: '#1A2332',      // Dark blue backgrounds
  mediumBlue: '#2A3B52',     // Medium dark blue - secondary elements
  darkPurple: '#B8B5FF',     // Light purple - primary text (inverted)
  golden: '#F9CE69',         // Golden yellow - accent/highlights (same)
  
  // Neutral Colors
  white: '#121212',          // Dark background
  black: '#FFFFFF',          // Light text
  gray: '#A0A0A0',          // Same gray
  lightGray: '#7F8C8D',     // Darker gray
  
  // Status Colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  
  // Background variants
  background: '#121212',     // Dark background
  cardBackground: '#1E1E1E', // Dark card background
  inputBackground: '#2A2A2A', // Dark input background
  text: '#FFFFFF',           // Light text
  secondaryText: '#A0A0A0',  // Light secondary text
};

// Default to light theme
export const COLORS = LIGHT_COLORS;

// Export both themes for context use
export const LIGHT_THEME = LIGHT_COLORS;
export const DARK_THEME = DARK_COLORS;

// Typography
export const FONTS = {
  // SF Pro Display font family
  family: Platform.select({
    ios: 'SF Pro Display',
    android: 'System',
    default: 'System',
  }),
  
  // Font weights
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    heavy: '800',
  },
  
  // Responsive font sizes
  sizes: {
    small: rf(14),
    medium: rf(16),
    large: rf(18),
    xlarge: rf(20),
    xxlarge: rf(24),
    xxxlarge: rf(28),
    title: rf(32),
    logo: rf(50),
    bigLogo: rf(80),
  },
  
  // Static font sizes for specific use cases
  staticSizes: {
    small: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
    xxxlarge: 28,
    title: 32,
    logo: 50,
    bigLogo: 80,
  },
};

// Responsive Spacing
export const SPACING = {
  xs: rs(5),
  sm: rs(10),
  md: rs(15),
  lg: rs(20),
  xl: rs(30),
  xxl: rs(40),
};

// Static spacing for specific use cases
export const STATIC_SPACING = {
  xs: 5,
  sm: 10,
  md: 15,
  lg: 20,
  xl: 30,
  xxl: 40,
};

// Responsive Border radius
export const RADIUS = {
  small: rs(8),
  medium: rs(12),
  large: rs(15),
  xlarge: rs(20),
};

// Static border radius for specific use cases
export const STATIC_RADIUS = {
  small: 8,
  medium: 12,
  large: 15,
  xlarge: 20,
};

// Shadow styles
export const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heavy: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
};

// Responsive Layout Constants
export const LAYOUT = {
  // Screen dimensions
  screenWidth: Dimensions.get('window').width,
  screenHeight: Dimensions.get('window').height,
  
  // Responsive breakpoints
  breakpoints: {
    small: 375,
    medium: 414,
    large: 768,
    tablet: 1024,
  },
  
  // Grid system
  grid: {
    columns: getScreenSize() === 'tablet' ? 3 : getScreenSize() === 'large' ? 2 : 1,
    gutter: rs(16),
  },
  
  // Card dimensions
  card: {
    width: getScreenSize() === 'tablet' ? '45%' : '100%',
    minHeight: getScreenSize() === 'small' ? rs(120) : rs(150),
    padding: rs(16),
  },
  
  // Button dimensions
  button: {
    height: getScreenSize() === 'small' ? rs(44) : rs(48),
    minWidth: rs(120),
    paddingHorizontal: rs(20),
  },
  
  // Input dimensions
  input: {
    height: getScreenSize() === 'small' ? rs(44) : rs(48),
    paddingHorizontal: rs(16),
    fontSize: rf(16),
  },
  
  // Header dimensions
  header: {
    height: getScreenSize() === 'small' ? rs(60) : rs(70),
    paddingHorizontal: rs(20),
  },
  
  // Tab bar dimensions
  tabBar: {
    height: getScreenSize() === 'small' ? rs(60) : rs(70),
    paddingBottom: rs(8),
  },
}; 