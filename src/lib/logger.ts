// Enhanced logging system with security event tracking

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
  SECURITY = 5
}

export enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_BREACH_ATTEMPT = 'DATA_BREACH_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  FILE_UPLOAD = 'FILE_UPLOAD',
  DATA_EXPORT = 'DATA_EXPORT',
  ADMIN_ACTION = 'ADMIN_ACTION',
  CONFIG_CHANGE = 'CONFIG_CHANGE'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  stackTrace?: string;
  securityEvent?: SecurityEventType;
}

interface SecurityAlert {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  details: Record<string, any>;
  userId?: string;
  ipAddress?: string;
}

class Logger {
  private static instance: Logger;
  private logQueue: LogEntry[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private readonly maxQueueSize = 1000;
  private readonly flushInterval = 30000; // 30 seconds
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private constructor() {
    // Set up periodic flush
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
      
      // Track uncaught errors
      window.addEventListener('error', (event) => {
        this.error('Uncaught error', {
          message: event.error?.message || event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });
      
      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    securityEvent?: SecurityEventType
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
      securityEvent
    };
    
    // Add user context if available
    if (typeof window !== 'undefined') {
      entry.userAgent = window.navigator.userAgent;
      // Get session info from auth context if available
      const authData = this.getAuthContext();
      if (authData) {
        entry.userId = authData.userId;
        entry.sessionId = authData.sessionId;
      }
    }
    
    // Add stack trace for errors
    if (level >= LogLevel.ERROR) {
      entry.stackTrace = new Error().stack;
    }
    
    return entry;
  }
  
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential'];
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  private getAuthContext(): { userId?: string; sessionId?: string } | null {
    // This should be integrated with your auth system
    // For now, return null to avoid circular dependencies
    return null;
  }
  
  private async flush(): Promise<void> {
    if (this.logQueue.length === 0 && this.securityAlerts.length === 0) return;
    
    const logsToSend = [...this.logQueue];
    const alertsToSend = [...this.securityAlerts];
    this.logQueue = [];
    this.securityAlerts = [];
    
    try {
      // In production, send to logging service
      if (!this.isDevelopment) {
        await this.sendToLoggingService(logsToSend, alertsToSend);
      }
      
      // Always log security events to console in development
      if (this.isDevelopment) {
        alertsToSend.forEach(alert => {
          console.log('🔒 Security Alert:', alert);
        });
      }
    } catch (error) {
      console.log('❌ Failed to flush logs:', error);
      // Re-add failed logs to queue (with limit to prevent memory issues)
      this.logQueue = [...logsToSend.slice(-100), ...this.logQueue].slice(-this.maxQueueSize);
    }
  }
  
  private async sendToLoggingService(logs: LogEntry[], alerts: SecurityAlert[]): Promise<void> {
    // TODO: Implement actual logging service integration
    // This could be Firebase Functions, CloudWatch, Sentry, etc.
    
    // For now, store critical logs in Firestore
    if (typeof window !== 'undefined' && alerts.length > 0) {
      try {
        const { db } = await import('./firebase');
        const { collection, addDoc } = await import('firebase/firestore');
        
        for (const alert of alerts) {
          await addDoc(collection(db, 'security_logs'), {
            ...alert,
            createdAt: new Date(alert.timestamp)
          });
        }
      } catch (error) {
        console.log('❌ Failed to store security logs:', error);
      }
    }
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>, securityEvent?: SecurityEventType): void {
    const entry = this.createLogEntry(level, message, context, securityEvent);
    
    // Console output in development
    if (this.isDevelopment || level >= LogLevel.ERROR) {
      // Use console.log for all levels to avoid Next.js errors
      const prefix = level >= LogLevel.ERROR ? '❌ ERROR' : 
                    level >= LogLevel.WARN ? '⚠️ WARN' : 
                    level === LogLevel.SECURITY ? '🔒 SECURITY' :
                    '✅ INFO';
      console.log(`${prefix} [${LogLevel[level]}] ${message}`, context || '');
    }
    
    // Add to queue
    this.logQueue.push(entry);
    
    // Flush if queue is full
    if (this.logQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }
  
  // Public logging methods
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  critical(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, context);
  }
  
  // Security-specific logging
  security(event: SecurityEventType, details: Record<string, any>, severity: SecurityAlert['severity'] = 'medium'): void {
    const message = `Security Event: ${event}`;
    this.log(LogLevel.SECURITY, message, details, event);
    
    // Create security alert
    const alert: SecurityAlert = {
      type: event,
      severity,
      timestamp: new Date().toISOString(),
      details: this.sanitizeContext(details) || {},
      userId: this.getAuthContext()?.userId,
      ipAddress: details.ipAddress
    };
    
    this.securityAlerts.push(alert);
    
    // Immediate flush for high/critical security events
    if (severity === 'high' || severity === 'critical') {
      this.flush();
    }
  }
  
  // Performance monitoring
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }
  
  // Audit logging for compliance
  audit(action: string, resource: string, details?: Record<string, any>): void {
    this.info(`Audit: ${action} on ${resource}`, {
      ...details,
      action,
      resource,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, context?: Record<string, any>) => logger.debug(message, context);
export const logInfo = (message: string, context?: Record<string, any>) => logger.info(message, context);
export const logWarn = (message: string, context?: Record<string, any>) => logger.warn(message, context);
export const logError = (message: string, context?: Record<string, any>) => logger.error(message, context);
export const logCritical = (message: string, context?: Record<string, any>) => logger.critical(message, context);
export const logSecurity = (event: SecurityEventType, details: Record<string, any>, severity?: SecurityAlert['severity']) => 
  logger.security(event, details, severity);
export const logAudit = (action: string, resource: string, details?: Record<string, any>) => 
  logger.audit(action, resource, details);

// React hook for logging
export function useLogger() {
  return logger;
}
