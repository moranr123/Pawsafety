import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device type detection
export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  } else if (pixelDensity === 2 && (adjustedWidth >= 1920 || adjustedHeight >= 1920)) {
    return true;
  } else {
    return false;
  }
};

export const isSmallDevice = () => {
  return SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 667;
};

export const isLargeDevice = () => {
  return SCREEN_WIDTH > 414 || SCREEN_HEIGHT > 896;
};

// Screen size categories
export const getScreenSize = () => {
  if (isSmallDevice()) return 'small';
  if (isTablet()) return 'tablet';
  if (isLargeDevice()) return 'large';
  return 'medium';
};

// Responsive width calculation
export const wp = (percentage) => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Responsive height calculation
export const hp = (percentage) => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Responsive font size
export const rf = (size) => {
  const baseWidth = 375; // iPhone X width as base
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  
  // Ensure minimum and maximum font sizes
  const minSize = size * 0.8;
  const maxSize = size * 1.3;
  
  return Math.max(minSize, Math.min(maxSize, newSize));
};

// Responsive spacing
export const rs = (size) => {
  const baseWidth = 375;
  const scale = SCREEN_WIDTH / baseWidth;
  return size * scale;
};

// Get responsive dimensions
export const getResponsiveDimensions = () => {
  const screenSize = getScreenSize();
  
  return {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    screenSize,
    isTablet: isTablet(),
    isSmallDevice: isSmallDevice(),
    isLargeDevice: isLargeDevice(),
    wp,
    hp,
    rf,
    rs,
  };
};

// Responsive breakpoints
export const BREAKPOINTS = {
  small: 375,
  medium: 414,
  large: 768,
  tablet: 1024,
};

// Get current breakpoint
export const getCurrentBreakpoint = () => {
  if (SCREEN_WIDTH < BREAKPOINTS.small) return 'xs';
  if (SCREEN_WIDTH < BREAKPOINTS.medium) return 'sm';
  if (SCREEN_WIDTH < BREAKPOINTS.large) return 'md';
  if (SCREEN_WIDTH < BREAKPOINTS.tablet) return 'lg';
  return 'xl';
};

// Responsive grid columns
export const getGridColumns = () => {
  const breakpoint = getCurrentBreakpoint();
  
  switch (breakpoint) {
    case 'xs':
    case 'sm':
      return 1;
    case 'md':
      return 2;
    case 'lg':
      return 3;
    case 'xl':
      return 4;
    default:
      return 2;
  }
};

// Safe area helpers
export const getSafeAreaInsets = () => {
  const { height } = Dimensions.get('window');
  const { height: screenHeight } = Dimensions.get('screen');
  
  const topInset = screenHeight - height;
  
  return {
    top: Math.max(topInset, 0),
    bottom: Platform.OS === 'ios' ? 34 : 0, // iPhone X+ home indicator
  };
};

// Keyboard aware dimensions
export const getKeyboardAwareDimensions = (keyboardHeight = 0) => {
  return {
    availableHeight: SCREEN_HEIGHT - keyboardHeight,
    keyboardHeight,
    isKeyboardVisible: keyboardHeight > 0,
  };
};

// Responsive image dimensions
export const getResponsiveImageSize = (baseWidth, baseHeight) => {
  const aspectRatio = baseHeight / baseWidth;
  const responsiveWidth = wp(80); // 80% of screen width
  const responsiveHeight = responsiveWidth * aspectRatio;
  
  return {
    width: responsiveWidth,
    height: responsiveHeight,
  };
};

// Responsive card dimensions
export const getCardDimensions = () => {
  const screenSize = getScreenSize();
  const padding = rs(16);
  const availableWidth = SCREEN_WIDTH - (padding * 2);
  
  switch (screenSize) {
    case 'small':
      return {
        width: availableWidth,
        minHeight: hp(15),
        padding: rs(12),
      };
    case 'tablet':
      return {
        width: wp(45),
        minHeight: hp(20),
        padding: rs(20),
      };
    case 'large':
      return {
        width: wp(40),
        minHeight: hp(18),
        padding: rs(18),
      };
    default:
      return {
        width: availableWidth,
        minHeight: hp(16),
        padding: rs(16),
      };
  }
};

// Responsive button dimensions
export const getButtonDimensions = () => {
  const screenSize = getScreenSize();
  
  switch (screenSize) {
    case 'small':
      return {
        height: hp(6),
        paddingHorizontal: rs(16),
        fontSize: rf(14),
      };
    case 'tablet':
      return {
        height: hp(7),
        paddingHorizontal: rs(24),
        fontSize: rf(16),
      };
    case 'large':
      return {
        height: hp(6.5),
        paddingHorizontal: rs(20),
        fontSize: rf(15),
      };
    default:
      return {
        height: hp(6),
        paddingHorizontal: rs(18),
        fontSize: rf(15),
      };
  }
};

// Responsive text dimensions
export const getTextDimensions = (size) => {
  const screenSize = getScreenSize();
  const responsiveSize = rf(size);
  
  return {
    fontSize: responsiveSize,
    lineHeight: responsiveSize * 1.4,
    letterSpacing: screenSize === 'small' ? 0.2 : 0.5,
  };
};

// Responsive spacing scale
export const getSpacingScale = () => {
  const screenSize = getScreenSize();
  const baseScale = rs(1);
  
  switch (screenSize) {
    case 'small':
      return {
        xs: baseScale * 4,
        sm: baseScale * 6,
        md: baseScale * 8,
        lg: baseScale * 12,
        xl: baseScale * 16,
        xxl: baseScale * 24,
      };
    case 'tablet':
      return {
        xs: baseScale * 6,
        sm: baseScale * 8,
        md: baseScale * 12,
        lg: baseScale * 16,
        xl: baseScale * 20,
        xxl: baseScale * 32,
      };
    case 'large':
      return {
        xs: baseScale * 5,
        sm: baseScale * 7,
        md: baseScale * 10,
        lg: baseScale * 14,
        xl: baseScale * 18,
        xxl: baseScale * 28,
      };
    default:
      return {
        xs: baseScale * 5,
        sm: baseScale * 7,
        md: baseScale * 9,
        lg: baseScale * 13,
        xl: baseScale * 17,
        xxl: baseScale * 26,
      };
  }
};

export default {
  isTablet,
  isSmallDevice,
  isLargeDevice,
  getScreenSize,
  wp,
  hp,
  rf,
  rs,
  getResponsiveDimensions,
  getCurrentBreakpoint,
  getGridColumns,
  getSafeAreaInsets,
  getKeyboardAwareDimensions,
  getResponsiveImageSize,
  getCardDimensions,
  getButtonDimensions,
  getTextDimensions,
  getSpacingScale,
  BREAKPOINTS,
};
