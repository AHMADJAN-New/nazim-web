// Run this in browser console to check for blocking patterns
console.log('=== DevTools Request Blocking Check ===');

// Check if request blocking is enabled
if (window.chrome && chrome.devtools) {
  console.log('⚠️ DevTools detected - check Network tab for request blocking');
} else {
  console.log('✅ DevTools not detected or not blocking');
}

// Instructions
console.log('\n📝 To disable request blocking:');
console.log('1. Open DevTools (F12)');
console.log('2. Go to Network tab');
console.log('3. Look for "Request blocking" icon (circle with slash)');
console.log('4. Click it and remove all patterns');
console.log('5. Uncheck "Disable cache"');
console.log('6. Set Throttling to "No throttling"');
console.log('7. Refresh page (Ctrl+Shift+R)');
console.log('\n🔧 Alternative: Open new Incognito window (Ctrl+Shift+N) without extensions');
