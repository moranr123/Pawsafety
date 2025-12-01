import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, StatusBar, Platform, TextInput } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const PetCareGuideScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [species, setSpecies] = useState('dog');
  const [ageGroup, setAgeGroup] = useState('adult');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesSections, setFavoritesSections] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set(['essentials']));

  // Facebook color scheme
  const facebookBlue = '#1877F2';
  const facebookBackground = '#F0F2F5';
  const facebookCardBg = '#FFFFFF';
  const facebookText = '#050505';
  const facebookSecondaryText = '#65676B';
  const facebookBorder = '#E4E6EB';
  const facebookInputBg = '#F0F2F5';

  const toggleFavorite = (sectionId) => {
    setFavoritesSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const sections = [
    {
      id: 'essentials',
      title: 'Essentials',
      icon: 'favorite',
      color: '#E74C3C',
      content: [
        'Provide fresh water at all times.',
        'Choose a balanced diet appropriate for age and size.',
        'Create a safe, comfortable sleeping area.',
        'Use an ID tag and keep microchip info updated.'
      ]
    },
    {
      id: 'feeding',
      title: 'Feeding',
      icon: 'restaurant',
      color: '#F39C12',
      content: [
        'Puppies/kittens: 3–4 meals/day; adults: 1–2 meals/day.',
        'Transition foods gradually (7–10 days) to avoid stomach upset.',
        'Avoid toxic foods: chocolate, grapes/raisins, onions, xylitol.',
        ...(species === 'dog' && ageGroup === 'young' ? ['Puppy: choose AAFCO puppy formula with DHA; small, frequent meals.'] : []),
        ...(species === 'dog' && ageGroup === 'adult' ? ['Adult dog: feed 1–2x/day; adjust portions by body condition score.'] : []),
        ...(species === 'cat' && ageGroup === 'young' ? ['Kitten: energy-dense kitten food; 3–4 meals/day or free-feed dry.'] : []),
        ...(species === 'cat' && ageGroup === 'adult' ? ['Adult cat: scheduled meals help weight control; promote wet food + water.'] : [])
      ]
    },
    {
      id: 'exercise',
      title: 'Exercise & Enrichment',
      icon: 'directions-run',
      color: '#27AE60',
      content: [
        'Daily walks/playtime suited to breed and energy level.',
        'Rotate toys and use puzzle feeders for mental stimulation.',
        'Provide scratching posts (cats) or chew toys (dogs).',
        species === 'dog' 
          ? (ageGroup === 'young' ? 'Puppy: several short play sessions; avoid high-impact jumps.' : 'Adult dog: 30–60 min activity daily; include sniff walks.')
          : (ageGroup === 'young' ? 'Kitten: multiple short play bursts with wand toys daily.' : 'Adult cat: 2–3 interactive play sessions; encourage climbing/perches.')
      ]
    },
    {
      id: 'grooming',
      title: 'Grooming',
      icon: 'content-cut',
      color: '#9B59B6',
      content: [
        'Brush coat regularly to reduce shedding and matting.',
        'Trim nails every 3–4 weeks; brush teeth 2–3x/week.',
        'Bathe only as needed with pet-safe shampoo.',
        species === 'dog' 
          ? 'Dogs: ear checks after baths/swims; long coats may need professional grooming.'
          : 'Cats: scoop litter daily; longhaired cats need more frequent brushing.'
      ]
    },
    {
      id: 'health',
      title: 'Health',
      icon: 'local-hospital',
      color: '#E67E22',
      content: [
        'Annual vet checkups; keep vaccines and deworming up to date.',
        'Use flea/tick prevention as recommended by your vet.',
        'Watch for appetite, energy, or bathroom habit changes.'
      ]
    },
    {
      id: 'vaccination',
      title: 'Vaccination Timing',
      icon: 'event-available',
      color: facebookBlue,
      content: [
        'Dogs (puppies): start core vaccines at 6–8 weeks; boosters every 3–4 weeks until 16 weeks.',
        'Cats (kittens): start at 6–8 weeks; boosters every 3–4 weeks until 16–20 weeks.',
        'Rabies: typically at 12–16 weeks (follow your local regulations and vet advice).',
        'Adults: booster 1 year after the initial series, then every 1–3 years as advised by your vet.',
        'Newly adopted/impounded pets: book a wellness and vaccine check within 3–7 days.',
        ...(species === 'dog' ? [ageGroup === 'young' ? 'For your selection: Puppy—DA2PP at 6–8w, 10–12w, 14–16w; Rabies at ~12–16w.' : 'For your selection: Adult dog—booster 1 year after series, then every 1–3 years as advised.'] : []),
        ...(species === 'cat' ? [ageGroup === 'young' ? 'For your selection: Kitten—FVRCP at 6–8w, 10–12w, 14–16w; Rabies at ~12–16w.' : 'For your selection: Adult cat—booster 1 year after series, then every 1–3 years as advised.'] : [])
      ]
    },
    {
      id: 'safety',
      title: 'Safety',
      icon: 'security',
      color: '#E74C3C',
      content: [
        'Keep harmful items out of reach (meds, cleaners, plants).',
        'Secure fences/doors; supervise outdoor time.',
        'Use a harness and proper leash when outside.'
      ]
    },
    {
      id: 'training',
      title: 'Training & Socialization',
      icon: 'school',
      color: '#8E44AD',
      content: [
        'Use positive reinforcement (treats/praise).',
        'Short, consistent sessions (5–10 minutes).',
        'Gradual exposure to people, pets, places.'
      ]
    },
    {
      id: 'emergency',
      title: 'Emergency Kit',
      icon: 'medical-services',
      color: '#C0392B',
      content: [
        'First-aid kit, extra food/water (3 days), meds, copies of records.',
        'Carrier/crate, leash, ID copies, recent photo.',
        'Know the nearest 24/7 vet clinic.'
      ]
    }
  ];

  const filteredSections = sections.filter(section => 
    searchQuery === '' || 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.some(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: facebookBackground,
    },
    header: {
      backgroundColor: '#ffffff',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? 50 : Math.max(0, (StatusBar.currentHeight || 0) - 24),
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
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
      fontWeight: '700',
      color: '#050505',
      flex: 1,
      textAlign: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
    },
    scroll: {
      flex: 1,
      backgroundColor: facebookBackground,
    },
    scrollContent: {
      padding: SPACING.md,
      paddingBottom: SPACING.xxl,
    },
    searchContainer: {
      backgroundColor: facebookCardBg,
      borderRadius: 20,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      marginLeft: SPACING.sm,
      padding: 0,
    },
    preferencesSection: {
      backgroundColor: facebookCardBg,
      borderRadius: 10,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    preferencesTitle: {
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    toggleContainer: {
      marginBottom: SPACING.md,
    },
    toggleLabel: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      marginBottom: SPACING.xs,
      fontWeight: '600',
    },
    toggleRow: {
      flexDirection: 'row',
      borderRadius: 8,
      backgroundColor: facebookInputBg,
      padding: 4,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: 6,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: facebookBlue,
    },
    toggleIcon: {
      marginRight: SPACING.xs,
    },
    toggleText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      fontWeight: '600',
    },
    toggleTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    section: {
      backgroundColor: facebookCardBg,
      borderRadius: 10,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
    },
    sectionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
      backgroundColor: facebookInputBg,
    },
    sectionTitleContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
    },
    sectionItemCount: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      marginTop: 2,
    },
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SPACING.xs,
      backgroundColor: facebookInputBg,
    },
    sectionContent: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: facebookBorder,
    },
    bulletContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    bulletIcon: {
      marginRight: SPACING.sm,
      marginTop: 6,
    },
    bulletText: {
      flex: 1,
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      lineHeight: 22,
    },
    emptyState: {
      alignItems: 'center',
      padding: SPACING.xl,
      marginTop: SPACING.xxl,
    },
    emptyStateText: {
      fontSize: 17,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      textAlign: 'center',
      marginTop: SPACING.md,
    },
    favoritesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: facebookCardBg,
      marginBottom: SPACING.md,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    favoritesTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
    },
    favoritesCount: {
      backgroundColor: facebookBlue,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 24,
      alignItems: 'center',
    },
    favoritesCountText: {
      fontSize: 12,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    sourceSection: {
      backgroundColor: facebookCardBg,
      borderRadius: 10,
      padding: SPACING.md,
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sourceTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    sourceSectionTitle: {
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginLeft: SPACING.xs,
    },
    sourceText: {
      fontSize: 14,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      lineHeight: 20,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    sourceLinksContainer: {
      marginBottom: SPACING.sm,
    },
    sourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      padding: SPACING.md,
      marginVertical: SPACING.xs,
    },
    sourceLinkIconContainer: {
      backgroundColor: facebookBlue + '15',
      borderRadius: 20,
      padding: SPACING.sm,
      marginRight: SPACING.md,
    },
    sourceLinkTextContainer: {
      flex: 1,
    },
    sourceLinkTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      fontWeight: '600',
      marginBottom: 2,
    },
    sourceLinkSubtitle: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
    },
    lastUpdatedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: facebookBorder,
    },
    lastUpdated: {
      fontSize: 12,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      marginLeft: SPACING.xs,
      fontStyle: 'italic',
    },
  }), []);

  const BulletPoint = ({ children }) => (
    <View style={styles.bulletContainer}>
      <MaterialIcons name="fiber-manual-record" size={6} color={facebookBlue} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );

  const SectionCard = ({ section }) => {
    const isExpanded = expandedSections.has(section.id);
    const isFavorite = favoritesSections.has(section.id);
    
    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionIconContainer}>
            <MaterialIcons name={section.icon} size={22} color={section.color} />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionItemCount}>{section.content.length} tips</Text>
          </View>
          <View style={styles.sectionActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(section.id);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isFavorite ? 'heart' : 'heart-outline'} 
                size={18} 
                color={isFavorite ? '#E74C3C' : facebookSecondaryText} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                toggleSection(section.id);
              }}
            >
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={18} 
                color={facebookSecondaryText} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.content.map((item, index) => (
              <BulletPoint key={index}>{item}</BulletPoint>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pet Care Guide</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={facebookSecondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${species === 'dog' ? 'dog' : 'cat'} care tips...`}
            placeholderTextColor={facebookSecondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={facebookSecondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.preferencesSection}>
          <Text style={styles.preferencesTitle}>🎯 Customize Your Guide</Text>
          
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Pet Type</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => setSpecies('dog')}
                style={[styles.toggleButton, species === 'dog' && styles.toggleActive]}
              >
                <Text style={[styles.toggleIcon, { fontSize: 18 }]}>🐕</Text>
                <Text style={[styles.toggleText, species === 'dog' && styles.toggleTextActive]}>Dog</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSpecies('cat')}
                style={[styles.toggleButton, species === 'cat' && styles.toggleActive]}
              >
                <Text style={[styles.toggleIcon, { fontSize: 18 }]}>🐱</Text>
                <Text style={[styles.toggleText, species === 'cat' && styles.toggleTextActive]}>Cat</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Age Group</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => setAgeGroup('young')}
                style={[styles.toggleButton, ageGroup === 'young' && styles.toggleActive]}
              >
                <Text style={[styles.toggleIcon, { fontSize: 18 }]}>
                  {species === 'dog' ? '🐶' : '🐱'}
                </Text>
                <Text style={[styles.toggleText, ageGroup === 'young' && styles.toggleTextActive]}>
                  {species === 'dog' ? 'Puppy' : 'Kitten'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAgeGroup('adult')}
                style={[styles.toggleButton, ageGroup === 'adult' && styles.toggleActive]}
              >
                <Text style={[styles.toggleIcon, { fontSize: 18 }]}>
                  {species === 'dog' ? '🐕' : '🐈'}
                </Text>
                <Text style={[styles.toggleText, ageGroup === 'adult' && styles.toggleTextActive]}>Adult</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Favorites Header */}
        {favoritesSections.size > 0 && (
          <View style={styles.favoritesHeader}>
            <Text style={styles.favoritesTitle}>⭐ Your Favorites</Text>
            <View style={styles.favoritesCount}>
              <Text style={styles.favoritesCountText}>{favoritesSections.size}</Text>
            </View>
          </View>
        )}

        {/* Sections */}
        {filteredSections.length > 0 ? (
          filteredSections.map(section => (
            <SectionCard key={section.id} section={section} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>🔍</Text>
            <Text style={styles.emptyStateText}>
              No results found for "{searchQuery}"
            </Text>
            <Text style={[styles.emptyStateText, { fontSize: 13, marginTop: SPACING.xs }]}>
              Try searching for specific care topics like "feeding", "grooming", or "health"
            </Text>
          </View>
        )}

        {/* Source Information */}
        <View style={styles.sourceSection}>
          <View style={styles.sourceTitleContainer}>
            <MaterialIcons name="verified" size={24} color={facebookBlue} />
            <Text style={styles.sourceSectionTitle}>Sources & References</Text>
          </View>
          <Text style={styles.sourceText}>
            This comprehensive guide is based on evidence-based veterinary recommendations from trusted, internationally recognized organizations:
          </Text>
          
          <View style={styles.sourceLinksContainer}>
            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.avma.org/resources-tools/pet-owners')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={facebookBlue} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Veterinary Medical Association</Text>
                <Text style={styles.sourceLinkSubtitle}>AVMA - Pet Owner Resources</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={facebookSecondaryText} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://wsava.org/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={facebookBlue} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>World Small Animal Veterinary Association</Text>
                <Text style={styles.sourceLinkSubtitle}>WSAVA - Global Standards</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={facebookSecondaryText} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.lastUpdatedContainer}>
            <MaterialIcons name="schedule" size={16} color={facebookSecondaryText} />
            <Text style={styles.lastUpdated}>Last updated: September 2025</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PetCareGuideScreen;
