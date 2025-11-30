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
import { getAuthErrorMessage } from '../utils/authErrors';

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
                  const { title, message } = getAuthErrorMessage(error);
                  if (error.code === 'auth/too-many-requests') {
                    setResendCooldown(300); // 5 minute cooldown for rate limiting
                  }
                  Alert.alert(title, message);
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
        await createUserDocument(user);
      }
      
      // Navigation will be handled by auth state change
    } catch (error) {
      const { title, message } = getAuthErrorMessage(error);
      Alert.alert(title, message);
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

  // Facebook blue color
  const facebookBlue = '#1877F2';
  const facebookBlueDark = '#166FE5';

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
      paddingHorizontal: isSmallDevice ? SPACING.lg : SPACING.xl,
      paddingVertical: SPACING.xl,
      minHeight: hp(100),
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: isSmallDevice ? hp(8) : hp(10),
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
    loginButton: {
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
    loginButtonDisabled: {
      backgroundColor: '#BCC0C4',
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontFamily: FONTS.family,
      fontWeight: '700',
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    forgotPasswordContainer: {
      alignItems: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.lg,
    },
    forgotPasswordText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookBlue,
      fontWeight: '500',
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
    signupButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: 8,
      paddingHorizontal: SPACING.lg,
      paddingVertical: 0,
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      marginTop: SPACING.md,
    },
    signupButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '700',
      textAlign: 'center',
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
  }), [COLORS, currentWidth, currentHeight, isSmallDevice, isTablet]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image source={require('../assets/LogoBlue.png')} style={styles.logoImage} />
            <Text style={styles.appName}>PawSafety</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
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
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
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

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text 
                style={styles.loginButtonText}
                numberOfLines={1}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity>
                <Text style={styles.forgotPasswordText}>Forgotten password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.8}
            >
              <Text style={styles.signupButtonText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



export default LoginScreen; 