import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const MessagesScreen = () => {
  const { colors: COLORS } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: COLORS.lightBlue,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    title: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    message: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons name="message" size={60} color={COLORS.darkPurple} />
        </View>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.message}>
          Chat feature coming soon! Stay tuned for updates.
        </Text>
      </ScrollView>
    </View>
  );
};

export default MessagesScreen;



