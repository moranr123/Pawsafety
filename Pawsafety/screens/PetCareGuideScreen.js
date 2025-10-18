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
      ],
      sources: [
        {
          title: 'AVMA Pet Owner Resources',
          url: 'https://www.avma.org/resources-tools/pet-owners',
          description: 'Basic pet care essentials'
        },
        {
          title: 'ASPCA Pet Care Guidelines',
          url: 'https://www.aspca.org/pet-care',
          description: 'Comprehensive pet care basics'
        }
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
      ],
      sources: [
        {
          title: 'WSAVA Global Nutrition Guidelines',
          url: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/',
          description: 'International feeding standards'
        },
        {
          title: 'Pet Poison Helpline',
          url: 'https://www.petpoisonhelpline.com/',
          description: 'Toxic foods and substances'
        },
        {
          title: 'AAFCO Pet Food Labeling',
          url: 'https://www.aafco.org/',
          description: 'Pet food standards and regulations'
        }
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
      ],
      sources: [
        {
          title: 'AVMA Exercise Guidelines',
          url: 'https://www.avma.org/resources-tools/pet-owners/petcare/exercise',
          description: 'Pet exercise recommendations'
        },
        {
          title: 'International Association of Animal Behavior Consultants',
          url: 'https://iaabc.org/',
          description: 'Enrichment and behavioral needs'
        }
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
      ],
      sources: [
        {
          title: 'Veterinary Oral Health Council',
          url: 'https://www.vohc.org/',
          description: 'Pet dental care guidelines'
        },
        {
          title: 'Pet Grooming Association',
          url: 'https://www.petgroomingassociation.com/',
          description: 'Professional grooming standards'
        }
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
      ],
      sources: [
        {
          title: 'AVMA Preventive Care Guidelines',
          url: 'https://www.avma.org/resources-tools/pet-owners/petcare/preventive-care',
          description: 'Preventive healthcare recommendations'
        },
        {
          title: 'CDC Pet Health',
          url: 'https://www.cdc.gov/healthypets/',
          description: 'Pet health and zoonotic diseases'
        }
      ]
    },
    {
      id: 'vaccination',
      title: 'Vaccination Timing',
      icon: 'event-available',
      color: '#3498DB',
      content: [
        'Dogs (puppies): start core vaccines at 6–8 weeks; boosters every 3–4 weeks until 16 weeks.',
        'Cats (kittens): start at 6–8 weeks; boosters every 3–4 weeks until 16–20 weeks.',
        'Rabies: typically at 12–16 weeks (follow your local regulations and vet advice).',
        'Adults: booster 1 year after the initial series, then every 1–3 years as advised by your vet.',
        'Newly adopted/impounded pets: book a wellness and vaccine check within 3–7 days.',
        ...(species === 'dog' ? [ageGroup === 'young' ? 'For your selection: Puppy—DA2PP at 6–8w, 10–12w, 14–16w; Rabies at ~12–16w.' : 'For your selection: Adult dog—booster 1 year after series, then every 1–3 years as advised.'] : []),
        ...(species === 'cat' ? [ageGroup === 'young' ? 'For your selection: Kitten—FVRCP at 6–8w, 10–12w, 14–16w; Rabies at ~12–16w.' : 'For your selection: Adult cat—booster 1 year after series, then every 1–3 years as advised.'] : [])
      ],
      sources: [
        {
          title: 'AAHA Vaccination Guidelines',
          url: 'https://www.aaha.org/aaha-guidelines/vaccination-guidelines/',
          description: 'Canine vaccination protocols'
        },
        {
          title: 'AAFP Feline Vaccination Guidelines',
          url: 'https://catvets.com/guidelines/practice-guidelines/vaccination-guidelines',
          description: 'Feline vaccination recommendations'
        },
        {
          title: 'WSAVA Vaccination Guidelines',
          url: 'https://wsava.org/global-guidelines/vaccination-guidelines/',
          description: 'Global vaccination standards'
        }
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
      ],
      sources: [
        {
          title: 'ASPCA Pet Safety',
          url: 'https://www.aspca.org/pet-care/general-pet-care/pet-safety',
          description: 'Pet safety guidelines'
        },
        {
          title: 'Pet Poison Helpline',
          url: 'https://www.petpoisonhelpline.com/',
          description: 'Toxic substances and plants'
        }
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
      ],
      sources: [
        {
          title: 'American Veterinary Society of Animal Behavior',
          url: 'https://avsab.org/',
          description: 'Evidence-based training methods'
        },
        {
          title: 'Association of Professional Dog Trainers',
          url: 'https://apdt.com/',
          description: 'Professional training standards'
        }
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
      ],
      sources: [
        {
          title: 'AVMA Emergency Preparedness',
          url: 'https://www.avma.org/resources-tools/pet-owners/emergency-care',
          description: 'Pet emergency preparedness'
        },
        {
          title: 'Red Cross Pet First Aid',
          url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/pet-safety',
          description: 'Pet first aid guidelines'
        }
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
      backgroundColor: COLORS.background,
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
    },
    backButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
      marginRight: SPACING.md,
    },
    scroll: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollContent: {
      padding: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    searchContainer: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      ...SHADOWS.light,
    },
    searchInput: {
      flex: 1,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      marginLeft: SPACING.sm,
      padding: 0,
    },
    preferencesSection: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      ...SHADOWS.light,
    },
    preferencesTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    toggleContainer: {
      marginBottom: SPACING.md,
    },
    toggleLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: SPACING.xs,
      fontWeight: FONTS.weights.medium,
    },
    toggleRow: {
      flexDirection: 'row',
      borderRadius: RADIUS.medium,
      backgroundColor: COLORS.inputBackground,
      padding: 4,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.small,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: COLORS.darkPurple,
      ...SHADOWS.light,
    },
    toggleIcon: {
      marginRight: SPACING.xs,
    },
    toggleText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      fontWeight: FONTS.weights.medium,
    },
    toggleTextActive: {
      color: COLORS.white,
      fontWeight: FONTS.weights.bold,
    },
    section: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      ...SHADOWS.light,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    sectionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    sectionTitleContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    sectionItemCount: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: 2,
    },
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: SPACING.sm,
      marginLeft: SPACING.xs,
      borderRadius: 20,
      backgroundColor: COLORS.inputBackground,
    },
    sectionContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    bulletContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.inputBackground,
    },
    bulletIcon: {
      marginRight: SPACING.sm,
      marginTop: 2,
    },
    bulletText: {
      flex: 1,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 22,
    },
    emptyState: {
      alignItems: 'center',
      padding: SPACING.xl,
      marginTop: SPACING.xxl,
    },
    emptyStateText: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginTop: SPACING.md,
    },
    favoritesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: COLORS.inputBackground,
      marginBottom: SPACING.lg,
      borderRadius: RADIUS.medium,
    },
    favoritesTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    favoritesCount: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: 10,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
    },
    favoritesCountText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.white,
      fontWeight: FONTS.weights.bold,
    },
    // Source Section Styles
    sourceSection: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginTop: SPACING.xl,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOWS.light,
    },
    sourceTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    sourceSectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginLeft: SPACING.sm,
    },
    sourceText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 22,
      marginBottom: SPACING.lg,
      textAlign: 'center',
    },
    sourceLinksContainer: {
      marginBottom: SPACING.md,
    },
    sourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(138, 43, 226, 0.05)',
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginVertical: SPACING.xs,
      borderWidth: 1,
      borderColor: 'rgba(138, 43, 226, 0.15)',
      elevation: 1,
      shadowColor: COLORS.darkPurple,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    sourceLinkIconContainer: {
      backgroundColor: 'rgba(138, 43, 226, 0.1)',
      borderRadius: 20,
      padding: SPACING.sm,
      marginRight: SPACING.md,
    },
    sourceLinkTextContainer: {
      flex: 1,
    },
    sourceLinkTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      fontWeight: FONTS.weights.semiBold,
      marginBottom: 2,
    },
    sourceLinkSubtitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    lastUpdatedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    lastUpdated: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginLeft: SPACING.xs,
      fontStyle: 'italic',
    },
    // Section Sources Styles
    sectionSourcesContainer: {
      marginTop: SPACING.lg,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    sectionSourcesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    sectionSourcesTitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.darkPurple,
      marginLeft: SPACING.xs,
    },
    sectionSourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(138, 43, 226, 0.05)',
      borderRadius: RADIUS.small,
      padding: SPACING.sm,
      marginVertical: SPACING.xs,
      borderWidth: 1,
      borderColor: 'rgba(138, 43, 226, 0.1)',
    },
    sectionSourceContent: {
      flex: 1,
    },
    sectionSourceTitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
      marginBottom: 2,
    },
    sectionSourceDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
  }), [COLORS]);

  const BulletPoint = ({ children, icon = 'fiber-manual-record' }) => (
    <View style={styles.bulletContainer}>
      <MaterialIcons name={icon} size={8} color={COLORS.darkPurple} style={styles.bulletIcon} />
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
          <View style={[styles.sectionIconContainer, { backgroundColor: section.color + '20' }]}>
            <MaterialIcons name={section.icon} size={22} color={section.color} />
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionItemCount}>{section.content.length} tips</Text>
          </View>
          <View style={styles.sectionActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => toggleFavorite(section.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isFavorite ? 'heart' : 'heart-outline'} 
                size={18} 
                color={isFavorite ? '#E74C3C' : COLORS.secondaryText} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={18} 
                color={COLORS.secondaryText} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.content.map((item, index) => (
              <BulletPoint key={index}>{item}</BulletPoint>
            ))}
            
            {/* Section Sources */}
            {section.sources && section.sources.length > 0 && (
              <View style={styles.sectionSourcesContainer}>
                <View style={styles.sectionSourcesHeader}>
                  <MaterialIcons name="link" size={16} color={COLORS.darkPurple} />
                  <Text style={styles.sectionSourcesTitle}>Sources</Text>
                </View>
                {section.sources.map((source, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.sectionSourceLink}
                    onPress={() => Linking.openURL(source.url)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionSourceContent}>
                      <Text style={styles.sectionSourceTitle}>{source.title}</Text>
                      <Text style={styles.sectionSourceDescription}>{source.description}</Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={COLORS.secondaryText} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

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

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.secondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${species === 'dog' ? 'dog' : 'cat'} care tips...`}
            placeholderTextColor={COLORS.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.secondaryText} />
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
            <Text style={[styles.emptyStateText, { fontSize: FONTS.sizes.small, marginTop: SPACING.xs }]}>
              Try searching for specific care topics like "feeding", "grooming", or "health"
            </Text>
          </View>
        )}

        {/* Source Information */}
        <View style={styles.sourceSection}>
          <View style={styles.sourceTitleContainer}>
            <MaterialIcons name="verified" size={24} color={COLORS.darkPurple} />
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
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Veterinary Medical Association</Text>
                <Text style={styles.sourceLinkSubtitle}>AVMA - Pet Owner Resources & Guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://wsava.org/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>World Small Animal Veterinary Association</Text>
                <Text style={styles.sourceLinkSubtitle}>WSAVA - Global Standards & Guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.aspca.org/pet-care')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Society for the Prevention of Cruelty to Animals</Text>
                <Text style={styles.sourceLinkSubtitle}>ASPCA - Pet Care & Safety Guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.aaha.org/aaha-guidelines/vaccination-guidelines/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Animal Hospital Association</Text>
                <Text style={styles.sourceLinkSubtitle}>AAHA - Vaccination & Care Guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://catvets.com/guidelines/practice-guidelines/vaccination-guidelines')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Association of Feline Practitioners</Text>
                <Text style={styles.sourceLinkSubtitle}>AAFP - Feline Care Guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.cdc.gov/healthypets/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>Centers for Disease Control and Prevention</Text>
                <Text style={styles.sourceLinkSubtitle}>CDC - Pet Health & Zoonotic Diseases</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.petpoisonhelpline.com/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>Pet Poison Helpline</Text>
                <Text style={styles.sourceLinkSubtitle}>Toxicology & Pet Safety Information</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://avsab.org/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Veterinary Society of Animal Behavior</Text>
                <Text style={styles.sourceLinkSubtitle}>AVSAB - Evidence-Based Training Methods</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.vohc.org/')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>Veterinary Oral Health Council</Text>
                <Text style={styles.sourceLinkSubtitle}>VOHC - Pet Dental Care Guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sourceLink}
              onPress={() => Linking.openURL('https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/pet-safety')}
              activeOpacity={0.7}
            >
              <View style={styles.sourceLinkIconContainer}>
                <Ionicons name="link" size={18} color={COLORS.darkPurple} />
              </View>
              <View style={styles.sourceLinkTextContainer}>
                <Text style={styles.sourceLinkTitle}>American Red Cross</Text>
                <Text style={styles.sourceLinkSubtitle}>Pet First Aid & Emergency Preparedness</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.lastUpdatedContainer}>
            <MaterialIcons name="schedule" size={16} color={COLORS.secondaryText} />
            <Text style={styles.lastUpdated}>Last updated: September 2025</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PetCareGuideScreen;