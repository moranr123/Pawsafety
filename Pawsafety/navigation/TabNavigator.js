import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
  
  const styles = useMemo(() => StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      backgroundColor: COLORS.cardBackground,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightBlue,
      paddingBottom: SPACING.md,
      paddingTop: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      ...SHADOWS.medium,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    tabIcon: {
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontWeight: FONTS.weights.medium,
    },
    tabLabelActive: {
      color: COLORS.text,
      fontWeight: FONTS.weights.bold,
    },
    centerButtonContainer: {
      flex: 1,
      alignItems: 'center',
      marginTop: -25, // Elevate the button above the tab bar
    },
    centerButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: COLORS.darkPurple,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.heavy,
      borderWidth: 3,
      borderColor: COLORS.cardBackground,
    },
    centerButtonActive: {
      backgroundColor: COLORS.golden,
    },
    centerButtonText: {
      fontSize: FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },
  }), [COLORS]);

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
                  size={24} 
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
          
          return (
            <MaterialIcons 
              name={iconName} 
              size={24} 
              color={focused ? COLORS.text : COLORS.secondaryText} 
            />
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