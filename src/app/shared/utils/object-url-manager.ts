/**
 * Utility class for managing object URLs lifecycle
 * Prevents memory leaks by tracking and cleaning up blob URLs
 */
export class ObjectUrlManager {
  private objectUrls = new Set<string>();
  private keyToUrlMap = new Map<string, string>();

  /**
   * Track URLs for given items with keys
   */
  trackUrls<T extends { key: string; imageUrl: string }>(items: T[]): void {
    const currentKeys = new Set(items.map(item => item.key));
    
    // Revoke URLs for items that are no longer present
    this.keyToUrlMap.forEach((url, key) => {
      if (!currentKeys.has(key)) {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
        this.keyToUrlMap.delete(key);
        console.log('🧹 [ObjectUrlManager] Revoked URL for removed item:', key);
      }
    });
    
    // Track new URLs
    items.forEach(item => {
      if (item.imageUrl.startsWith('blob:')) {
        if (!this.keyToUrlMap.has(item.key)) {
          this.objectUrls.add(item.imageUrl);
          this.keyToUrlMap.set(item.key, item.imageUrl);
          console.log('📎 [ObjectUrlManager] Tracking new object URL for:', item.key);
        }
      }
    });
  }

  /**
   * Clean up all tracked URLs
   */
  cleanup(): void {
    this.objectUrls.forEach(url => {
      URL.revokeObjectURL(url);
      console.log('🧹 [ObjectUrlManager] Revoked object URL');
    });
    this.objectUrls.clear();
    this.keyToUrlMap.clear();
  }

  /**
   * Get number of tracked URLs
   */
  getTrackedCount(): number {
    return this.objectUrls.size;
  }
}