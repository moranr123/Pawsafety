import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, LAYOUT } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { createUserDocument } from '../services/userService';
import { getResponsiveDimensions } from '../utils/responsive';
import { ResponsiveText, ResponsiveView, ResponsiveButton, ResponsiveInput, ResponsiveContainer } from '../components/ResponsiveComponents';

const LoginScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Cooldown timer effect
  React.useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if email is verified
      if (!user.emailVerified) {
        // Store user reference before signing out
        const unverifiedUser = user;
        await auth.signOut();
        Alert.alert(
          'Email Not Verified',
          'Please verify your email address before signing in. Check your email for the verification link.\n\n📁 Please also check your spam/junk folder if you don\'t see the email in your inbox.',
          [
            {
              text: canResend ? 'Resend Email' : `Wait ${resendCooldown}s`,
              onPress: async () => {
                if (!canResend) {
                  Alert.alert('Please Wait', `You can resend the email in ${resendCooldown} seconds.`);
                  return;
                }
                
                try {
                  // Re-authenticate to send verification email
                  const tempUserCredential = await signInWithEmailAndPassword(auth, email, password);
                  await sendEmailVerification(tempUserCredential.user);
                  await auth.signOut(); // Sign out again
                  
                  // Start cooldown (60 seconds)
                  setResendCooldown(60);
                  Alert.alert('Success', 'Verification email has been resent!\n\n📁 Please check your spam/junk folder if you don\'t see the email.');
                } catch (error) {
                  if (error.code === 'auth/too-many-requests') {
                    Alert.alert('Too Many Requests', 'Too many verification emails sent. Please wait before trying again.');
                    setResendCooldown(300); // 5 minute cooldown for rate limiting
                  } else {
                    Alert.alert('Error', 'Failed to resend verification email.');
                  }
                }
              },
              style: canResend ? 'default' : 'cancel'
            },
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }
      
      // Check user status in database
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status === 'deactivated') {
          // User is deactivated, sign them out immediately
          await auth.signOut();
          Alert.alert(
            'Account Deactivated',
            'Your account has been deactivated by an administrator. Please contact support for assistance.',
            [{ text: 'OK' }]
          );
          return;
        }
      } else {
        // User doesn't exist in Firestore but is verified, create user record
        console.log('Creating user record for verified user during login:', user.uid);
        const created = await createUserDocument(user);
        if (!created) {
          console.error('Failed to create user document during login');
        }
      }
      
      // Navigation will be handled by auth state change
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic responsive calculations based on current screen data
  const currentWidth = screenData.width;
  const currentHeight = screenData.height;
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;

  // Responsive placeholder text color
  const getPlaceholderTextColor = () => {
    if (isSmallDevice) {
      return COLORS.lightGray;
    } else if (isTablet) {
      return COLORS.secondaryText;
    } else {
      return COLORS.secondaryText;
    }
  };

  // Responsive placeholder text size
  const getPlaceholderTextSize = () => {
    if (isSmallDevice) {
      return 12;
    } else if (isTablet) {
      return 16;
    } else {
      return 14;
    }
  };

  // Responsive placeholder text style
  const getPlaceholderTextStyle = () => ({
    fontSize: getPlaceholderTextSize(),
    color: getPlaceholderTextColor(),
    fontFamily: FONTS.family,
  });

  // Responsive placeholder text for different screen sizes
  const getResponsivePlaceholder = (text) => {
    if (isSmallDevice) {
      return text.length > 12 ? text.substring(0, 12) + '...' : text;
    } else if (isTablet) {
      return text;
    } else {
      return text.length > 18 ? text.substring(0, 18) + '...' : text;
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: isSmallDevice ? SPACING.md : SPACING.lg,
      minHeight: hp(100),
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: isSmallDevice ? SPACING.lg : SPACING.xxl,
    },
    logoImage: {
      width: wp(isSmallDevice ? 18 : isTablet ? 12 : 20),
      height: wp(isSmallDevice ? 18 : isTablet ? 12 : 20),
      marginBottom: SPACING.sm,
      resizeMode: 'contain',
    },
    appName: {
      fontSize: isSmallDevice ? FONTS.sizes.xxlarge : FONTS.sizes.title,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    tagline: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
    },
    formContainer: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.xlarge,
      padding: isSmallDevice ? SPACING.lg : SPACING.xl,
      width: '100%',
      maxWidth: wp(90),
      alignSelf: 'center',
      ...SHADOWS.medium,
    },
    title: {
      fontSize: isSmallDevice ? FONTS.sizes.xxlarge : FONTS.sizes.xxxlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    subtitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginBottom: isSmallDevice ? SPACING.lg : SPACING.xl,
    },
    inputContainer: {
      marginBottom: SPACING.lg,
    },
    inputLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    input: {
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      paddingHorizontal: SPACING.md,
      paddingVertical: isSmallDevice ? SPACING.sm : SPACING.md,
      fontSize: isSmallDevice ? 14 : 16,
      fontFamily: FONTS.family,
      borderWidth: 1,
      borderColor: COLORS.mediumBlue,
      color: COLORS.text,
      height: isSmallDevice ? 50 : 56,
      minHeight: 50,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    placeholderText: {
      fontSize: getPlaceholderTextSize(),
      color: getPlaceholderTextColor(),
      fontFamily: FONTS.family,
    },
    loginButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      paddingHorizontal: SPACING.lg,
      paddingVertical: 0,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.lg,
      height: 60,
      minHeight: 60,
      flexDirection: 'row',
    },
    loginButtonDisabled: {
      backgroundColor: COLORS.secondaryText,
    },
    buttonTextContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    loginButtonText: {
      color: COLORS.white,
      fontSize: 16,
      fontFamily: FONTS.family,
      fontWeight: '700',
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
      lineHeight: 20,
      marginVertical: 0,
      marginHorizontal: 0,
      paddingVertical: 0,
      paddingHorizontal: 0,
      flex: 1,
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    signupText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    signupLink: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      borderWidth: 1,
      borderColor: COLORS.mediumBlue,
      height: isSmallDevice ? 50 : 56,
      minHeight: 50,
      justifyContent: 'space-between',
      paddingRight: SPACING.xs,
    },
    passwordInput: {
      flex: 1,
      paddingLeft: SPACING.md,
      paddingRight: SPACING.sm,
      paddingVertical: 0,
      fontSize: isSmallDevice ? 14 : 16,
      fontFamily: FONTS.family,
      color: COLORS.text,
      textAlignVertical: 'center',
      includeFontPadding: false,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'left',
    },
    eyeIcon: {
      paddingHorizontal: SPACING.xs,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minWidth: 35,
      maxWidth: 40,
    },
  }), [COLORS, currentWidth, currentHeight, isSmallDevice, isTablet, getPlaceholderTextColor, getPlaceholderTextSize, getResponsivePlaceholder]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/LogoBlue.png')} style={styles.logoImage} />
            <Text style={styles.appName}>PawSafety</Text>
            <Text style={styles.tagline}>Keep your pets safe and sound</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder={getResponsivePlaceholder("Enter email")}
                placeholderTextColor={getPlaceholderTextColor()}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="center"
                includeFontPadding={false}
                multiline={false}
                numberOfLines={1}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={isSmallDevice ? "Password" : "Enter password"}
                  placeholderTextColor={getPlaceholderTextColor()}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textAlignVertical="center"
                  includeFontPadding={false}
                  multiline={false}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={24}
                    color={COLORS.secondaryText}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text 
                style={styles.loginButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



export default LoginScreen; 