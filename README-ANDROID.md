# ProChess Android build

This Android project wraps the supplied HTML game using WebViewAssetLoader at `https://appassets.androidplatform.net/assets/index.html` and requests camera/microphone access only for the trusted app asset origin. It is an initial debug build, not a production-ready video-call app.

## Upload
Upload all folders and files from this ZIP to the root of your private GitHub repository, preserving directories, including `.github/workflows/build.yml`. The original HTML/CSS/JS game is in `app/src/main/assets/`.

## Build
GitHub repository -> Actions -> Build ProChess Android APK -> Run workflow. After completion download `ProChess-debug-apk` artifact and extract `app-debug.apk`.

## IMPORTANT: outstanding integration work
- Firebase Google `signInWithRedirect` may fail in embedded WebView. Replace with a supported Android authentication flow (e.g. native Firebase Auth + secure bridge or browser/Custom Tabs) before relying on Google login.
- Firebase Auth authorized domains and redirect handling need correct production setup. WebViewAssetLoader origin is NOT your hosted Firebase auth domain.
- WebRTC needs working signaling and reliable TURN credentials; camera/mic permission support does not guarantee calls connect. Test on two phones over different networks, and handle audio focus, routing, mute and lifecycle.
- Original project references missing `royalpass.html` and missing `default.png`. A generic placeholder default.png was generated. `royalpass.html` remains missing.
- The original game contains external CDN scripts and Firebase imports requiring network access.
- Debug APK is not signed for Play Store distribution. Create a release signing strategy later.
- Review Firebase Realtime Database rules and never commit service-account keys or TURN secrets.
