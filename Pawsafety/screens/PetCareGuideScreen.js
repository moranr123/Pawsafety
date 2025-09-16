import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const PetCareGuideScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [species, setSpecies] = useState('dog');
  const [ageGroup, setAgeGroup] = useState('adult');

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
    headerMeta: {
      marginTop: 6,
      paddingHorizontal: SPACING.lg,
      paddingBottom: 6,
    },
    headerMetaText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 12,
      fontFamily: FONTS.family,
    },
    linkText: {
      textDecorationLine: 'underline',
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
    toggleRow: {
      flexDirection: 'row',
      // gap polyfill for RN: use margins on children
      marginTop: SPACING.xs,
      marginBottom: SPACING.sm,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.medium,
      alignItems: 'center',
      backgroundColor: COLORS.inputBackground,
      marginRight: SPACING.xs,
    },
    toggleButtonLast: {
      marginRight: 0,
      marginLeft: SPACING.xs,
    },
    toggleActive: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    toggleText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
      fontWeight: FONTS.weights.medium,
    },
    toggleTextActive: {
      color: COLORS.white,
      fontWeight: FONTS.weights.bold,
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
        <View style={styles.headerMeta}>
          <Text style={styles.headerMetaText}>
            Last updated: Sep 2025 • Sources:
            <Text style={[styles.headerMetaText, styles.linkText]} onPress={() => Linking.openURL('https://www.avma.org/resources-tools/pet-owners')}> AVMA</Text>,
            <Text style={[styles.headerMetaText, styles.linkText]} onPress={() => Linking.openURL('https://wsava.org/')}> WSAVA</Text>
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guide Preferences</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setSpecies('dog')}
              style={[styles.toggleButton, species === 'dog' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, species === 'dog' && styles.toggleTextActive]}>Dog</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSpecies('cat')}
              style={[styles.toggleButton, styles.toggleButtonLast, species === 'cat' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, species === 'cat' && styles.toggleTextActive]}>Cat</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setAgeGroup('young')}
              style={[styles.toggleButton, ageGroup === 'young' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, ageGroup === 'young' && styles.toggleTextActive]}>
                {species === 'dog' ? 'Puppy' : 'Kitten'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAgeGroup('adult')}
              style={[styles.toggleButton, styles.toggleButtonLast, ageGroup === 'adult' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, ageGroup === 'adult' && styles.toggleTextActive]}>Adult</Text>
            </TouchableOpacity>
          </View>
        </View>

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
          {species === 'dog' && ageGroup === 'young' && (
            <Bullet>Puppy: choose AAFCO puppy formula with DHA; small, frequent meals.</Bullet>
          )}
          {species === 'dog' && ageGroup === 'adult' && (
            <Bullet>Adult dog: feed 1–2x/day; adjust portions by body condition score.</Bullet>
          )}
          {species === 'cat' && ageGroup === 'young' && (
            <Bullet>Kitten: energy-dense kitten food; 3–4 meals/day or free-feed dry.</Bullet>
          )}
          {species === 'cat' && ageGroup === 'adult' && (
            <Bullet>Adult cat: scheduled meals help weight control; promote wet food + water.</Bullet>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="directions-run" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Exercise & Enrichment</Text>
          </View>
          <Bullet>Daily walks/playtime suited to breed and energy level.</Bullet>
          <Bullet>Rotate toys and use puzzle feeders for mental stimulation.</Bullet>
          <Bullet>Provide scratching posts (cats) or chew toys (dogs).</Bullet>
          {species === 'dog' ? (
            <Bullet>{ageGroup === 'young' ? 'Puppy: several short play sessions; avoid high-impact jumps.' : 'Adult dog: 30–60 min activity daily; include sniff walks.'}</Bullet>
          ) : (
            <Bullet>{ageGroup === 'young' ? 'Kitten: multiple short play bursts with wand toys daily.' : 'Adult cat: 2–3 interactive play sessions; encourage climbing/perches.'}</Bullet>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="shower" size={22} color={COLORS.darkPurple} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Grooming</Text>
          </View>
          <Bullet>Brush coat regularly to reduce shedding and matting.</Bullet>
          <Bullet>Trim nails every 3–4 weeks; brush teeth 2–3x/week.</Bullet>
          <Bullet>Bathe only as needed with pet-safe shampoo.</Bullet>
          {species === 'dog' ? (
            <Bullet>Dogs: ear checks after baths/swims; long coats may need professional grooming.</Bullet>
          ) : (
            <Bullet>Cats: scoop litter daily; longhaired cats need more frequent brushing.</Bullet>
          )}
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
          {species === 'dog' && (
            <Bullet>{ageGroup === 'young' ? 'For your selection: Puppy—DA2PP at 6–8w, 10–12w, 14–16w; Rabies at ~12–16w.' : 'For your selection: Adult dog—booster 1 year after series, then every 1–3 years as advised.'}</Bullet>
          )}
          {species === 'cat' && (
            <Bullet>{ageGroup === 'young' ? 'For your selection: Kitten—FVRCP at 6–8w, 10–12w, 14–16w; Rabies at ~12–16w.' : 'For your selection: Adult cat—booster 1 year after series, then every 1–3 years as advised.'}</Bullet>
          )}
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


