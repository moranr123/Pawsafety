/**
 * Input validation utilities for security
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, message?: string}} - Validation result
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { 
      valid: false, 
      message: 'Password must be at least 8 characters long' 
    };
  }

  // Check for at least one uppercase, one lowercase, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return { 
      valid: false, 
      message: 'Password must contain at least:\n• One uppercase letter\n• One lowercase letter\n• One number' 
    };
  }

  return { valid: true };
};

/**
 * Validates name (2-50 characters, letters and spaces only)
 * @param {string} name - Name to validate
 * @returns {{valid: boolean, message?: string}} - Validation result
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Name is required' };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, message: 'Name must be less than 50 characters' };
  }

  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { valid: true };
};

/**
 * Sanitizes text input to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validates phone number (optional, basic format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid or empty
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') return true; // Optional field
  
  // Basic phone validation (digits, spaces, dashes, parentheses, plus)
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone.trim());
};

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
export const validateURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Validates file type for uploads
 * @param {string} mimeType - MIME type to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} - True if valid
 */
export const validateFileType = (mimeType, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']) => {
  if (!mimeType) return false;
  return allowedTypes.includes(mimeType.toLowerCase());
};

/**
 * Validates file size
 * @param {number} sizeInBytes - File size in bytes
 * @param {number} maxSizeInMB - Maximum size in MB (default: 5MB)
 * @returns {boolean} - True if valid
 */
export const validateFileSize = (sizeInBytes, maxSizeInMB = 5) => {
  if (!sizeInBytes || typeof sizeInBytes !== 'number') return false;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
};

