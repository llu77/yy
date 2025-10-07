// Enhanced Error Handling System
import { logger, SecurityEventType } from './logger';

// Error types enumeration
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Base application error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly userMessage: string;
  public readonly timestamp: Date;
  public readonly correlationId: string;
  
  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    details?: any,
    userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = details;
    this.userMessage = userMessage || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
    
    // Log error based on severity
    this.logError();
  }
  
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private logError() {
    const errorContext = {
      correlationId: this.correlationId,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack
    };
    
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
        logger.critical(this.message, errorContext);
        break;
      case ErrorSeverity.HIGH:
        logger.error(this.message, errorContext);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(this.message, errorContext);
        break;
      default:
        logger.info(this.message, errorContext);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      correlationId: this.correlationId,
      timestamp: this.timestamp
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: any,
    userMessage: string = 'البيانات المدخلة غير صحيحة.'
  ) {
    super(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      400,
      details,
      userMessage
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string,
    details?: any,
    userMessage: string = 'فشلت عملية المصادقة. الرجاء تسجيل الدخول مرة أخرى.'
  ) {
    super(
      message,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      details,
      userMessage
    );
    Object.setPrototypeOf(this, AuthenticationError.prototype);
    
    // Log security event
    logger.security(SecurityEventType.UNAUTHORIZED_ACCESS, {
      message,
      ...details
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string,
    details?: any,
    userMessage: string = 'ليس لديك الصلاحية للقيام بهذا الإجراء.'
  ) {
    super(
      message,
      ErrorType.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403,
      details,
      userMessage
    );
    Object.setPrototypeOf(this, AuthorizationError.prototype);
    
    // Log security event
    logger.security(SecurityEventType.PERMISSION_DENIED, {
      message,
      ...details
    });
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    details?: any,
    userMessage: string = 'فشل الاتصال بالخادم. الرجاء التحقق من اتصالك بالإنترنت.'
  ) {
    super(
      message,
      ErrorType.NETWORK,
      ErrorSeverity.HIGH,
      503,
      details,
      userMessage
    );
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    details?: any,
    userMessage: string = 'حدث خطأ في قاعدة البيانات. الرجاء المحاولة لاحقاً.'
  ) {
    super(
      message,
      ErrorType.DATABASE,
      ErrorSeverity.HIGH,
      500,
      details,
      userMessage
    );
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    details?: any,
    userMessage?: string
  ) {
    super(
      message,
      ErrorType.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      422,
      details,
      userMessage || message
    );
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

// Error handler wrapper for async functions
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    fallback?: any;
    onError?: (error: AppError) => void;
    transformError?: (error: any) => AppError;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      let appError: AppError;
      
      if (error instanceof AppError) {
        appError = error;
      } else if (options?.transformError) {
        appError = options.transformError(error);
      } else {
        appError = new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          ErrorType.UNKNOWN,
          ErrorSeverity.HIGH,
          500,
          { originalError: error }
        );
      }
      
      if (options?.onError) {
        options.onError(appError);
      }
      
      if (options?.fallback !== undefined) {
        return options.fallback;
      }
      
      throw appError;
    }
  }) as T;
}

// Global error handler for uncaught errors
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const error = new AppError(
        event.error?.message || event.message,
        ErrorType.SYSTEM,
        ErrorSeverity.CRITICAL,
        500,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      );
      
      event.preventDefault();
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      const error = new AppError(
        'Unhandled promise rejection',
        ErrorType.SYSTEM,
        ErrorSeverity.HIGH,
        500,
        {
          reason: event.reason,
          promise: event.promise
        }
      );
      
      event.preventDefault();
    });
  }
}

// Error retry mechanism
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    shouldRetry = (error) => error instanceof NetworkError
  } = options;
  
  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      logger.warn(`Operation failed, retrying...`, {
        attempt,
        delay,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }
  
  throw lastError;
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly resetTimeout: number = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new NetworkError('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.error('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.threshold
      });
      
      setTimeout(() => {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker half-opened');
      }, this.resetTimeout);
    }
  }
  
  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
    logger.info('Circuit breaker closed');
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}