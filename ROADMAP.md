# Spoons Android Production Readiness Roadmap

This document outlines the remaining tasks needed to move from local testing to production-ready Android app distribution.

## 🔐 Security & Configuration

### Environment Security
- [ ] **Move sensitive config to environment variables**
  - Extract Firebase API keys from `environment.prod.ts`
  - Extract Telegram bot token from source code
  - Set up build-time environment injection
  - Add proper `.gitignore` rules for sensitive files

### Release Signing
- [ ] **Generate and configure release keystore**
  - Create release keystore (store securely, not in repo)
  - Configure signing in `android/app/build.gradle`
  - Set up automated signing for CI/CD
  - Document keystore backup and recovery process

### Network Security
- [ ] **Add network security configuration**
  - Create `network_security_config.xml`
  - Configure certificate pinning if needed
  - Restrict HTTP traffic on production builds
  - Add domain validation for Firebase endpoints

### Backup Security
- [ ] **Configure proper backup rules**
  - Create `backup_rules.xml` 
  - Exclude sensitive data from Android backups
  - Update `allowBackup` configuration in AndroidManifest.xml

## 📱 App Store Preparation

### Version Management
- [ ] **Automate version management**
  - Sync Android `versionCode`/`versionName` with `package.json`
  - Set up automated version bumping in CI/CD
  - Configure semantic versioning for releases

### App Metadata
- [ ] **Complete app store metadata**
  - Add proper app description and category
  - Create app store screenshots and graphics
  - Add privacy policy URL to manifest
  - Add terms of service URL
  - Prepare Google Play Store listing content

### Icon Optimization
- [ ] **Optimize icons for Android**
  - Create adaptive icon versions
  - Test icons across different Android themes
  - Ensure proper icon sizing for all densities
  - Add notification icons and splash screens

## 📊 Performance & Monitoring

### Bundle Optimization
- [ ] **Address bundle size warnings**
  - Current bundle: 1.95 MB (exceeds 1 MB budget by 949 KB)
  - Implement code splitting for lazy-loaded routes
  - Optimize CommonJS dependencies (`lottie-web`, `dijkstrajs`)
  - Add bundle analysis monitoring

### Crash Reporting
- [ ] **Integrate crash reporting**
  - Set up Firebase Crashlytics
  - Add custom error logging
  - Configure crash reporting for release builds
  - Set up crash monitoring dashboard

### Performance Monitoring
- [ ] **Add performance monitoring**
  - Integrate Firebase Performance Monitoring
  - Set up custom performance traces
  - Monitor app startup time
  - Track critical user journeys

## 🧪 Testing & Quality Assurance

### Device Testing
- [ ] **Comprehensive device testing**
  - Test on multiple Android versions (API 24+)
  - Test on different screen sizes and densities
  - Verify camera and location functionality
  - Test offline functionality and data sync

### Automated Testing
- [ ] **Set up automated testing pipeline**
  - Configure Android instrumentation tests
  - Set up CI/CD pipeline for Android builds
  - Add automated security scanning
  - Set up automated app store upload

## 🚀 Distribution

### Google Play Store
- [ ] **Prepare for Google Play Store submission**
  - Create Google Play Developer account
  - Complete app store review requirements
  - Set up closed testing track
  - Configure app signing by Google Play

### Firebase App Distribution
- [ ] **Set up Firebase App Distribution**
  - Configure distribution groups
  - Set up automated beta distribution
  - Add release notes automation
  - Configure tester feedback collection

## 📋 Development Workflow Improvements

### SASS Migration
- [ ] **Address SASS deprecation warnings**
  - Migrate from `@import` to `@use` syntax
  - Update check-in modal stylesheets
  - Update chip component stylesheets
  - Update build pipeline to handle new syntax

### Documentation
- [ ] **Complete documentation**
  - Document Android build and deployment process
  - Create troubleshooting guide for common Android issues
  - Document security practices and key management
  - Create developer onboarding guide for Android

## Priority Levels

### 🚨 Critical (Required for Store Release)
- Environment security
- Release signing
- App metadata

### ⚠️ High (Recommended before Release)
- Network security
- Performance monitoring
- Device testing

### 📋 Medium (Post-Release Improvements)
- Bundle optimization
- SASS migration
- Advanced monitoring

## Estimated Timeline

- **Critical items**: 1-2 weeks
- **High priority items**: 2-3 weeks  
- **Medium priority items**: Ongoing/post-release

## Notes

This roadmap represents production readiness requirements. The current setup is sufficient for local testing and development.

For immediate Android testing, the app is ready to use with:
```bash
# Build and sync to Android
npm run cap:build:android

# Open in Android Studio
npm run cap:open:android
```