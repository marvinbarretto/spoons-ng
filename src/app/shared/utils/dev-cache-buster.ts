// src/app/shared/utils/dev-cache-buster.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * 🛠️ DEVELOPMENT CACHE BUSTER
 * 
 * Quick utilities to clear Firebase offline cache during development.
 * Only works in development mode for safety.
 */
@Injectable({ providedIn: 'root' })
export class DevCacheBuster {
  
  /**
   * Clear all Firebase offline cache
   * ⚠️ This will force fresh data from server on next request
   */
  async clearFirebaseCache(): Promise<void> {
    if (!this.isDevelopment()) {
      console.warn('🛠️ Cache busting only available in development mode');
      return;
    }

    try {
      // Clear Firebase IndexedDB persistence data
      await this.clearFirebaseIndexedDB();
      
      console.log('🧹 Firebase cache cleared! Refresh page to see fresh data.');
      console.log('💡 Tip: You can also call window.devCacheBuster.clearAll() from console');
      
    } catch (error) {
      console.error('❌ Failed to clear Firebase cache:', error);
    }
  }

  /**
   * Nuclear option: Clear everything and reload
   */
  async clearAllAndReload(): Promise<void> {
    if (!this.isDevelopment()) return;

    console.log('🧹 Clearing all caches and reloading...');
    
    try {
      // Clear Firebase cache
      await this.clearFirebaseCache();
      
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Reload without cache
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Failed to clear all caches:', error);
      // Fallback: just reload
      window.location.reload();
    }
  }

  /**
   * Show current cache status
   */
  async showCacheStatus(): Promise<void> {
    if (!this.isDevelopment()) return;

    console.log('📊 CACHE STATUS:');
    
    try {
      // Check Firebase IndexedDB
      const dbExists = await this.checkFirebaseDB();
      console.log(`🔥 Firebase offline DB: ${dbExists ? '✅ Active' : '❌ Not found'}`);
      
      // Check browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`💾 Service Worker caches: ${cacheNames.length} found`);
        cacheNames.forEach(name => console.log(`   - ${name}`));
      }
      
      // Check storage
      console.log(`📁 localStorage items: ${localStorage.length}`);
      console.log(`📂 sessionStorage items: ${sessionStorage.length}`);
      
    } catch (error) {
      console.error('❌ Failed to check cache status:', error);
    }
  }

  /**
   * Setup developer console shortcuts
   * Call this in development to add global helpers
   */
  setupDevConsoleShortcuts(): void {
    if (!this.isDevelopment()) return;

    // Add global shortcuts to window for easy console access
    (window as any).devCacheBuster = {
      clear: () => this.clearFirebaseCache(),
      clearAll: () => this.clearAllAndReload(),
      status: () => this.showCacheStatus(),
      help: () => {
        console.log(`
🛠️ DEV CACHE BUSTER COMMANDS:

window.devCacheBuster.clear()    - Clear Firebase cache only
window.devCacheBuster.clearAll() - Clear everything and reload  
window.devCacheBuster.status()   - Show cache status
window.devCacheBuster.help()     - Show this help

💡 Also available as keyboard shortcuts:
- Ctrl+Shift+C = Clear Firebase cache
- Ctrl+Shift+R = Clear all and reload
        `);
      }
    };

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        if (e.code === 'KeyC') {
          e.preventDefault();
          this.clearFirebaseCache();
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          this.clearAllAndReload();
        }
      }
    });

    console.log('🛠️ Dev cache buster ready! Type window.devCacheBuster.help() for commands');
  }

  // Private helpers

  private isDevelopment(): boolean {
    return !environment.production || !!environment.ACTIVE_DEVELOPMENT_MODE;
  }

  private async clearFirebaseIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Firebase uses IndexedDB with predictable names
      const dbNames = [
        'firebaseLocalStorageDb',
        'firestore_app_default',
        `firestore/${environment.firebaseConfig.projectId}/[DEFAULT]`,
      ];

      let cleared = 0;
      const total = dbNames.length;

      dbNames.forEach(dbName => {
        const deleteReq = indexedDB.deleteDatabase(dbName);
        
        deleteReq.onsuccess = () => {
          console.log(`🗑️ Cleared: ${dbName}`);
          cleared++;
          if (cleared === total) resolve();
        };
        
        deleteReq.onerror = () => {
          console.log(`⚠️ Could not clear: ${dbName} (may not exist)`);
          cleared++;
          if (cleared === total) resolve();
        };
        
        deleteReq.onblocked = () => {
          console.warn(`🚫 Blocked: ${dbName} (close other tabs)`);
          cleared++;
          if (cleared === total) resolve();
        };
      });

      // Timeout fallback
      setTimeout(() => {
        if (cleared < total) {
          console.warn('⏰ Cache clearing timed out, some databases may still exist');
          resolve();
        }
      }, 5000);
    });
  }

  private async checkFirebaseDB(): Promise<boolean> {
    return new Promise((resolve) => {
      const dbName = `firestore/${environment.firebaseConfig.projectId}/[DEFAULT]`;
      const request = indexedDB.open(dbName);
      
      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };
      
      request.onerror = () => resolve(false);
      request.onupgradeneeded = () => {
        request.result.close();
        resolve(false);
      };
    });
  }
}