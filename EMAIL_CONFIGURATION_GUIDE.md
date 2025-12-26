# Email Configuration Guide - Change Sender Name to "Pawsafety"

## Overview
This guide explains how to change the email sender name from `noreply@capstone-16109.firebaseapp.com` to **"Pawsafety"** for email verification and OTP emails.

## Method 1: Firebase Console (Recommended - Easiest)

### Steps to Change Email Sender Name:

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Select your project: `capstone-16109`

2. **Access Authentication Settings**
   - Click on **Authentication** in the left sidebar
   - Click on the **Templates** tab

3. **Edit Email Verification Template**
   - Find **Email address verification** template
   - Click on it to edit

4. **Customize Sender Name**
   - In the template editor, you'll see options for:
     - **Sender name**: Change this to `Pawsafety`
     - **Sender email**: This will remain as `noreply@capstone-16109.firebaseapp.com` (cannot be changed without custom domain)
     - **Reply-to email**: You can optionally set this to a support email

5. **Customize Email Content (Optional)**
   - You can also customize the email subject and body
   - Recommended subject: `Verify your Pawsafety account`
   - You can add your logo and branding

6. **Save Changes**
   - Click **Save** to apply changes

### Note:
- The sender email address (`noreply@capstone-16109.firebaseapp.com`) cannot be changed without setting up a custom domain
- The **sender name** (display name) can be changed to "Pawsafety" - this is what users will see in their email client
- Changes take effect immediately for new emails

---

## Method 2: Custom Domain (Advanced - For Professional Email Address)

If you want emails to come from `noreply@pawsafety.com` or `support@pawsafety.com`, you need to:

1. **Verify a Custom Domain in Firebase**
   - Go to **Authentication > Settings > Authorized domains**
   - Add your custom domain (e.g., `pawsafety.com`)
   - Follow DNS verification steps

2. **Configure Email Sender**
   - After domain verification, you can use custom email addresses
   - This requires domain ownership and DNS configuration

---

## Method 3: Cloud Function for Custom Emails (Most Control)

If you need full control over email sending, you can create a Cloud Function that sends emails using a service like:
- SendGrid
- Mailgun
- AWS SES
- Nodemailer with SMTP

This approach allows you to:
- Use any sender name and email address
- Fully customize email templates
- Add branding, logos, and styling
- Track email delivery and opens

---

## Current Implementation

Your app currently uses Firebase's built-in `sendEmailVerification()` function:
- **Location**: `Pawsafety/screens/SignUpScreen.js` (line 149)
- **Location**: `Pawsafety/screens/LoginScreen.js` (line 242)

These calls use Firebase's default email templates, which can be customized in the Firebase Console.

---

## Quick Fix (Immediate)

**To change the sender name to "Pawsafety" right now:**

1. Go to: https://console.firebase.google.com/project/capstone-16109/authentication/emails
2. Click on **Email address verification** template
3. Change **Sender name** to: `Pawsafety`
4. Click **Save**

**Result**: Users will see "Pawsafety" as the sender name instead of "noreply@capstone-16109.firebaseapp.com"

---

## Testing

After making changes:
1. Create a test account or resend verification email
2. Check the email inbox
3. Verify the sender name shows as "Pawsafety"

---

## Additional Email Templates to Update

While you're in the Templates section, consider customizing:
- **Password reset** (if implemented)
- **Email change verification**
- **Email address change**

All should use "Pawsafety" as the sender name for consistency.

