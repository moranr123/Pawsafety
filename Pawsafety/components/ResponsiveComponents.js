import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, LAYOUT } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getResponsiveDimensions, getButtonDimensions, getTextDimensions } from '../utils/responsive';

// Responsive Text Component
export const ResponsiveText = ({ 
  children, 
  style, 
  size = 'medium', 
  weight = 'regular', 
  color, 
  align = 'left',
  numberOfLines,
  ...props 
}) => {
  const { colors: COLORS } = useTheme();
  const { isSmallDevice, isTablet } = getResponsiveDimensions();
  
  const textStyle = {
    fontSize: FONTS.sizes[size] || FONTS.sizes.medium,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights[weight] || FONTS.weights.regular,
    color: color || COLORS.text,
    textAlign: align,
    lineHeight: (FONTS.sizes[size] || FONTS.sizes.medium) * 1.4,
  };

  return (
    <Text 
      style={[textStyle, style]} 
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </Text>
  );
};

// Responsive View Component
export const ResponsiveView = ({ 
  children, 
  style, 
  padding, 
  margin, 
  flex, 
  direction = 'column',
  align = 'flex-start',
  justify = 'flex-start',
  wrap = 'nowrap',
  ...props 
}) => {
  const viewStyle = {
    flex: flex,
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap,
    padding: padding ? SPACING[padding] : undefined,
    margin: margin ? SPACING[margin] : undefined,
  };

  return (
    <View style={[viewStyle, style]} {...props}>
      {children}
    </View>
  );
};

// Responsive Button Component
export const ResponsiveButton = ({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  iconPosition = 'left',
  loading = false,
  ...props 
}) => {
  const { colors: COLORS } = useTheme();
  const { isSmallDevice, isTablet } = getResponsiveDimensions();
  const buttonDims = getButtonDimensions();
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? COLORS.lightGray : COLORS.darkPurple,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.darkPurple,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.mediumBlue,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: disabled ? COLORS.lightGray : COLORS.darkPurple,
          borderWidth: 0,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          height: buttonDims.height * 0.8,
          paddingHorizontal: buttonDims.paddingHorizontal * 0.8,
          fontSize: FONTS.sizes.small,
        };
      case 'large':
        return {
          height: buttonDims.height * 1.2,
          paddingHorizontal: buttonDims.paddingHorizontal * 1.2,
          fontSize: FONTS.sizes.large,
        };
      default:
        return {
          height: buttonDims.height,
          paddingHorizontal: buttonDims.paddingHorizontal,
          fontSize: FONTS.sizes.medium,
        };
    }
  };

  const buttonStyle = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    borderRadius: RADIUS.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.6 : 1,
    ...SHADOWS.light,
  };

  const textColor = variant === 'primary' || variant === 'ghost' ? COLORS.white : COLORS.darkPurple;

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <MaterialIcons 
          name={icon} 
          size={FONTS.sizes.medium} 
          color={textColor} 
          style={{ marginRight: SPACING.xs }}
        />
      )}
      <ResponsiveText
        style={[
          {
            color: textColor,
            fontWeight: FONTS.weights.semiBold,
            fontSize: getSizeStyles().fontSize,
          },
          textStyle
        ]}
      >
        {loading ? 'Loading...' : title}
      </ResponsiveText>
      {icon && iconPosition === 'right' && (
        <MaterialIcons 
          name={icon} 
          size={FONTS.sizes.medium} 
          color={textColor} 
          style={{ marginLeft: SPACING.xs }}
        />
      )}
    </TouchableOpacity>
  );
};

// Responsive Input Component
export const ResponsiveInput = ({ 
  value, 
  onChangeText, 
  placeholder, 
  style, 
  inputStyle,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  icon,
  iconPosition = 'left',
  error,
  disabled = false,
  ...props 
}) => {
  const { colors: COLORS } = useTheme();
  const { isSmallDevice, isTablet } = getResponsiveDimensions();
  
  const containerStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.medium,
    borderWidth: error ? 1 : 0,
    borderColor: error ? COLORS.error : 'transparent',
    paddingHorizontal: SPACING.md,
    height: LAYOUT.input.height,
    opacity: disabled ? 0.6 : 1,
  };

  const inputTextStyle = {
    flex: 1,
    fontSize: LAYOUT.input.fontSize,
    fontFamily: FONTS.family,
    color: COLORS.text,
    paddingVertical: 0,
  };

  return (
    <View style={[containerStyle, style]}>
      {icon && iconPosition === 'left' && (
        <MaterialIcons 
          name={icon} 
          size={FONTS.sizes.medium} 
          color={COLORS.secondaryText} 
          style={{ marginRight: SPACING.sm }}
        />
      )}
      <TextInput
        style={[inputTextStyle, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.secondaryText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={!disabled}
        {...props}
      />
      {icon && iconPosition === 'right' && (
        <MaterialIcons 
          name={icon} 
          size={FONTS.sizes.medium} 
          color={COLORS.secondaryText} 
          style={{ marginLeft: SPACING.sm }}
        />
      )}
    </View>
  );
};

// Responsive Card Component
export const ResponsiveCard = ({ 
  children, 
  style, 
  padding = 'md',
  margin = 'sm',
  shadow = 'light',
  ...props 
}) => {
  const { colors: COLORS } = useTheme();
  const { isSmallDevice, isTablet } = getResponsiveDimensions();
  
  const cardStyle = {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.large,
    padding: SPACING[padding],
    margin: SPACING[margin],
    ...SHADOWS[shadow],
  };

  return (
    <View style={[cardStyle, style]} {...props}>
      {children}
    </View>
  );
};

// Responsive Grid Component
export const ResponsiveGrid = ({ 
  children, 
  columns, 
  spacing = 'sm',
  style,
  ...props 
}) => {
  const { isTablet, isSmallDevice } = getResponsiveDimensions();
  const gridColumns = columns || (isTablet ? 3 : isSmallDevice ? 1 : 2);
  
  const gridStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING[spacing] / 2,
  };

  const itemStyle = {
    width: `${100 / gridColumns}%`,
    paddingHorizontal: SPACING[spacing] / 2,
    paddingVertical: SPACING[spacing] / 2,
  };

  return (
    <View style={[gridStyle, style]} {...props}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={itemStyle}>
          {child}
        </View>
      ))}
    </View>
  );
};

// Responsive Container Component
export const ResponsiveContainer = ({ 
  children, 
  style, 
  padding = 'lg',
  safeArea = true,
  ...props 
}) => {
  const { colors: COLORS } = useTheme();
  const { isSmallDevice, isTablet } = getResponsiveDimensions();
  
  const containerStyle = {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING[padding],
  };

  return (
    <View style={[containerStyle, style]} {...props}>
      {children}
    </View>
  );
};

// Responsive Header Component
export const ResponsiveHeader = ({ 
  title, 
  leftIcon, 
  rightIcon, 
  onLeftPress, 
  onRightPress,
  style,
  ...props 
}) => {
  const { colors: COLORS } = useTheme();
  const { isSmallDevice, isTablet } = getResponsiveDimensions();
  
  const headerStyle = {
    height: LAYOUT.header.height,
    backgroundColor: COLORS.darkPurple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.header.paddingHorizontal,
    paddingTop: SPACING.md,
    ...SHADOWS.medium,
  };

  const titleStyle = {
    fontSize: FONTS.sizes.large,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  };

  return (
    <View style={[headerStyle, style]} {...props}>
      {leftIcon && (
        <TouchableOpacity onPress={onLeftPress} style={{ padding: SPACING.sm }}>
          <MaterialIcons name={leftIcon} size={FONTS.sizes.large} color={COLORS.white} />
        </TouchableOpacity>
      )}
      <ResponsiveText style={titleStyle}>{title}</ResponsiveText>
      {rightIcon && (
        <TouchableOpacity onPress={onRightPress} style={{ padding: SPACING.sm }}>
          <MaterialIcons name={rightIcon} size={FONTS.sizes.large} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default {
  ResponsiveText,
  ResponsiveView,
  ResponsiveButton,
  ResponsiveInput,
  ResponsiveCard,
  ResponsiveGrid,
  ResponsiveContainer,
  ResponsiveHeader,
};
