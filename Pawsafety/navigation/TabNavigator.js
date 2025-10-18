import React, { useMemo, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

// Import tab screens
import HomeTabScreen from '../screens/tabs/HomeTabScreen';
import StraysScreen from '../screens/tabs/StraysScreen';
import ScanScreen from '../screens/tabs/ScanScreen';
import AdoptScreen from '../screens/tabs/AdoptScreen';
import MyPetsScreen from '../screens/MyPetsScreen';

const Tab = createBottomTabNavigator();

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors: COLORS } = useTheme();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

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
      paddingBottom: Platform.OS === 'ios' ? (isSmallDevice ? SPACING.sm : SPACING.md) : (isSmallDevice ? SPACING.md : SPACING.lg),
      paddingTop: Platform.OS === 'ios' ? SPACING.xs : (isSmallDevice ? SPACING.sm : SPACING.md),
      paddingHorizontal: isSmallDevice ? SPACING.xs : SPACING.sm,
      height: Platform.OS === 'ios' ? (isSmallDevice ? 60 : isTablet ? 80 : 70) : (isSmallDevice ? 70 : isTablet ? 90 : 80),
      minHeight: Platform.OS === 'ios' ? 60 : 70,
      ...SHADOWS.medium,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Platform.OS === 'ios' ? (isSmallDevice ? SPACING.xs : SPACING.sm) : (isSmallDevice ? SPACING.sm : SPACING.md),
      justifyContent: 'center',
      minHeight: Platform.OS === 'ios' ? 50 : 60,
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
      marginTop: Platform.OS === 'ios' ? (isSmallDevice ? -20 : isTablet ? -30 : -25) : (isSmallDevice ? -25 : isTablet ? -35 : -30),
    },
    centerButton: {
      width: Platform.OS === 'ios' ? (isSmallDevice ? 52 : isTablet ? 72 : 62) : (isSmallDevice ? 56 : isTablet ? 76 : 66),
      height: Platform.OS === 'ios' ? (isSmallDevice ? 52 : isTablet ? 72 : 62) : (isSmallDevice ? 56 : isTablet ? 76 : 66),
      borderRadius: Platform.OS === 'ios' ? (isSmallDevice ? 26 : isTablet ? 36 : 31) : (isSmallDevice ? 28 : isTablet ? 38 : 33),
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
    <View style={styles.tabBar}>
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
                  size={Platform.OS === 'ios' ? (isSmallDevice ? 22 : isTablet ? 30 : 26) : (isSmallDevice ? 24 : isTablet ? 32 : 28)} 
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
            'MyPets': 'pets',
          };
          const iconName = iconMap[routeName] || 'help';
          const isPetsIcon = routeName === 'MyPets';
          
          return (
            <View style={isPetsIcon ? { marginTop: -2 } : {}}>
              <MaterialIcons 
                name={iconName} 
                size={Platform.OS === 'ios' ? (isSmallDevice ? 22 : isTablet ? 30 : 24) : (isSmallDevice ? 24 : isTablet ? 32 : 26)} 
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
    </View>
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
        name="MyPets" 
        component={MyPetsScreen}
        options={{ tabBarLabel: 'My Pets' }}
      />
    </Tab.Navigator>
  );
};



export default TabNavigator; 