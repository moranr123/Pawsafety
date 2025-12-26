# Debug: Posts Being Auto-Deleted When Reported

## Current Symptoms
- User A creates a post
- User B reports the post
- **Post gets automatically deleted from User A's feed**
- **Modal pops up saying the post was deleted**

## This Should NOT Happen!

### What SHOULD Happen When User B Reports
1. ✅ A document is created in `post_reports` collection
2. ✅ Post is hidden **locally** for User B only (AsyncStorage)
3. ✅ Post remains in Firestore with NO changes
4. ✅ Post remains visible to User A and everyone else
5. ❌ NO modal should appear
6. ❌ NO deletion should occur

### What Could Be Causing This

#### 1. Check Firebase Console Logs
Go to: https://console.firebase.google.com/project/capstone-16109/functions/logs

Look for any function executions when the post is reported. Check for:
- Any functions triggering on `post_reports` creation
- Any errors or warnings
- Any function that updates/deletes posts

#### 2. Check Firestore Database
Go to: https://console.firebase.google.com/project/capstone-16109/firestore/data

When User B reports the post:
1. Find the post document in the `posts` collection
2. Check if the post has:
   - `deleted: true` field
   - `deletedBy` field
   - `deletedAt` timestamp
3. Check the `post_reports` collection for the new report

#### 3. Check if There Are Old Functions Still Deployed

Run in terminal:
```bash
firebase functions:list
```

Make sure there are NO functions with these names:
- ❌ `onPostReportCreated`
- ❌ `onPostWithReportDeleted`
- ❌ Any function that mentions "post" and "report"

#### 4. Check Firestore Security Rules

The rules might be automatically deleting posts. Check:
```
firebase firestore:rules list
```

## Debugging Steps

### Step 1: Enable Console Logging
In `Pawsafety/components/PostCard.js`, the logging is already enabled. Check your React Native console for these messages when User B reports:

```
📝 Creating report for post: [postId] - Post should NOT be deleted
✅ Report created: [reportId] - Post should still exist in Firestore
✅ Post reported successfully. It will remain visible until admin reviews it.
✅ Post hidden locally for reporter (not deleted from Firestore): [postId]
```

### Step 2: Check Firestore Database After Reporting
1. User B reports the post
2. **Immediately** go to Firebase Console
3. Check the `posts/[postId]` document
4. Is `deleted: true`? If YES, something is setting it!
5. Is there a `deletedBy` field? What does it say?

### Step 3: Check Firebase Functions Logs
1. User B reports the post
2. Go to Firebase Console > Functions > Logs
3. Look for any function executions
4. Are any functions running on the `post_reports` collection?

### Step 4: Check Mobile App Logs
When User B reports the post, check the React Native debugger console for:
- Any errors
- The console.log messages from PostCard.js
- Any unexpected function calls

## Files to Check

### 1. `Pawsafety/components/PostCard.js`
- Lines 1686-1718: Report submission code
- Should ONLY create a report document and hide locally
- Should NOT modify the post document

### 2. `superadmin-dashboard/functions/index.js`
- Should have NO functions that trigger on post_reports
- Should have NO functions that auto-delete posts

### 3. Firebase Console
- Check deployed functions
- Check Firestore Security Rules
- Check function logs

## Expected vs Actual

### Expected Behavior
```
User B clicks Report
↓
Report document created in post_reports
↓
Post hidden locally for User B (AsyncStorage)
↓
Post remains in Firestore unchanged
↓
User A sees their post normally
↓
No modals, no deletion
```

### Actual Behavior (BUG)
```
User B clicks Report
↓
Report document created
↓
??? Something deletes the post ???
↓
Post disappears from User A's feed
↓
Modal appears saying post was deleted
```

## Next Steps

1. **Check Firebase Console Logs** - What functions are running?
2. **Check Firestore Database** - Is the post actually being marked as `deleted: true`?
3. **Check if old functions are deployed** - Run `firebase functions:list`
4. **Check React Native logs** - What messages appear when reporting?

## Possible Causes

### Cause 1: Old Cloud Function Still Deployed
- An old version of `onPostReportCreated` or `onPostWithReportDeleted` is still running
- These functions would delete posts when reported
- **Solution**: Delete these functions completely

### Cause 2: Firestore Security Rules
- Rules might be automatically setting `deleted: true` on reported posts
- **Solution**: Check and update security rules

### Cause 3: Hidden Code Path
- There might be code somewhere that deletes posts on report
- **Solution**: Search entire codebase for post deletion logic

### Cause 4: Frontend Bug
- The post might not actually be deleted, just hidden incorrectly
- The modal might be appearing erroneously
- **Solution**: Check the filtering logic in HomeTabScreen.js

## How to Fix

Once we identify the cause, the fix will be:

1. **If it's a Cloud Function**: Delete the function
2. **If it's in mobile app code**: Remove the deletion logic
3. **If it's security rules**: Update the rules
4. **If it's a filtering bug**: Fix the filter logic

## Test After Fix

1. User A creates a post
2. User B reports the post
3. **Expected**:
   - Post is hidden for User B only
   - Post remains visible to User A
   - No modal appears
   - Post document in Firestore is unchanged
   - Only `post_reports` collection has a new document

