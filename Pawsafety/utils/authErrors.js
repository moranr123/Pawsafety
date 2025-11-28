/**
 * Firebase Authentication Error Handler
 * Maps Firebase error codes to user-friendly messages
 */

/**
 * Gets a user-friendly error message for Firebase authentication errors
 * @param {Error} error - Firebase error object
 * @returns {{title: string, message: string}} - User-friendly error title and message
 */
export const getAuthErrorMessage = (error) => {
  if (!error || !error.code) {
    return {
      title: 'Error',
      message: 'An unexpected error occurred. Please try again.'
    };
  }

  const errorCode = error.code;

  // Authentication error codes
  const errorMessages = {
    // User not found
    'auth/user-not-found': {
      title: 'Account Not Found',
      message: 'No account found with this email address. Please check your email or sign up for a new account.'
    },
    
    // Wrong password
    'auth/wrong-password': {
      title: 'Incorrect Password',
      message: 'The password you entered is incorrect. Please try again or reset your password.'
    },
    
    // Invalid credentials (newer Firebase versions)
    'auth/invalid-credential': {
      title: 'Invalid Credentials',
      message: 'The email or password you entered is incorrect. Please check your credentials and try again.'
    },
    
    // Invalid email
    'auth/invalid-email': {
      title: 'Invalid Email',
      message: 'Please enter a valid email address.'
    },
    
    // User disabled
    'auth/user-disabled': {
      title: 'Account Disabled',
      message: 'This account has been disabled. Please contact support for assistance.'
    },
    
    // Too many requests
    'auth/too-many-requests': {
      title: 'Too Many Attempts',
      message: 'Too many failed attempts. Please wait a few minutes before trying again.'
    },
    
    // Network error
    'auth/network-request-failed': {
      title: 'Network Error',
      message: 'Please check your internet connection and try again.'
    },
    
    // Operation not allowed
    'auth/operation-not-allowed': {
      title: 'Operation Not Allowed',
      message: 'This operation is not allowed. Please contact support for assistance.'
    },
    
    // Email already in use
    'auth/email-already-in-use': {
      title: 'Email Already Registered',
      message: 'An account with this email address already exists. Please sign in instead or use a different email.'
    },
    
    // Weak password
    'auth/weak-password': {
      title: 'Weak Password',
      message: 'The password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.'
    },
    
    // Invalid password
    'auth/invalid-password': {
      title: 'Invalid Password',
      message: 'The password is invalid or does not meet the requirements. Please try again.'
    },
    
    // Requires recent login
    'auth/requires-recent-login': {
      title: 'Re-authentication Required',
      message: 'For security reasons, please sign out and sign in again before performing this action.'
    },
    
    // Credential already in use
    'auth/credential-already-in-use': {
      title: 'Credential Already in Use',
      message: 'This credential is already associated with another account.'
    },
    
    // Popup closed
    'auth/popup-closed-by-user': {
      title: 'Sign-in Cancelled',
      message: 'The sign-in popup was closed. Please try again.'
    },
    
    // Cancelled popup request
    'auth/cancelled-popup-request': {
      title: 'Sign-in Cancelled',
      message: 'Only one popup request is allowed at a time. Please try again.'
    },
    
    // Account exists with different credential
    'auth/account-exists-with-different-credential': {
      title: 'Account Exists',
      message: 'An account already exists with the same email address but different sign-in credentials.'
    },
    
    // Invalid verification code
    'auth/invalid-verification-code': {
      title: 'Invalid Code',
      message: 'The verification code is invalid or has expired. Please request a new one.'
    },
    
    // Invalid verification ID
    'auth/invalid-verification-id': {
      title: 'Invalid Verification',
      message: 'The verification ID is invalid. Please try again.'
    },
    
    // Missing verification code
    'auth/missing-verification-code': {
      title: 'Missing Code',
      message: 'Please enter the verification code.'
    },
    
    // Missing verification ID
    'auth/missing-verification-id': {
      title: 'Missing Verification',
      message: 'Verification ID is missing. Please try again.'
    },
    
    // Quota exceeded
    'auth/quota-exceeded': {
      title: 'Quota Exceeded',
      message: 'The quota for this operation has been exceeded. Please try again later.'
    },
    
    // App not authorized
    'auth/app-not-authorized': {
      title: 'App Not Authorized',
      message: 'This app is not authorized to use Firebase Authentication. Please contact support.'
    },
    
    // Expired action code
    'auth/expired-action-code': {
      title: 'Link Expired',
      message: 'This link has expired. Please request a new one.'
    },
    
    // Invalid action code
    'auth/invalid-action-code': {
      title: 'Invalid Link',
      message: 'This link is invalid or has already been used.'
    },
    
    // Missing continue URI
    'auth/missing-continue-uri': {
      title: 'Configuration Error',
      message: 'A continue URL must be provided in the request.'
    },
    
    // Missing email
    'auth/missing-email': {
      title: 'Missing Email',
      message: 'Please enter your email address.'
    },
    
    // Missing password
    'auth/missing-password': {
      title: 'Missing Password',
      message: 'Please enter your password.'
    },
    
    // Missing phone number
    'auth/missing-phone-number': {
      title: 'Missing Phone Number',
      message: 'Please enter your phone number.'
    },
    
    // Phone number already exists
    'auth/phone-number-already-exists': {
      title: 'Phone Number Exists',
      message: 'This phone number is already registered. Please use a different number.'
    },
    
    // Session expired
    'auth/session-expired': {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.'
    },
    
    // Unauthorized domain
    'auth/unauthorized-domain': {
      title: 'Unauthorized Domain',
      message: 'This domain is not authorized for Firebase Authentication.'
    },
    
    // User mismatch
    'auth/user-mismatch': {
      title: 'User Mismatch',
      message: 'The provided credentials do not match the signed-in user.'
    },
    
    // User token expired
    'auth/user-token-expired': {
      title: 'Token Expired',
      message: 'Your session has expired. Please sign in again.'
    }
  };

  // Return custom message if available, otherwise use generic message
  if (errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Fallback for unknown error codes
  return {
    title: 'Authentication Error',
    message: error.message || 'An unexpected error occurred. Please try again.'
  };
};

/**
 * Shows an alert with the formatted error message
 * @param {Error} error - Firebase error object
 * @param {Function} Alert - Alert function from react-native
 */
export const showAuthError = (error, Alert) => {
  const { title, message } = getAuthErrorMessage(error);
  Alert.alert(title, message);
};

