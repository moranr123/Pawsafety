import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db, app } from './firebase';
import { httpsCallable, getFunctions } from 'firebase/functions';

/**
 * Rate Limiting Service
 * Provides client-side rate limiting checks and server-side enforcement
 */

// Rate limit configurations
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMinutes: 15,
    action: 'login_attempt'
  },
  signup: {
    maxAttempts: 3,
    windowMinutes: 60,
    action: 'signup_attempt'
  },
  emailVerification: {
    maxAttempts: 3,
    windowMinutes: 60,
    action: 'email_verification_resend'
  }
};

/**
 * Check rate limit on client side (for UX)
 * @param {string} action - The action being rate limited (e.g., 'login', 'signup')
 * @param {string} identifier - Email or IP address to track
 * @returns {Promise<{allowed: boolean, remainingAttempts: number, resetTime: Date|null}>}
 */
export const checkRateLimit = async (action, identifier) => {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remainingAttempts: Infinity, resetTime: null };
  }

  try {
    // Query recent attempts within the time window
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);
    const windowStartTimestamp = Timestamp.fromDate(windowStart);

    const attemptsRef = collection(db, 'rate_limits');
    // Query by action and identifier, then filter by timestamp in memory
    // This avoids needing a composite index
    const q = query(
      attemptsRef,
      where('action', '==', config.action),
      where('identifier', '==', identifier.toLowerCase())
    );

    const snapshot = await getDocs(q);
    
    // Filter by timestamp in memory and only count FAILED attempts (success = false)
    let attemptCount = 0;
    const timestamps = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only count failed attempts (success === false or undefined)
      if (data.timestamp && data.timestamp >= windowStartTimestamp && data.success === false) {
        attemptCount++;
        timestamps.push(data.timestamp.toDate());
      }
    });

    const remainingAttempts = Math.max(0, config.maxAttempts - attemptCount);
    const allowed = attemptCount < config.maxAttempts;

    // Calculate reset time (oldest attempt + window duration)
    let resetTime = null;
    if (!allowed && timestamps.length > 0) {
      const oldestAttempt = new Date(Math.min(...timestamps.map(t => t.getTime())));
      resetTime = new Date(oldestAttempt.getTime() + config.windowMinutes * 60 * 1000);
    }

    return {
      allowed,
      remainingAttempts,
      resetTime,
      attemptCount
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the action (fail open for better UX)
    return { allowed: true, remainingAttempts: Infinity, resetTime: null };
  }
};

/**
 * Record an attempt in Firestore (for server-side tracking)
 * @param {string} action - The action being rate limited
 * @param {string} identifier - Email or IP address
 * @param {boolean} success - Whether the attempt was successful
 * @returns {Promise<void>}
 */
export const recordAttempt = async (action, identifier, success = false) => {
  const config = RATE_LIMITS[action];
  if (!config) {
    return;
  }

  try {
    await addDoc(collection(db, 'rate_limits'), {
      action: config.action,
      identifier: identifier.toLowerCase(),
      success,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error recording rate limit attempt:', error);
    // Don't throw - rate limiting shouldn't break the app
  }
};

/**
 * Check rate limit via Cloud Function (server-side enforcement)
 * @param {string} action - The action being rate limited
 * @param {string} identifier - Email or IP address
 * @returns {Promise<{allowed: boolean, remainingAttempts: number, resetTime: Date|null}>}
 */
export const checkRateLimitServer = async (action, identifier) => {
  try {
    if (!app) {
      // Firebase not initialized, allow action
      return { allowed: true, remainingAttempts: Infinity, resetTime: null };
    }

    const functions = getFunctions(app);
    const checkRateLimitFn = httpsCallable(functions, 'checkRateLimit');
    
    const result = await checkRateLimitFn({
      action: RATE_LIMITS[action]?.action || action,
      identifier: identifier.toLowerCase()
    });

    return result.data;
  } catch (error) {
    console.error('Error checking rate limit on server:', error);
    // On error, allow the action (fail open)
    return { allowed: true, remainingAttempts: Infinity, resetTime: null };
  }
};

/**
 * Format time remaining until rate limit resets
 * @param {Date} resetTime - The time when rate limit resets
 * @returns {string} - Formatted time string
 */
export const formatTimeRemaining = (resetTime) => {
  if (!resetTime) return '';

  const now = new Date();
  const diff = resetTime - now;

  if (diff <= 0) return '';

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};

/**
 * Reset/clear all failed attempts for a user (called on successful login)
 * @param {string} action - The action being rate limited
 * @param {string} identifier - Email or IP address
 * @returns {Promise<void>}
 */
export const resetFailedAttempts = async (action, identifier) => {
  const config = RATE_LIMITS[action];
  if (!config) {
    return;
  }

  try {
    const attemptsRef = collection(db, 'rate_limits');
    // Query by action and identifier, then filter by success in memory
    // This avoids needing a composite index
    const q = query(
      attemptsRef,
      where('action', '==', config.action),
      where('identifier', '==', identifier.toLowerCase())
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return; // No attempts to clear
    }

    // Filter failed attempts and use batch write to delete them
    const batch = writeBatch(db);
    let hasFailedAttempts = false;
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Only delete failed attempts (success === false or undefined)
      if (data.success === false || data.success === undefined) {
        batch.delete(doc(db, 'rate_limits', docSnap.id));
        hasFailedAttempts = true;
      }
    });

    // Only commit if there are failed attempts to delete
    if (hasFailedAttempts) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
    // Don't throw - resetting attempts shouldn't break the app
  }
};

/**
 * Set up real-time listener for rate limit changes
 * @param {string} action - The action being rate limited
 * @param {string} identifier - Email or IP address
 * @param {Function} callback - Callback function to call when rate limit changes
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToRateLimit = (action, identifier, callback) => {
  const config = RATE_LIMITS[action];
  if (!config) {
    return () => {}; // Return no-op unsubscribe function
  }

  try {
    const attemptsRef = collection(db, 'rate_limits');
    const q = query(
      attemptsRef,
      where('action', '==', config.action),
      where('identifier', '==', identifier.toLowerCase())
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        // Recalculate rate limit when collection changes
        const updatedInfo = await checkRateLimit(action, identifier);
        if (callback) {
          callback(updatedInfo);
        }
      },
      (error) => {
        console.error('Error in rate limit listener:', error);
        // On error, call callback with current check result
        checkRateLimit(action, identifier).then(info => {
          if (callback) callback(info);
        });
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up rate limit listener:', error);
    return () => {}; // Return no-op unsubscribe function
  }
};

export default {
  checkRateLimit,
  recordAttempt,
  checkRateLimitServer,
  formatTimeRemaining,
  subscribeToRateLimit,
  resetFailedAttempts,
  RATE_LIMITS
};

