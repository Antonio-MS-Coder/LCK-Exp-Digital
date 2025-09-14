# Video Hosting Guide for LCK Experience Digital

## Recommended Video Hosting Options (Cheapest to Most Expensive)

### 1. **Firebase Storage** (Most Recommended) 💰
**Cost**: ~$5-20/month for typical conference usage
- **Free tier**: 5GB storage, 1GB/day downloads
- **Paid**: $0.026/GB storage, $0.12/GB bandwidth
- **Pros**: Very cheap, integrates with Firebase Auth, good CDN
- **Cons**: No built-in video player, basic analytics

**Setup:**
```javascript
// Replace video URLs in conference.js
videoUrl: 'https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT.appspot.com/o/videos%2Fsession1.mp4?alt=media'
```

### 2. **Cloudinary** (Good Balance) 💰💰
**Cost**: ~$89/month (Plus plan)
- **Free tier**: 25GB bandwidth/month
- **Pros**: Auto-optimization, good player, transformations
- **Cons**: Bandwidth limits on free tier

### 3. **Vimeo** (Professional) 💰💰💰
**Cost**: $20-75/month
- **Starter**: $20/month (good for your needs)
- **Pros**: Professional player, privacy controls, analytics
- **Cons**: More expensive than Firebase

**Setup:**
```javascript
// Use Vimeo embed URLs in conference.js
videoUrl: 'https://player.vimeo.com/video/YOUR_VIDEO_ID?h=HASH&badge=0&autopause=0&player_id=0&app_id=58479'
```

### 4. **YouTube (Unlisted)** (Free but Limited) 🆓
**Cost**: Free
- **Pros**: Completely free, reliable
- **Cons**: YouTube branding, less control, ads might appear

## Quick Setup with Firebase Storage

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create new project "lck-experience"
3. Go to Storage section
4. Click "Get Started"

### Step 2: Upload Videos
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init storage

# Upload videos manually via console or CLI
```

### Step 3: Set Storage Rules
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{video} {
      // Allow read to everyone (public videos)
      allow read: if true;
      // Only allow write from console
      allow write: if false;
    }
  }
}
```

### Step 4: Update conference.js
```javascript
const videoLibrary = {
    day1: [
        {
            sessionId: 'opening-day1',
            title: 'Apertura del Evento',
            speaker: 'LCK Experience Team',
            videoUrl: 'YOUR_FIREBASE_VIDEO_URL',
            duration: '45 min'
        }
    ]
};
```

## Using HTML5 Video Player (for Firebase/Cloudinary)

Update conference.html to use video tag instead of iframe:

```html
<!-- Replace iframe with video player -->
<video
    id="conferenceStream"
    controls
    controlsList="nodownload"
    style="width: 100%; height: 100%;">
    <source src="" type="video/mp4">
</video>
```

Then in conference.js:
```javascript
function loadVideo(day, index) {
    const videos = videoLibrary[day];
    if (videos && videos[index]) {
        const video = videos[index];
        const videoPlayer = document.getElementById('conferenceStream');

        // For direct video files (Firebase/Cloudinary)
        videoPlayer.src = video.videoUrl;
        videoPlayer.load();
    }
}
```

## Protecting Videos (Optional)

### Option 1: Signed URLs (Firebase)
```javascript
// Generate time-limited URLs server-side
const signedUrl = await getSignedUrl(videoFile, {
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
});
```

### Option 2: Domain Restriction (Vimeo)
- Set domain whitelist in Vimeo privacy settings
- Only allows playback from your domain

## Cost Estimation

For 10 hours of conference content (5GB total):
- **Firebase**: ~$5-10/month (1000 views)
- **Cloudinary**: $89/month (includes optimization)
- **Vimeo Starter**: $20/month (unlimited bandwidth)

## Recommendation

**For your use case, I recommend Firebase Storage because:**
1. Very cost-effective (~$5-10/month)
2. Pay only for what you use
3. Good global CDN
4. Can implement download protection
5. Scales automatically

**Alternative: If you want a more professional setup with less coding, use Vimeo Starter ($20/month)**