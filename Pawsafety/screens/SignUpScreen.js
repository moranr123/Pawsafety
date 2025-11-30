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
  Modal,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserDocument } from '../services/userService';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { validateEmail, validatePassword, validateName } from '../utils/validation';
import { showAuthError, getAuthErrorMessage } from '../utils/authErrors';

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
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateNameInput = (text) => {
    // Only allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']*$/;
    return nameRegex.test(text);
  };

  const handleNameChange = (text) => {
    if (validateNameInput(text)) {
      setFullName(text);
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate name using utility
    const nameValidation = validateName(fullName);
    if (!nameValidation.valid) {
      Alert.alert('Error', nameValidation.message);
      return;
    }

    // Validate email using utility
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password using utility
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the Terms and Conditions to continue');
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
        // User document creation failed - non-critical
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
      showAuthError(error, Alert);
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
    setAcceptedTerms(false);
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
      const { title, message } = getAuthErrorMessage(error);
      if (error.code === 'auth/too-many-requests') {
        setResendCooldown(300); // 5 minute cooldown for rate limiting
      }
      Alert.alert(title, message);
    }
  };

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Dynamic responsive calculations based on current screen data
  const currentWidth = screenData.width;
  const currentHeight = screenData.height;
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;

  // Facebook blue color
  const facebookBlue = '#1877F2';

  const styleSheet = useMemo(() => styles(isSmallDevice, isTablet, wp, hp, COLORS, facebookBlue), [isSmallDevice, isTablet, currentWidth, currentHeight, COLORS]);

  return (
    <SafeAreaView style={styleSheet.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styleSheet.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styleSheet.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styleSheet.logoContainer}>
            <Image source={require('../assets/LogoBlue.png')} style={styleSheet.logoImage} />
            <Text style={styleSheet.appName}>PawSafety</Text>
          </View>

          <View style={styleSheet.formContainer}>
            <View style={styleSheet.inputContainer}>
              <Text style={styleSheet.inputLabel}>Full Name</Text>
              <TextInput
                style={styleSheet.input}
                placeholder="Full name"
                placeholderTextColor="#8A8D91"
                value={fullName}
                onChangeText={handleNameChange}
                autoCapitalize="words"
                autoCorrect={false}
                textAlignVertical="center"
                includeFontPadding={false}
                multiline={false}
                numberOfLines={1}
              />
            </View>

            <View style={styleSheet.inputContainer}>
              <Text style={styleSheet.inputLabel}>Email</Text>
              <TextInput
                style={styleSheet.input}
                placeholder="Email or phone number"
                placeholderTextColor="#8A8D91"
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

            <View style={styleSheet.inputContainer}>
              <Text style={styleSheet.inputLabel}>Password</Text>
              <View style={styleSheet.passwordInputContainer}>
                <TextInput
                  style={styleSheet.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#8A8D91"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textAlignVertical="center"
                  includeFontPadding={false}
                  multiline={false}
                  numberOfLines={1}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={styleSheet.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#8A8D91"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styleSheet.inputContainer}>
              <Text style={styleSheet.inputLabel}>Confirm Password</Text>
              <View style={styleSheet.passwordInputContainer}>
                <TextInput
                  style={styleSheet.passwordInput}
                  placeholder="Confirm password"
                  placeholderTextColor="#8A8D91"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  textAlignVertical="center"
                  includeFontPadding={false}
                  multiline={false}
                  numberOfLines={1}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                <TouchableOpacity
                  style={styleSheet.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#8A8D91"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styleSheet.termsContainer}>
              <TouchableOpacity
                style={styleSheet.checkboxContainer}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                activeOpacity={0.7}
              >
                <View style={[styleSheet.checkbox, acceptedTerms && styleSheet.checkboxChecked]}>
                  {acceptedTerms && (
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styleSheet.termsTextContainer}>
                  <Text style={styleSheet.termsText}>
                    I agree to the{' '}
                    <Text 
                      style={styleSheet.termsLink}
                      onPress={() => setTermsModalVisible(true)}
                    >
                      Terms and Conditions
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styleSheet.signUpButton, 
                (loading || !acceptedTerms) && styleSheet.signUpButtonDisabled
              ]}
              onPress={handleSignUp}
              disabled={loading || !acceptedTerms}
              activeOpacity={0.8}
            >
              <Text 
                style={styleSheet.signUpButtonText}
                numberOfLines={1}
              >
                {loading ? 'Signing Up...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <View style={styleSheet.divider}>
              <View style={styleSheet.dividerLine} />
            </View>

            <View style={styleSheet.loginContainer}>
              <TouchableOpacity 
                style={styleSheet.loginButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.8}
              >
                <Text style={styleSheet.loginButtonText}>Already have an account?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styleSheet.modalOverlay}>
          <View style={styleSheet.termsModalContent}>
            <View style={styleSheet.termsModalHeader}>
              <Text style={styleSheet.termsModalTitle}>Terms and Conditions</Text>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                style={styleSheet.closeButton}
              >
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styleSheet.termsModalBody} showsVerticalScrollIndicator={true}>
              <Text style={styleSheet.termsSectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styleSheet.termsContent}>
                By accessing and using PawSafety, you accept and agree to be bound by the terms and provision of this agreement.
              </Text>

              <Text style={styleSheet.termsSectionTitle}>2. Use License</Text>
              <Text style={styleSheet.termsContent}>
                Permission is granted to temporarily use PawSafety for personal, non-commercial purposes only. This is the grant of a license, not a transfer of title, and under this license you may not:
                {'\n\n'}• Modify or copy the materials
                {'\n'}• Use the materials for any commercial purpose
                {'\n'}• Attempt to decompile or reverse engineer any software contained in PawSafety
                {'\n'}• Remove any copyright or other proprietary notations from the materials
              </Text>

              <Text style={styleSheet.termsSectionTitle}>3. User Accounts</Text>
              <Text style={styleSheet.termsContent}>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to:
                {'\n\n'}• Provide accurate and complete information when creating an account
                {'\n'}• Keep your password secure and confidential
                {'\n'}• Notify us immediately of any unauthorized use of your account
                {'\n'}• Be responsible for all activities that occur under your account
              </Text>

              <Text style={styleSheet.termsSectionTitle}>4. Pet Reports and Information</Text>
              <Text style={styleSheet.termsContent}>
                When submitting reports about pets or stray animals:
                {'\n\n'}• You must provide accurate and truthful information
                {'\n'}• You are responsible for the content you submit
                {'\n'}• False or misleading information may result in account suspension
                {'\n'}• You grant PawSafety the right to use your submitted content for the app's purposes
              </Text>

              <Text style={styleSheet.termsSectionTitle}>5. Privacy</Text>
              <Text style={styleSheet.termsContent}>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices regarding the collection and use of your personal information.
              </Text>

              <Text style={styleSheet.termsSectionTitle}>6. Prohibited Uses</Text>
              <Text style={styleSheet.termsContent}>
                You may not use PawSafety:
                {'\n\n'}• In any way that violates any applicable law or regulation
                {'\n'}• To transmit any malicious code or viruses
                {'\n'}• To impersonate or attempt to impersonate others
                {'\n'}• To engage in any harmful, threatening, or abusive behavior
                {'\n'}• To spam or harass other users
              </Text>

              <Text style={styleSheet.termsSectionTitle}>7. Limitation of Liability</Text>
              <Text style={styleSheet.termsContent}>
                PawSafety and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
              </Text>

              <Text style={styleSheet.termsSectionTitle}>8. Modifications</Text>
              <Text style={styleSheet.termsContent}>
                PawSafety reserves the right to modify or replace these Terms at any time. If a revision is material, we will provide notice prior to any new terms taking effect.
              </Text>

              <Text style={styleSheet.termsSectionTitle}>9. Contact Information</Text>
              <Text style={styleSheet.termsContent}>
                If you have any questions about these Terms, please contact us through the app's support features.
              </Text>

              <Text style={styleSheet.termsLastUpdated}>
                Last updated: {new Date().toLocaleDateString()}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styleSheet.termsAcceptButton}
              onPress={() => {
                setAcceptedTerms(true);
                setTermsModalVisible(false);
              }}
            >
              <Text style={styleSheet.termsAcceptButtonText}>Accept Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styleSheet.modalOverlay}>
          <View style={styleSheet.modalContent}>
            <View style={styleSheet.modalHeader}>
              <Text style={styleSheet.successIcon}>✅</Text>
              <Text style={styleSheet.modalTitle}>Account Created!</Text>
            </View>
            
            <View style={styleSheet.modalBody}>
              {emailVerificationSent ? (
                <>
                  <Text style={styleSheet.modalMessage}>
                    Your PawSafety account has been created successfully!
                  </Text>
                  <Text style={styleSheet.verificationMessage}>
                    📧 We've sent a verification email to:
                  </Text>
                  <Text style={styleSheet.emailText}>{email}</Text>
                  <Text style={styleSheet.verificationInstructions}>
                    Please check your email and click the verification link before signing in.
                  </Text>
                  <Text style={styleSheet.spamFolderReminder}>
                    📁 <Text style={styleSheet.spamFolderHighlight}>Please check your spam/junk folder</Text> if you don't see the email in your inbox.
                  </Text>
                  <TouchableOpacity 
                    style={[styleSheet.resendButton, !canResend && styleSheet.resendButtonDisabled]}
                    onPress={resendVerificationEmail}
                    disabled={!canResend}
                  >
                    <Text style={[styleSheet.resendButtonText, !canResend && styleSheet.resendButtonTextDisabled]}>
                      {canResend 
                        ? 'Resend Verification Email' 
                        : `Resend in ${resendCooldown}s`
                      }
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styleSheet.modalMessage}>
                  Your PawSafety account has been successfully created. You can now sign in with your credentials.
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styleSheet.modalButton}
              onPress={handleSuccessModalClose}
            >
              <Text style={styleSheet.modalButtonText}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (isSmallDevice, isTablet, wp, hp, COLORS, facebookBlue) => StyleSheet.create({
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
    paddingHorizontal: isSmallDevice ? SPACING.lg : SPACING.xl,
    paddingVertical: SPACING.xl,
    minHeight: hp(100),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? hp(6) : hp(8),
  },
  logoImage: {
    width: wp(isSmallDevice ? 25 : isTablet ? 18 : 30),
    height: wp(isSmallDevice ? 25 : isTablet ? 18 : 30),
    marginBottom: SPACING.md,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: isSmallDevice ? 32 : 40,
    fontFamily: FONTS.family,
    fontWeight: '700',
    color: '#1877F2',
    letterSpacing: -0.5,
  },
  formContainer: {
    width: '100%',
    maxWidth: wp(90),
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONTS.family,
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: '#F5F6F7',
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.family,
    borderWidth: 1,
    borderColor: '#DDDFE2',
    color: '#1C1E21',
    height: 50,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  signUpButton: {
    backgroundColor: facebookBlue,
    borderRadius: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    height: 50,
    flexDirection: 'row',
    elevation: 0,
    shadowOpacity: 0,
  },
  signUpButtonDisabled: {
    backgroundColor: '#BCC0C4',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FONTS.family,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DADDE1',
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  loginButton: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.family,
    fontWeight: '700',
    textAlign: 'center',
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
    backgroundColor: '#F5F6F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDFE2',
    height: 50,
    justifyContent: 'space-between',
    paddingRight: SPACING.xs,
  },
  passwordInput: {
    flex: 1,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: 0,
    fontSize: 16,
    fontFamily: FONTS.family,
    color: '#1C1E21',
    textAlignVertical: 'center',
    includeFontPadding: false,
    height: '100%',
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
  termsContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDDFE2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: facebookBlue,
    borderColor: facebookBlue,
  },
  termsTextContainer: {
    flex: 1,
    flexWrap: 'wrap',
  },
  termsText: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: '#1C1E21',
    lineHeight: 20,
  },
  termsLink: {
    color: facebookBlue,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsModalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xlarge,
    width: '90%',
    maxWidth: 500,
    maxHeight: hp(80),
    ...SHADOWS.heavy,
  },
  termsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mediumBlue,
  },
  termsModalTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkPurple,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.md,
  },
  termsModalBody: {
    padding: SPACING.lg,
    maxHeight: hp(60),
  },
  termsSectionTitle: {
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkPurple,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  termsContent: {
    fontSize: FONTS.sizes.small,
    fontFamily: FONTS.family,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  termsLastUpdated: {
    fontSize: FONTS.sizes.xsmall,
    fontFamily: FONTS.family,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  termsAcceptButton: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.medium,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
  },
  termsAcceptButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.family,
    fontWeight: FONTS.weights.bold,
  },
});

export default SignUpScreen; 