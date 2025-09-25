# Troubleshooting Guide - Idle Cultivation Game

This guide helps you resolve common issues when loading and playing Idle Cultivation Game.

## Table of Contents
- [Game Won't Load](#game-wont-load)
- [Blank/Black Screen](#blankblack-screen)
- [Character Creation Issues](#character-creation-issues)
- [Save Data Problems](#save-data-problems)
- [Performance Issues](#performance-issues)
- [Safe Mode](#safe-mode)
- [Browser Compatibility](#browser-compatibility)

---

## Game Won't Load

### Symptom
The game page loads but stays on the loading screen indefinitely or shows an error.

### Solutions

1. **Refresh the Page**
   - Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac) to hard refresh
   - This clears the browser cache and reloads all files

2. **Check Your Internet Connection** (if playing online)
   - Ensure you have a stable internet connection
   - Try accessing other websites to verify connectivity

3. **Clear Browser Cache**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Develop → Empty Caches

4. **Try a Different Browser**
   - Recommended browsers: Chrome, Firefox, Safari, Edge
   - Ensure your browser is up to date

---

## Blank/Black Screen

### Symptom
The page loads but shows only a blank or black screen.

### Solutions

1. **Wait for Loading**
   - The game may still be loading. Give it 10-15 seconds
   - Look for a loading indicator or progress bar

2. **Check Browser Console**
   - Press `F12` to open Developer Tools
   - Go to the Console tab
   - Look for any red error messages
   - Take a screenshot and report the errors

3. **Disable Browser Extensions**
   - Ad blockers or script blockers may interfere
   - Try disabling extensions one by one
   - Test in Incognito/Private mode

4. **Clear LocalStorage**
   - Open Developer Tools (`F12`)
   - Go to Application/Storage tab
   - Find LocalStorage → Your domain
   - Right-click and select "Clear"
   - Refresh the page

---

## Character Creation Issues

### Symptom
Cannot select character options or the "Begin Cultivation" button won't activate.

### Solutions

1. **Complete All Selections**
   - You must choose one option from each category:
     - Origin (Dust Road Orphan, Ink Pavilion Disciple, etc.)
     - Vow (Protect the Small, Pursue the Hidden Law, etc.)
     - Mark of Fate (Thunder Whisper, Frostbrand Scar, etc.)
   - The button becomes active only when all three are selected

2. **Visual Feedback**
   - Selected options should have a highlighted border or different appearance
   - If selections don't appear to work, try clicking them again

3. **Refresh and Retry**
   - If the button remains disabled despite all selections:
     - Hard refresh the page (`Ctrl+F5`)
     - Make your selections again

4. **Clear Old Save Data**
   - Old character data may be conflicting:
     - Open Developer Tools (`F12`)
     - Application → LocalStorage
     - Delete items starting with `idleCultivation_`
     - Refresh the page

---

## Save Data Problems

### Symptom
Game doesn't save progress, or loads with wrong/corrupted data.

### Common Issues & Fixes

### Game Won't Save

1. **Check LocalStorage Permissions**
   - Some browsers block LocalStorage in private/incognito mode
   - Ensure you're not in private browsing
   - Check if third-party cookies are blocked

2. **Storage Quota**
   - LocalStorage has a size limit (~5-10MB)
   - Older saves may exceed this
   - Solution: Export save → Clear → Import save

3. **Manual Save**
   - The game auto-saves, but you can force a save:
   - Open console (`F12`)
   - Type: `game.gameState.save()`
   - Press Enter

### Corrupted Save Data

1. **Automatic Recovery**
   - The game detects corruption automatically
   - It will attempt to recover or offer options
   - Follow the on-screen prompts

2. **Manual Recovery**
   - Open Developer Tools (`F12`)
   - Console tab
   - Type: `localStorage.getItem('idleCultivation_saveData')`
   - Copy the output (your save data)
   - Save it to a text file as backup

3. **Clear and Restart**
   - Last resort: Clear all save data
   - Open Developer Tools → Application → LocalStorage
   - Delete all `idleCultivation_*` items
   - Refresh page for a fresh start

### Save Won't Load

1. **Version Mismatch**
   - Old saves may not work with new versions
   - The game attempts automatic migration
   - If migration fails, you may need to start fresh

2. **Force Load**
   - Open console (`F12`)
   - Type: `game.gameState.load()`
   - Check for error messages

---

## Performance Issues

### Symptom
Game runs slowly, lags, or freezes.

### Solutions

1. **Close Other Tabs**
   - Browser games use CPU/memory
   - Close unnecessary tabs and applications

2. **Disable Animations** (if option available)
   - Reduces visual effects
   - Improves performance on slower devices

3. **Lower Graphics Quality** (if option available)
   - Settings → Graphics → Low
   - Reduces particle effects and animations

4. **Update Your Browser**
   - Older browsers may perform poorly
   - Update to the latest version

5. **Hardware Limitations**
   - Minimum requirements:
     - Modern browser (last 2 versions)
     - 4GB RAM recommended
     - Stable internet connection (if online)

6. **Long Session Issues**
   - If game slows down after hours of play:
   - Save your game
   - Refresh the page
   - This clears memory leaks

---

## Safe Mode

### What is Safe Mode?

Safe Mode is a minimal game mode that activates when the game fails to load normally after multiple attempts. It provides basic functionality while helping you recover.

### When Safe Mode Activates

- Game fails to load 3 times in a row
- Critical system initialization fails
- Severe corruption detected

### What Safe Mode Provides

- ✅ Basic cultivation mechanics
- ✅ Simple progression system
- ✅ Manual save/load functionality
- ✅ Recovery options
- ❌ Full UI and advanced features disabled

### How to Use Safe Mode

1. **When Safe Mode Activates**
   - You'll see a simplified interface
   - Options to restart normally or continue in Safe Mode

2. **Restart Normally**
   - Attempts to reload the full game
   - Choose this if the issue was temporary

3. **Continue in Safe Mode**
   - Play with basic features
   - Your progress is saved safely
   - Exit Safe Mode later when ready

4. **Exit Safe Mode**
   - Save your progress
   - Click "Try Normal Mode"
   - Or refresh the page after saving

### If Safe Mode Fails

If even Safe Mode won't load, you'll see an emergency screen with options to:
- Reload the page
- Clear save data and reload
- View error details

---

## Browser Compatibility

### Fully Supported Browsers

- ✅ **Chrome** (last 2 versions)
- ✅ **Firefox** (last 2 versions)
- ✅ **Safari** (last 2 versions)
- ✅ **Edge** (last 2 versions)

### Mobile Browsers

- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)
- ⚠️ Performance may vary on older devices

### Not Recommended

- ❌ Internet Explorer (any version)
- ❌ Very old browser versions (3+ years old)

### Browser-Specific Issues

**Chrome:**
- If game won't load, try disabling hardware acceleration:
  - Settings → Advanced → System → Turn off hardware acceleration

**Firefox:**
- Ensure Enhanced Tracking Protection isn't blocking game:
  - Click shield icon in address bar → Turn off for this site

**Safari:**
- Check Preferences → Privacy → Prevent cross-site tracking
  - May need to disable for the game to work

---

## Getting More Help

### Check the Console

1. Open Developer Tools (`F12`)
2. Go to Console tab
3. Look for error messages in red
4. Take a screenshot of any errors

### Report Issues

When reporting a problem, include:
- Browser name and version
- Operating system
- What you were doing when the issue occurred
- Error messages from console (if any)
- Screenshots if possible

### Common Error Messages

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| "ModuleManager is required" | Core system missing | Hard refresh (`Ctrl+F5`) |
| "Failed to load module" | Script loading failed | Check internet, refresh |
| "localStorage is not available" | Storage blocked | Exit private mode, check permissions |
| "Corrupted save data" | Save file damaged | Use recovery options |
| "Safe Mode activated" | Multiple load failures | Follow Safe Mode instructions |

---

## Prevention Tips

### Keep Your Game Healthy

1. **Regular Saves**
   - Game auto-saves, but you can force save
   - Export save data periodically as backup

2. **Browser Maintenance**
   - Keep browser updated
   - Clear cache monthly
   - Don't block JavaScript

3. **Avoid Issues**
   - Don't close during save operations
   - Don't modify localStorage directly
   - Don't use multiple tabs for the same game

4. **Before Updates**
   - Export your save data
   - Update browser
   - Clear cache after update

---

## Quick Reference

### Fast Fixes Checklist

- [ ] Hard refresh (`Ctrl+F5` or `Cmd+Shift+R`)
- [ ] Wait 15 seconds for loading
- [ ] Try incognito/private mode
- [ ] Clear browser cache
- [ ] Disable browser extensions
- [ ] Try different browser
- [ ] Clear localStorage
- [ ] Check console for errors

### Emergency Recovery

If nothing else works:
1. Export save data (if accessible)
2. Clear all game data from localStorage
3. Hard refresh the page
4. Import save data (if you exported it)

---

**Last Updated:** 2025-09-23
**Version:** 1.0.0

For technical documentation, see [LOADING_ARCHITECTURE.md](./LOADING_ARCHITECTURE.md)