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
  Image,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserDocument } from '../services/userService';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const SignUpScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'Please enter a valid full name');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: fullName.trim()
      });
      
      // Create user document in Firestore
      const userDocCreated = await createUserDocument(userCredential.user);
      if (!userDocCreated) {
        console.warn('Failed to create user document in Firestore');
      }
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      setEmailVerificationSent(true);
      
      // Start cooldown immediately after sending verification email
      setResendCooldown(60);
      
      // Sign out the user so they're not automatically logged in
      await signOut(auth);
      // Show success modal
      setSuccessModalVisible(true);
    } catch (error) {
      Alert.alert('Sign Up Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    // Reset form
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailVerificationSent(false);
    setResendCooldown(0);
    setCanResend(true);
    // Navigate to login
    navigation.navigate('Login');
  };

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

  const resendVerificationEmail = async () => {
    if (!canResend) {
      Alert.alert('Please Wait', `You can resend the email in ${resendCooldown} seconds.`);
      return;
    }

    try {
      // Try to sign in with existing credentials to resend verification
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      
      // Start cooldown (60 seconds)
      setResendCooldown(60);
      Alert.alert('Success', 'Verification email has been resent!\n\n📁 Please check your spam/junk folder if you don\'t see the email.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'Account not found. Please try signing up again.');
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Invalid password. Please check your password and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Too Many Requests', 'Too many verification emails sent. Please wait before trying again.');
        setResendCooldown(300); // 5 minute cooldown for rate limiting
      } else {
        Alert.alert('Error', 'Failed to resend verification email. Please try again.');
      }
    }
  };

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
            <Text style={styles.tagline}>Join our pet-loving community</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#A0A0A0"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#A0A0A0"
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
                  placeholder="Enter your password (min. 6 characters)"
                  placeholderTextColor="#A0A0A0"
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
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor="#A0A0A0"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={24}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.modalTitle}>Account Created!</Text>
            </View>
            
            <View style={styles.modalBody}>
              {emailVerificationSent ? (
                <>
                  <Text style={styles.modalMessage}>
                    Your PawSafety account has been created successfully!
                  </Text>
                  <Text style={styles.verificationMessage}>
                    📧 We've sent a verification email to:
                  </Text>
                  <Text style={styles.emailText}>{email}</Text>
                  <Text style={styles.verificationInstructions}>
                    Please check your email and click the verification link before signing in.
                  </Text>
                  <Text style={styles.spamFolderReminder}>
                    📁 <Text style={styles.spamFolderHighlight}>Please check your spam/junk folder</Text> if you don't see the email in your inbox.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
                    onPress={resendVerificationEmail}
                    disabled={!canResend}
                  >
                    <Text style={[styles.resendButtonText, !canResend && styles.resendButtonTextDisabled]}>
                      {canResend 
                        ? 'Resend Verification Email' 
                        : `Resend in ${resendCooldown}s`
                      }
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.modalMessage}>
                  Your PawSafety account has been successfully created. You can now sign in with your credentials.
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={handleSuccessModalClose}
            >
              <Text style={styles.modalButtonText}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    color: COLORS.darkPurple,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.gray,
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
    color: COLORS.darkPurple,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.gray,
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
    color: COLORS.darkPurple,
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
    color: COLORS.darkPurple,
  },
  signUpButton: {
    backgroundColor: COLORS.golden,
    borderRadius: RADIUS.medium,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  signUpButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  signUpButtonText: {
    color: COLORS.darkPurple,
    fontSize: FONTS.sizes.large,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.gray,
  },
  loginLink: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.darkPurple,
    fontWeight: FONTS.weights.bold,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xlarge,
    padding: SPACING.xl,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.heavy,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkPurple,
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: SPACING.xl,
  },
  modalMessage: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.medium,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
  },
  verificationMessage: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.darkPurple,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontWeight: FONTS.weights.semiBold,
  },
  emailText: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    color: COLORS.mediumBlue,
    textAlign: 'center',
    marginVertical: SPACING.sm,
    fontWeight: FONTS.weights.bold,
  },
  verificationInstructions: {
    fontSize: FONTS.sizes.small,
    fontFamily: FONTS.family,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
    borderRadius: RADIUS.medium,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  resendButtonText: {
    color: COLORS.mediumBlue,
    fontSize: FONTS.sizes.small,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.semiBold,
  },
  resendButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: COLORS.gray,
    opacity: 0.6,
  },
  resendButtonTextDisabled: {
    color: COLORS.gray,
  },
  spamFolderReminder: {
    fontSize: FONTS.sizes.small,
    fontFamily: FONTS.family,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  spamFolderHighlight: {
    color: COLORS.darkPurple,
    fontWeight: FONTS.weights.semiBold,
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
    color: COLORS.darkPurple,
  },
  eyeIcon: {
    padding: SPACING.md,
  },
});

export default SignUpScreen; 