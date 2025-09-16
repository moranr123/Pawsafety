import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const PetCareGuideScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.darkPurple,
    },
    header: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.lg,
      paddingTop: 50,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      ...SHADOWS.light,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      flex: 1,
      textAlign: 'center',
      marginLeft: -32,
    },
    backButton: {
      padding: SPACING.sm,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    scroll: {
      flex: 1,
      padding: SPACING.lg,
      backgroundColor: COLORS.background,
    },
    section: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...SHADOWS.light,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    sectionIcon: {
      marginRight: SPACING.sm,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    bullet: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 22,
      marginBottom: 6,
    },
    sub: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: 6,
    },
  }), [COLORS]);

  const Bullet = ({ children }) => (
    <Text style={styles.bullet}>• {children}</Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pet Care Guide</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="favorite" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Essentials</Text>
          </View>
          <Bullet>Provide fresh water at all times.</Bullet>
          <Bullet>Choose a balanced diet appropriate for age and size.</Bullet>
          <Bullet>Create a safe, comfortable sleeping area.</Bullet>
          <Bullet>Use an ID tag and keep microchip info updated.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="restaurant" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Feeding</Text>
          </View>
          <Bullet>Puppies/kittens: 3–4 meals/day; adults: 1–2 meals/day.</Bullet>
          <Bullet>Transition foods gradually (7–10 days) to avoid stomach upset.</Bullet>
          <Bullet>Avoid toxic foods: chocolate, grapes/raisins, onions, xylitol.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="directions-run" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Exercise & Enrichment</Text>
          </View>
          <Bullet>Daily walks/playtime suited to breed and energy level.</Bullet>
          <Bullet>Rotate toys and use puzzle feeders for mental stimulation.</Bullet>
          <Bullet>Provide scratching posts (cats) or chew toys (dogs).</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="shower" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Grooming</Text>
          </View>
          <Bullet>Brush coat regularly to reduce shedding and matting.</Bullet>
          <Bullet>Trim nails every 3–4 weeks; brush teeth 2–3x/week.</Bullet>
          <Bullet>Bathe only as needed with pet-safe shampoo.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-hospital" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Health</Text>
          </View>
          <Bullet>Annual vet checkups; keep vaccines and deworming up to date.</Bullet>
          <Bullet>Use flea/tick prevention as recommended by your vet.</Bullet>
          <Bullet>Watch for appetite, energy, or bathroom habit changes.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="event-available" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Vaccination Timing</Text>
          </View>
          <Bullet>Dogs (puppies): start core vaccines at 6–8 weeks; boosters every 3–4 weeks until 16 weeks.</Bullet>
          <Bullet>Cats (kittens): start at 6–8 weeks; boosters every 3–4 weeks until 16–20 weeks.</Bullet>
          <Bullet>Rabies: typically at 12–16 weeks (follow your local regulations and vet advice).</Bullet>
          <Bullet>Adults: booster 1 year after the initial series, then every 1–3 years as advised by your vet.</Bullet>
          <Bullet>Newly adopted/impounded pets: book a wellness and vaccine check within 3–7 days.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="security" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Safety</Text>
          </View>
          <Bullet>Keep harmful items out of reach (meds, cleaners, plants).</Bullet>
          <Bullet>Secure fences/doors; supervise outdoor time.</Bullet>
          <Bullet>Use a harness and proper leash when outside.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="school" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Training & Socialization</Text>
          </View>
          <Bullet>Use positive reinforcement (treats/praise).</Bullet>
          <Bullet>Short, consistent sessions (5–10 minutes).</Bullet>
          <Bullet>Gradual exposure to people, pets, places.</Bullet>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="report" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Emergency Kit</Text>
          </View>
          <Bullet>First-aid kit, extra food/water (3 days), meds, copies of records.</Bullet>
          <Bullet>Carrier/crate, leash, ID copies, recent photo.</Bullet>
          <Bullet>Know the nearest 24/7 vet clinic.</Bullet>
        </View>
      </ScrollView>
    </View>
  );
};

export default PetCareGuideScreen;


