# Rate Limiting Analysis for PawSafety

## Executive Summary

This document analyzes the PawSafety application to identify where rate limiting should be implemented to prevent abuse, protect resources, and ensure fair usage. The application consists of:
- **Mobile App (React Native/Expo)**: User-facing application
- **Super Admin Dashboard (React Web)**: Administrative interface
- **Firebase Cloud Functions**: Serverless backend functions

---

## Critical Areas Requiring Rate Limiting

### 1. **Authentication & Account Management** 🔐

#### Current State
- Login attempts: No rate limiting (relies on Firebase's built-in protection)
- Sign-up: No rate limiting
- Email verification resend: Basic client-side cooldown (60s, 300s on error)
- Password reset: Not implemented (needs rate limiting when added)

#### Recommended Implementation
**Priority: HIGH**

1. **Login Attempts**
   - **Location**: `Pawsafety/screens/LoginScreen.js` (line 65-146)
   - **Rate Limit**: 5 attempts per 15 minutes per IP/email
   - **Action**: Implement Firebase App Check + custom rate limiting in Cloud Function
   - **Storage**: Firestore collection `rate_limits` with TTL

2. **Sign-Up**
   - **Location**: `Pawsafety/screens/SignUpScreen.js` (line 60-127)
   - **Rate Limit**: 3 accounts per hour per IP
   - **Action**: Track sign-ups by IP address in Firestore
   - **Storage**: Firestore collection `signup_attempts`

3. **Email Verification Resend**
   - **Location**: `Pawsafety/screens/LoginScreen.js` (line 87-108), `SignUpScreen.js` (line 164-186)
   - **Current**: Client-side cooldown exists (60s normal, 300s on error)
   - **Enhancement**: Add server-side validation in Cloud Function
   - **Rate Limit**: 3 resends per hour per email

---

### 2. **Content Creation Operations** 📝

#### Current State
- No rate limiting on any content creation operations
- Users can create unlimited reports, posts, and messages

#### Recommended Implementation
**Priority: HIGH**

1. **Stray Reports**
   - **Location**: `Pawsafety/screens/StrayReportScreen.js` (line 205-258)
   - **Rate Limit**: 10 reports per hour per user
   - **Action**: Track in Firestore `user_rate_limits` collection
   - **Reason**: Prevents spam reports and abuse

2. **Lost Pet Reports**
   - **Location**: `Pawsafety/screens/MyPetsScreen.js` (line 560-620)
   - **Rate Limit**: 5 reports per day per user
   - **Action**: Track in Firestore with daily reset
   - **Reason**: Lost pet reports are more critical, should be limited

3. **Social Posts**
   - **Location**: `Pawsafety/screens/CreatePostScreen.js` (line 219-275)
   - **Rate Limit**: 20 posts per hour per user
   - **Action**: Track post creation timestamps
   - **Reason**: Prevents spam and maintains feed quality

4. **Pet Registration**
   - **Location**: `Pawsafety/screens/RegisterPetScreen.js` (line 402-454)
   - **Rate Limit**: 10 pets per day per user
   - **Action**: Track pet registration timestamps
   - **Reason**: Prevents abuse of pet registration system

5. **Adoption Applications**
   - **Location**: `Pawsafety/screens/tabs/AdoptScreen.js` (line 2340-2367)
   - **Rate Limit**: 5 applications per day per user
   - **Action**: Track application submissions
   - **Reason**: Prevents spam applications and ensures quality

6. **Messages (Direct Chat)**
   - **Location**: `Pawsafety/components/DirectChatModal.js` (line 491-598)
   - **Rate Limit**: 30 messages per minute per user per chat
   - **Action**: Real-time tracking with sliding window
   - **Reason**: Prevents message spam and harassment

7. **Report Chat Messages**
   - **Location**: `Pawsafety/components/ReportChatModal.js` (line 591-706)
   - **Rate Limit**: 20 messages per minute per user per report
   - **Action**: Similar to direct chat
   - **Reason**: Maintains report chat quality

---

### 3. **Social Interactions** 👥

#### Current State
- No rate limiting on friend requests or social actions

#### Recommended Implementation
**Priority: MEDIUM**

1. **Friend Requests**
   - **Location**: 
     - `Pawsafety/screens/AddFriendsScreen.js` (line 368-444)
     - `Pawsafety/screens/ProfileScreen.js` (line 599-704)
   - **Rate Limit**: 20 friend requests per hour per user
   - **Action**: Track friend request creation timestamps
   - **Reason**: Prevents spam friend requests

2. **Post Likes/Shares**
   - **Location**: `Pawsafety/components/PostCard.js`
   - **Rate Limit**: 100 likes per hour per user (if implemented)
   - **Action**: Track interaction timestamps
   - **Reason**: Prevents automated liking/spam

3. **Message Reports**
   - **Location**: `Pawsafety/components/DirectChatModal.js` (line 462-489)
   - **Rate Limit**: 5 reports per hour per user
   - **Action**: Track report submissions
   - **Reason**: Prevents abuse of reporting system

---

### 4. **File Uploads** 📸

#### Current State
- No rate limiting on image uploads
- Images uploaded to Firebase Storage without restrictions

#### Recommended Implementation
**Priority: HIGH**

1. **Image Uploads (General)**
   - **Locations**:
     - `Pawsafety/screens/StrayReportScreen.js` (line 222-229)
     - `Pawsafety/screens/CreatePostScreen.js` (line 228-241)
     - `Pawsafety/components/DirectChatModal.js` (line 628-641)
     - `Pawsafety/components/ReportChatModal.js` (line 628-641)
   - **Rate Limit**: 
     - 50 uploads per hour per user
     - 10MB total per hour per user
   - **Action**: Track upload count and total size in Firestore
   - **Reason**: Prevents storage abuse and excessive bandwidth usage

2. **Storage Quota Enforcement**
   - **Action**: Implement Cloud Function trigger on Storage upload
   - **Check**: User's total storage usage before allowing upload
   - **Limit**: 500MB per user total storage

---

### 5. **Firebase Cloud Functions** ⚡

#### Current State
- Functions have `maxInstances: 10` but no rate limiting
- No protection against abuse

#### Recommended Implementation
**Priority: HIGH**

1. **createAdminUser**
   - **Location**: `superadmin-dashboard/functions/index.js` (line 46-124)
   - **Rate Limit**: 5 admin creations per hour per superadmin
   - **Action**: Track in Firestore before processing
   - **Reason**: Prevents accidental mass admin creation

2. **updateAdminPassword**
   - **Location**: `superadmin-dashboard/functions/index.js` (line 237-292)
   - **Rate Limit**: 10 updates per hour per superadmin
   - **Action**: Track password update attempts
   - **Reason**: Prevents abuse of password reset functionality

3. **deleteAdminUser**
   - **Location**: `superadmin-dashboard/functions/index.js` (line 294-348)
   - **Rate Limit**: 5 deletions per hour per superadmin
   - **Action**: Track deletion attempts
   - **Reason**: Prevents accidental mass deletions

4. **Expo Push Notifications**
   - **Location**: `superadmin-dashboard/functions/index.js` (line 8-43)
   - **Rate Limit**: 1000 notifications per hour per function instance
   - **Action**: Track notification sends
   - **Reason**: Expo API has rate limits, prevent hitting them

---

### 6. **Database Operations** 💾

#### Current State
- No rate limiting on Firestore reads/writes
- Users can make unlimited queries

#### Recommended Implementation
**Priority: MEDIUM**

1. **Firestore Reads**
   - **Rate Limit**: 1000 reads per minute per user (client-side tracking)
   - **Action**: Implement client-side counter with reset
   - **Reason**: Firestore charges per read, prevent excessive costs

2. **Firestore Writes**
   - **Rate Limit**: 500 writes per minute per user
   - **Action**: Track write operations in Firestore
   - **Reason**: Prevent abuse and control costs

---

## Implementation Strategy

### Phase 1: Critical (Immediate)
1. ✅ Authentication rate limiting (login, signup)
2. ✅ Content creation rate limiting (reports, posts)
3. ✅ Message rate limiting
4. ✅ Image upload rate limiting

### Phase 2: Important (Short-term)
1. ✅ Friend request rate limiting
2. ✅ Cloud Functions rate limiting
3. ✅ Database operation tracking

### Phase 3: Enhancement (Long-term)
1. ✅ Advanced analytics and monitoring
2. ✅ Dynamic rate limits based on user behavior
3. ✅ IP-based rate limiting for anonymous operations

---

## Recommended Implementation Approach

### Option 1: Firebase App Check + Custom Rate Limiting (Recommended)
- Use Firebase App Check to verify requests come from legitimate app
- Implement custom rate limiting in Cloud Functions
- Store rate limit data in Firestore with TTL
- **Pros**: Server-side enforcement, secure, scalable
- **Cons**: Requires Cloud Functions setup

### Option 2: Client-Side Rate Limiting (Quick Fix)
- Implement rate limiting in React Native app
- Store limits in AsyncStorage
- **Pros**: Quick to implement, no server changes
- **Cons**: Can be bypassed, not secure

### Option 3: Hybrid Approach (Best Practice)
- Client-side for UX (immediate feedback)
- Server-side for security (enforcement)
- **Pros**: Best user experience + security
- **Cons**: More complex implementation

---

## Rate Limiting Storage Structure

### Firestore Collection: `rate_limits`
```javascript
{
  userId: "user123",
  action: "create_report",
  count: 5,
  windowStart: Timestamp,
  windowEnd: Timestamp,
  lastReset: Timestamp
}
```

### Firestore Collection: `user_rate_limits`
```javascript
{
  userId: "user123",
  reports: {
    count: 3,
    windowStart: Timestamp,
    limit: 10
  },
  posts: {
    count: 15,
    windowStart: Timestamp,
    limit: 20
  },
  messages: {
    count: 25,
    windowStart: Timestamp,
    limit: 30
  }
}
```

---

## Specific File Locations for Implementation

### Mobile App Files to Modify:
1. `Pawsafety/screens/LoginScreen.js` - Login rate limiting
2. `Pawsafety/screens/SignUpScreen.js` - Signup rate limiting
3. `Pawsafety/screens/StrayReportScreen.js` - Report rate limiting
4. `Pawsafety/screens/CreatePostScreen.js` - Post rate limiting
5. `Pawsafety/screens/RegisterPetScreen.js` - Pet registration rate limiting
6. `Pawsafety/screens/tabs/AdoptScreen.js` - Adoption application rate limiting
7. `Pawsafety/components/DirectChatModal.js` - Message rate limiting
8. `Pawsafety/components/ReportChatModal.js` - Report chat rate limiting
9. `Pawsafety/screens/AddFriendsScreen.js` - Friend request rate limiting
10. `Pawsafety/services/firebase.js` - Add rate limiting utility functions

### Cloud Functions Files to Modify:
1. `superadmin-dashboard/functions/index.js` - Add rate limiting middleware
2. Create new file: `superadmin-dashboard/functions/rateLimiter.js` - Rate limiting utilities

---

## Rate Limit Recommendations Summary

| Operation | Rate Limit | Window | Priority |
|-----------|-----------|--------|----------|
| Login Attempts | 5 | 15 minutes | HIGH |
| Sign-Up | 3 | 1 hour | HIGH |
| Email Verification Resend | 3 | 1 hour | MEDIUM |
| Stray Reports | 10 | 1 hour | HIGH |
| Lost Pet Reports | 5 | 1 day | HIGH |
| Social Posts | 20 | 1 hour | HIGH |
| Pet Registration | 10 | 1 day | HIGH |
| Adoption Applications | 5 | 1 day | HIGH |
| Direct Messages | 30 | 1 minute | HIGH |
| Report Chat Messages | 20 | 1 minute | HIGH |
| Friend Requests | 20 | 1 hour | MEDIUM |
| Image Uploads | 50 | 1 hour | HIGH |
| Image Upload Size | 10MB | 1 hour | HIGH |
| Create Admin | 5 | 1 hour | HIGH |
| Update Admin Password | 10 | 1 hour | MEDIUM |
| Delete Admin | 5 | 1 hour | HIGH |

---

## Next Steps

1. **Review and approve** this rate limiting strategy
2. **Create utility functions** for rate limiting checks
3. **Implement Cloud Functions** for server-side enforcement
4. **Add client-side checks** for better UX
5. **Set up monitoring** to track rate limit hits
6. **Test thoroughly** before production deployment

---

## Notes

- Firebase Authentication has built-in rate limiting, but additional layers are recommended
- Consider implementing exponential backoff for rate limit errors
- Provide clear error messages when rate limits are hit
- Log rate limit violations for security monitoring
- Consider different limits for verified vs unverified users
- Implement admin override capabilities for legitimate use cases

