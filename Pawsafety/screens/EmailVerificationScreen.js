import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { checkRateLimit, recordAttempt, formatTimeRemaining, subscribeToRateLimit, resetFailedAttempts } from '../services/rateLimiter';
import { getAuthErrorMessage } from '../utils/authErrors';

const EmailVerificationScreen = ({ route, navigation }) => {
  const { colors: COLORS } = useTheme();
  const { email, password } = route.params || {};
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailVerificationRateLimit, setEmailVerificationRateLimit] = useState(null);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Cooldown timer effect
  useEffect(() => {
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

  // Real-time rate limit listener for email verification
  useEffect(() => {
    let unsubscribe = null;

    if (email && email.includes('@')) {
      // Set up real-time listener for email verification rate limits
      unsubscribe = subscribeToRateLimit('emailVerification', email, (updatedInfo) => {
        setEmailVerificationRateLimit(updatedInfo);
      });
    } else {
      setEmailVerificationRateLimit(null);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [email]);

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  const handleResendVerificationEmail = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required to resend verification email.');
      return;
    }

    if (!canResend) {
      Alert.alert('Please Wait', `You can resend the email in ${resendCooldown} seconds.`);
      return;
    }

    // Check rate limit for email verification resend
    const rateLimitCheck = await checkRateLimit('emailVerification', email);
    setEmailVerificationRateLimit(rateLimitCheck);
    
    if (!rateLimitCheck.allowed) {
      const timeRemaining = rateLimitCheck.resetTime 
        ? formatTimeRemaining(new Date(rateLimitCheck.resetTime))
        : '1 hour';
      
      Alert.alert(
        'Too Many Requests',
        `You have exceeded the maximum number of verification email requests. Please try again in ${timeRemaining}.`
      );
      setResendCooldown(300); // Set UI cooldown
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate to send verification email
      const tempUserCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(tempUserCredential.user);
      await auth.signOut(); // Sign out again
      
      // Successful resend - reset failed attempts
      await resetFailedAttempts('emailVerification', email).catch(() => {
        // Silently fail
      });
      
      // Update rate limit info
      const resetInfo = {
        allowed: true,
        remainingAttempts: 3,
        resetTime: null,
        attemptCount: 0
      };
      setEmailVerificationRateLimit(resetInfo);
      
      // Start cooldown (60 seconds)
      setResendCooldown(60);
      Alert.alert('Success', 'Verification email has been resent!\n\n📁 Please check your spam/junk folder if you don\'t see the email.');
    } catch (error) {
      // Record failed attempt
      await recordAttempt('emailVerification', email, false).catch(() => {
        // Silently fail
      });
      
      // Update rate limit info
      const updatedCheck = await checkRateLimit('emailVerification', email).catch(() => {
        return rateLimitCheck;
      });
      setEmailVerificationRateLimit(updatedCheck);
      
      const { title, message } = getAuthErrorMessage(error);
      if (error.code === 'auth/too-many-requests') {
        setResendCooldown(300); // 5 minute cooldown for rate limiting
      }
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  }, [email, password, canResend, resendCooldown]);

  const handleBackToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  // Dynamic responsive calculations
  const currentWidth = screenData.width;
  const currentHeight = screenData.height;
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const isLandscape = currentWidth > currentHeight;
  const isVerySmallDevice = currentWidth < 320 || currentHeight < 568;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;

  // Memoize styles for performance
  const styleSheet = useMemo(() => styles(isSmallDevice, isTablet, isLandscape, isVerySmallDevice, wp, hp, COLORS), 
    [isSmallDevice, isTablet, isLandscape, isVerySmallDevice, currentWidth, currentHeight, COLORS]);

  return (
    <SafeAreaView style={styleSheet.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styleSheet.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styleSheet.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styleSheet.logoContainer}>
          <Image 
            source={require('../assets/LogoBlue.png')} 
            style={styleSheet.logoImage}
            resizeMode="contain"
          />
          <Text style={styleSheet.appName}>PawSafety</Text>
        </View>

        <View style={styleSheet.contentContainer}>
          <View style={styleSheet.iconContainer}>
            <MaterialIcons 
              name="email" 
              size={isSmallDevice ? (isVerySmallDevice ? 60 : 70) : (isTablet ? 100 : 80)} 
              color={COLORS.mediumBlue} 
            />
          </View>

          <Text style={styleSheet.title}>Verify Your Email</Text>
          
          <Text style={styleSheet.message}>
            We've sent a verification email to:
          </Text>
          
          <Text style={styleSheet.emailText}>{email}</Text>
          
          <Text style={styleSheet.instructions}>
            Please check your email and click the verification link to activate your account.
          </Text>
          
          <Text style={styleSheet.spamFolderReminder}>
            📁 <Text style={styleSheet.spamFolderHighlight}>Please check your spam/junk folder</Text> if you don't see the email in your inbox.
          </Text>

          {/* Rate Limit Warning */}
          {emailVerificationRateLimit && emailVerificationRateLimit.allowed && emailVerificationRateLimit.remainingAttempts < 3 && emailVerificationRateLimit.remainingAttempts > 0 && (
            <Text style={styleSheet.rateLimitWarning}>
              {emailVerificationRateLimit.remainingAttempts} verification email{emailVerificationRateLimit.remainingAttempts !== 1 ? 's' : ''} remaining
            </Text>
          )}

          {/* Resend Button */}
          <TouchableOpacity 
            style={[
              styleSheet.resendButton,
              (!canResend || loading || (emailVerificationRateLimit && !emailVerificationRateLimit.allowed)) && styleSheet.resendButtonDisabled
            ]}
            onPress={handleResendVerificationEmail}
            disabled={!canResend || loading || (emailVerificationRateLimit && !emailVerificationRateLimit.allowed)}
          >
            {loading ? (
              <View style={styleSheet.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.white} style={styleSheet.spinner} />
                <Text style={styleSheet.resendButtonText}>Sending...</Text>
              </View>
            ) : (
              <Text style={[
                styleSheet.resendButtonText,
                (!canResend || (emailVerificationRateLimit && !emailVerificationRateLimit.allowed)) && styleSheet.resendButtonTextDisabled
              ]}>
                {canResend 
                  ? (emailVerificationRateLimit && !emailVerificationRateLimit.allowed) 
                    ? 'Rate Limited' 
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Verification Email'
                  : `Resend in ${resendCooldown}s`
                }
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Button */}
          <TouchableOpacity 
            style={styleSheet.backButton}
            onPress={handleBackToLogin}
            disabled={loading}
          >
            <Text style={styleSheet.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (isSmallDevice, isTablet, isLandscape, isVerySmallDevice, wp, hp, COLORS) => StyleSheet.create({
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
    paddingHorizontal: isVerySmallDevice 
      ? SPACING.md 
      : isSmallDevice 
        ? SPACING.lg 
        : isTablet 
          ? SPACING.xl * 1.5 
          : SPACING.xl,
    paddingVertical: isLandscape 
      ? SPACING.md 
      : isVerySmallDevice 
        ? SPACING.md 
        : isSmallDevice 
          ? SPACING.lg 
          : SPACING.xl,
    minHeight: hp(100),
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isLandscape 
      ? hp(2) 
      : isVerySmallDevice 
        ? hp(3) 
        : isSmallDevice 
          ? hp(4) 
          : isTablet 
            ? hp(5) 
            : hp(6),
  },
  logoImage: {
    width: wp(isVerySmallDevice 
      ? 20 
      : isSmallDevice 
        ? 25 
        : isTablet 
          ? 18 
          : 30),
    height: wp(isVerySmallDevice 
      ? 20 
      : isSmallDevice 
        ? 25 
        : isTablet 
          ? 18 
          : 30),
    marginBottom: isVerySmallDevice ? SPACING.xs : SPACING.md,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: isVerySmallDevice 
      ? 28 
      : isSmallDevice 
        ? 32 
        : isTablet 
          ? 48 
          : 40,
    fontFamily: FONTS.family,
    fontWeight: '700',
    color: '#1877F2',
    letterSpacing: -0.5,
  },
  contentContainer: {
    width: '100%',
    maxWidth: isTablet ? wp(70) : wp(90),
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: isLandscape 
      ? SPACING.md 
      : isVerySmallDevice 
        ? SPACING.md 
        : isSmallDevice 
          ? SPACING.lg 
          : SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: isVerySmallDevice 
      ? FONTS.sizes.large 
      : isSmallDevice 
        ? FONTS.sizes.large 
        : isTablet 
          ? FONTS.sizes.xxlarge 
          : FONTS.sizes.xlarge,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkPurple,
    textAlign: 'center',
    marginBottom: isVerySmallDevice ? SPACING.xs : SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  message: {
    fontSize: isVerySmallDevice 
      ? FONTS.sizes.small 
      : isSmallDevice 
        ? FONTS.sizes.small 
        : FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    lineHeight: isVerySmallDevice ? 18 : 22,
  },
  emailText: {
    fontSize: isVerySmallDevice 
      ? FONTS.sizes.small 
      : isSmallDevice 
        ? FONTS.sizes.small 
        : FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.mediumBlue,
    textAlign: 'center',
    marginVertical: isVerySmallDevice ? SPACING.xs : SPACING.md,
    fontWeight: FONTS.weights.bold,
    paddingHorizontal: SPACING.md,
    ...(Platform.OS === 'ios' && {
      // iOS text rendering optimization
      includeFontPadding: false,
    }),
  },
  instructions: {
    fontSize: isVerySmallDevice 
      ? 12 
      : isSmallDevice 
        ? FONTS.sizes.xsmall 
        : FONTS.sizes.small,
    fontFamily: FONTS.family,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: isVerySmallDevice ? 16 : isSmallDevice ? 18 : 20,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    paddingHorizontal: isVerySmallDevice ? SPACING.xs : SPACING.md,
  },
  spamFolderReminder: {
    fontSize: isVerySmallDevice 
      ? 11 
      : isSmallDevice 
        ? FONTS.sizes.xsmall 
        : FONTS.sizes.small,
    fontFamily: FONTS.family,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: isVerySmallDevice ? 16 : 18,
    marginBottom: isLandscape ? SPACING.md : isVerySmallDevice ? SPACING.md : SPACING.xl,
    paddingHorizontal: isVerySmallDevice ? SPACING.xs : SPACING.sm,
  },
  spamFolderHighlight: {
    color: COLORS.darkPurple,
    fontWeight: FONTS.weights.semiBold,
  },
  resendButton: {
    backgroundColor: COLORS.mediumBlue,
    borderRadius: RADIUS.medium,
    paddingVertical: isVerySmallDevice ? SPACING.sm : SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.md,
    minHeight: isVerySmallDevice ? 44 : 50,
    justifyContent: 'center',
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    }),
    ...(Platform.OS === 'android' && {
      elevation: 2,
    }),
  },
  resendButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  resendButtonText: {
    color: COLORS.white,
    fontSize: isVerySmallDevice 
      ? FONTS.sizes.small 
      : isSmallDevice 
        ? FONTS.sizes.small 
        : FONTS.sizes.medium,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
    ...(Platform.OS === 'ios' && {
      includeFontPadding: false,
    }),
  },
  resendButtonTextDisabled: {
    color: COLORS.white,
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: SPACING.sm,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.darkPurple,
    borderRadius: RADIUS.medium,
    paddingVertical: isVerySmallDevice ? SPACING.sm : SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.sm,
    minHeight: isVerySmallDevice ? 44 : 50,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.darkPurple,
    fontSize: isVerySmallDevice 
      ? FONTS.sizes.small 
      : isSmallDevice 
        ? FONTS.sizes.small 
        : FONTS.sizes.medium,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.semiBold,
    textAlign: 'center',
    ...(Platform.OS === 'ios' && {
      includeFontPadding: false,
    }),
  },
  rateLimitWarning: {
    fontSize: isVerySmallDevice ? 11 : 12,
    fontFamily: FONTS.family,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '500',
    paddingHorizontal: SPACING.sm,
  },
});

export default EmailVerificationScreen;

