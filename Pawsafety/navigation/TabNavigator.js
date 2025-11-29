import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTabBarVisibility } from '../contexts/TabBarVisibilityContext';

// Import tab screens
import HomeTabScreen from '../screens/tabs/HomeTabScreen';
import StraysScreen from '../screens/tabs/StraysScreen';
import ScanScreen from '../screens/tabs/ScanScreen';
import AdoptScreen from '../screens/tabs/AdoptScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Tab = createBottomTabNavigator();

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors: COLORS } = useTheme();
  const { isVisible } = useTabBarVisibility();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const translateY = useRef(new Animated.Value(0)).current;

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Animate tab bar visibility
  useEffect(() => {
    const currentWidth = screenData.width;
    const currentHeight = screenData.height;
    const isSmallDevice = currentWidth < 375 || currentHeight < 667;
    const isTablet = currentWidth > 768;
    const tabBarHeight = Platform.OS === 'ios' ? (isSmallDevice ? 60 : isTablet ? 80 : 70) : (isSmallDevice ? 70 : isTablet ? 90 : 80);
    Animated.timing(translateY, {
      toValue: isVisible ? 0 : tabBarHeight,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, translateY, screenData]);

  // Dynamic responsive calculations
  const currentWidth = screenData.width;
  const currentHeight = screenData.height;
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;
  
  const styles = useMemo(() => StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      backgroundColor: COLORS.cardBackground,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightBlue,
      paddingBottom: Platform.OS === 'ios' ? (isSmallDevice ? SPACING.sm : SPACING.md) : 0,
      paddingTop: Platform.OS === 'ios' ? SPACING.xs : (isSmallDevice ? SPACING.xs : SPACING.sm),
      paddingHorizontal: isSmallDevice ? SPACING.xs : SPACING.sm,
      height: Platform.OS === 'ios' ? (isSmallDevice ? 60 : isTablet ? 80 : 70) : (isSmallDevice ? 55 : isTablet ? 70 : 60),
      minHeight: Platform.OS === 'ios' ? 60 : 55,
      ...SHADOWS.medium,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Platform.OS === 'ios' ? (isSmallDevice ? SPACING.xs : SPACING.sm) : (isSmallDevice ? SPACING.xs : SPACING.sm),
      justifyContent: 'center',
      minHeight: Platform.OS === 'ios' ? 50 : 45,
    },
    tabIcon: {
      marginBottom: isSmallDevice ? 2 : 3,
      marginTop: isSmallDevice ? 2 : 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: isSmallDevice ? 11 : isTablet ? 15 : 13,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontWeight: FONTS.weights.medium,
      textAlign: 'center',
      lineHeight: isSmallDevice ? 14 : 16,
    },
    tabLabelActive: {
      color: COLORS.text,
      fontWeight: FONTS.weights.bold,
    },
    centerButtonContainer: {
      flex: 1,
      alignItems: 'center',
      marginTop: Platform.OS === 'ios' ? (isSmallDevice ? -20 : isTablet ? -30 : -25) : (isSmallDevice ? -18 : isTablet ? -25 : -20),
    },
    centerButton: {
      width: Platform.OS === 'ios' ? (isSmallDevice ? 52 : isTablet ? 72 : 62) : (isSmallDevice ? 48 : isTablet ? 64 : 54),
      height: Platform.OS === 'ios' ? (isSmallDevice ? 52 : isTablet ? 72 : 62) : (isSmallDevice ? 48 : isTablet ? 64 : 54),
      borderRadius: Platform.OS === 'ios' ? (isSmallDevice ? 26 : isTablet ? 36 : 31) : (isSmallDevice ? 24 : isTablet ? 32 : 27),
      backgroundColor: COLORS.darkPurple,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.heavy,
      borderWidth: Platform.OS === 'ios' ? (isSmallDevice ? 2 : 3) : (isSmallDevice ? 3 : 4),
      borderColor: COLORS.cardBackground,
    },
    centerButtonActive: {
      backgroundColor: COLORS.golden,
    },
    centerButtonText: {
      fontSize: Platform.OS === 'ios' ? (isSmallDevice ? 9 : isTablet ? 13 : 10) : (isSmallDevice ? 10 : isTablet ? 14 : 11),
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      marginTop: Platform.OS === 'ios' ? (isSmallDevice ? 1 : 2) : (isSmallDevice ? 2 : 3),
      lineHeight: Platform.OS === 'ios' ? (isSmallDevice ? 11 : 13) : (isSmallDevice ? 12 : 14),
    },
  }), [COLORS, isSmallDevice, isTablet, currentWidth, currentHeight]);

  return (
    <Animated.View 
      style={[
        styles.tabBar,
        {
          transform: [{ translateY: translateY }],
        }
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined 
          ? options.tabBarLabel 
          : options.title !== undefined 
          ? options.title 
          : route.name;

        const isFocused = state.index === index;
        const isScanButton = route.name === 'Scan';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Special styling for the center Scan button
        if (isScanButton) {
          return (
            <View key={index} style={styles.centerButtonContainer}>
              <TouchableOpacity
                onPress={onPress}
                style={[
                  styles.centerButton,
                  isFocused && styles.centerButtonActive
                ]}
              >
                <MaterialIcons 
                  name="qr-code-scanner" 
                  size={Platform.OS === 'ios' ? (isSmallDevice ? 22 : isTablet ? 30 : 26) : (isSmallDevice ? 20 : isTablet ? 26 : 22)} 
                  color={COLORS.white} 
                />
                <Text style={styles.centerButtonText}>Scan</Text>
              </TouchableOpacity>
            </View>
          );
        }

        // Regular tab buttons
        const getTabIcon = (routeName, focused) => {
          const iconMap = {
            'Home': 'home',
            'Strays': 'report',
            'Adopt': 'favorite',
            'Messages': 'message',
          };
          const iconName = iconMap[routeName] || 'help';
          
          return (
            <View>
              <MaterialIcons 
                name={iconName} 
                size={Platform.OS === 'ios' ? (isSmallDevice ? 22 : isTablet ? 30 : 24) : (isSmallDevice ? 20 : isTablet ? 26 : 22)} 
                color={focused ? COLORS.text : COLORS.secondaryText} 
              />
            </View>
          );
        };

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={styles.tabIcon}>
              {getTabIcon(route.name, isFocused)}
            </View>
            <Text style={[
              styles.tabLabel,
              isFocused && styles.tabLabelActive
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeTabScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Strays" 
        component={StraysScreen}
        options={{ tabBarLabel: 'Reports' }}
      />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{ tabBarLabel: 'Scan' }}
      />
      <Tab.Screen 
        name="Adopt" 
        component={AdoptScreen}
        options={{ tabBarLabel: 'Adopt' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{ tabBarLabel: 'Messages' }}
      />
    </Tab.Navigator>
  );
};



export default TabNavigator; 