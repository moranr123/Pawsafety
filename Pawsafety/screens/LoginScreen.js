import React, { useState, useMemo } from 'react';
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
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { createUserDocument } from '../services/userService';

const LoginScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
      padding: SPACING.lg,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: SPACING.xxl,
    },
    logoImage: {
      width: 80,
      height: 80,
      marginBottom: SPACING.sm,
      resizeMode: 'contain',
    },
    appName: {
      fontSize: FONTS.sizes.title,
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
      padding: SPACING.xl,
      ...SHADOWS.medium,
    },
    title: {
      fontSize: FONTS.sizes.xxxlarge,
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
      marginBottom: SPACING.xl,
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
    },
    input: {
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      borderWidth: 1,
      borderColor: COLORS.mediumBlue,
      color: COLORS.text,
    },
    loginButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      alignItems: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    loginButtonDisabled: {
      backgroundColor: COLORS.secondaryText,
    },
    loginButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
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
    },
    passwordInput: {
      flex: 1,
      padding: SPACING.md,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
    },
    eyeIcon: {
      padding: SPACING.md,
    },
  }), [COLORS]);

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
                placeholder="Enter your email"
                placeholderTextColor={COLORS.secondaryText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.secondaryText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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
            >
              <Text style={styles.loginButtonText}>
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