/**
 * @fileoverview DebugService - Multi-level debug logging system
 * 
 * DEBUG LEVELS:
 * - OFF: Production mode, no debug logs
 * - ESSENTIAL: Critical operations only (errors, auth, major state changes)
 * - STANDARD: Heavy operational logging (store operations, data flow, API calls)  
 * - EXTREME: Everything including animations, fine-grained timing, verbose details
 * 
 * USAGE:
 * ```typescript
 * // Instead of console.log
 * this.debug.standard('[UserStore] Loading user data:', userData);
 * this.debug.extreme('[Animation] Smart animate points:', { from, to, strategy });
 * this.debug.essential('[Auth] User login failed:', error);
 * ```
 * 
 * CONFIGURATION:
 * Set debugLevel in environment.ts: 'OFF' | 'ESSENTIAL' | 'STANDARD' | 'EXTREME'
 * 
 * BENEFITS:
 * - Clean production console (OFF)
 * - Appropriate verbosity for debugging
 * - Easy to find relevant logs
 * - Consistent logging patterns across app
 */

import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type DebugLevel = 'OFF' | 'ESSENTIAL' | 'STANDARD' | 'EXTREME';

@Injectable({ providedIn: 'root' })
export class DebugService {
  private readonly currentLevel: DebugLevel;
  private readonly levelValues: Record<DebugLevel, number> = {
    OFF: 0,
    ESSENTIAL: 1,
    STANDARD: 2,
    EXTREME: 3
  };

  constructor() {
    // Get debug level from environment, default to STANDARD for dev
    this.currentLevel = (environment as any).debugLevel || (environment.production ? 'OFF' : 'STANDARD');
    
    // Log debug service initialization
    if (this.shouldLog('ESSENTIAL')) {
      console.log(`🐛 [Debug] Debug level: ${this.currentLevel} (${this.levelValues[this.currentLevel]})`);
    }
  }

  /**
   * ESSENTIAL level logging - Critical operations only
   * Use for: Auth events, major errors, app lifecycle, critical state changes
   */
  essential(message: string, data?: any): void {
    if (this.shouldLog('ESSENTIAL')) {
      if (data !== undefined) {
        console.log(`🚨 ${message}`, data);
      } else {
        console.log(`🚨 ${message}`);
      }
    }
  }

  /**
   * STANDARD level logging - Heavy operational logging
   * Use for: Store operations, data flow, API calls, user actions, business logic
   */
  standard(message: string, data?: any): void {
    if (this.shouldLog('STANDARD')) {
      if (data !== undefined) {
        console.log(`📋 ${message}`, data);
      } else {
        console.log(`📋 ${message}`);
      }
    }
  }

  /**
   * EXTREME level logging - Everything including fine details
   * Use for: Animations, timing, verbose state dumps, performance metrics
   */
  extreme(message: string, data?: any): void {
    if (this.shouldLog('EXTREME')) {
      if (data !== undefined) {
        console.log(`🔬 ${message}`, data);
      } else {
        console.log(`🔬 ${message}`);
      }
    }
  }

  /**
   * Error logging - Always shown regardless of level
   * Use for: All errors, warnings, critical issues
   */
  error(message: string, error?: any): void {
    if (error !== undefined) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  }

  /**
   * Warning logging - Always shown regardless of level  
   * Use for: Deprecation warnings, fallback scenarios, potential issues
   */
  warn(message: string, data?: any): void {
    if (data !== undefined) {
      console.warn(`⚠️ ${message}`, data);
    } else {
      console.warn(`⚠️ ${message}`);
    }
  }

  /**
   * Success logging - Shown at STANDARD level and above
   * Use for: Successful operations, completed workflows
   */
  success(message: string, data?: any): void {
    if (this.shouldLog('STANDARD')) {
      if (data !== undefined) {
        console.log(`✅ ${message}`, data);
      } else {
        console.log(`✅ ${message}`);
      }
    }
  }

  /**
   * Performance timing - Shown at EXTREME level
   * Use for: Operation timing, performance analysis
   */
  timing(operation: string, startTime: number, data?: any): void {
    if (this.shouldLog('EXTREME')) {
      const duration = performance.now() - startTime;
      const message = `⏱️ ${operation} completed in ${duration.toFixed(1)}ms`;
      
      if (data !== undefined) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }

  /**
   * Group logging for related operations
   */
  group(title: string, level: DebugLevel = 'STANDARD'): void {
    if (this.shouldLog(level)) {
      console.group(`🔽 ${title}`);
    }
  }

  groupEnd(level: DebugLevel = 'STANDARD'): void {
    if (this.shouldLog(level)) {
      console.groupEnd();
    }
  }

  /**
   * Table logging for structured data (EXTREME level)
   */
  table(data: any[], level: DebugLevel = 'EXTREME'): void {
    if (this.shouldLog(level)) {
      console.table(data);
    }
  }

  /**
   * Check if current debug level allows logging at specified level
   */
  shouldLog(level: DebugLevel): boolean {
    return this.levelValues[this.currentLevel] >= this.levelValues[level];
  }

  /**
   * Get current debug level
   */
  getLevel(): DebugLevel {
    return this.currentLevel;
  }

  /**
   * Check if a specific level is enabled
   */
  isEnabled(level: DebugLevel): boolean {
    return this.shouldLog(level);
  }

  /**
   * Conditional logging - only log if condition is true
   */
  conditionalLog(condition: boolean, level: DebugLevel, message: string, data?: any): void {
    if (condition && this.shouldLog(level)) {
      const emoji = level === 'ESSENTIAL' ? '🚨' : level === 'STANDARD' ? '📋' : '🔬';
      if (data !== undefined) {
        console.log(`${emoji} ${message}`, data);
      } else {
        console.log(`${emoji} ${message}`);
      }
    }
  }

  /**
   * Log debug level info (useful for troubleshooting)
   */
  logDebugInfo(): void {
    console.log('🐛 [Debug] Current configuration:', {
      level: this.currentLevel,
      value: this.levelValues[this.currentLevel],
      environment: environment.production ? 'production' : 'development',
      essentialEnabled: this.shouldLog('ESSENTIAL'),
      standardEnabled: this.shouldLog('STANDARD'),
      extremeEnabled: this.shouldLog('EXTREME')
    });
  }
}