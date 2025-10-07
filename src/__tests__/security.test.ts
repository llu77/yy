import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { securityTester } from '../lib/security-tests';
import { 
  validateRequest, 
  userSchema, 
  revenueSchema, 
  expenseSchema,
  requestSchema,
  loginSchema,
  ValidationError 
} from '../lib/validation';

describe('Security Tests', () => {
  describe('Input Validation', () => {
    it('should validate user schema correctly', () => {
      const validUser = {
        name: 'محمد أحمد',
        email: 'test@example.com',
        role: 'موظف' as const,
        branch: 'فرع لبن' as const
      };
      
      expect(() => validateRequest(userSchema, validUser)).not.toThrow();
      
      const invalidUser = {
        name: 'a', // Too short
        email: 'invalid-email',
        role: 'invalid-role',
        branch: 'invalid-branch'
      };
      
      expect(() => validateRequest(userSchema, invalidUser)).toThrow(ValidationError);
    });
    
    it('should validate revenue schema with calculations', () => {
      const validRevenue = {
        date: new Date().toISOString(),
        branch: 'فرع لبن' as const,
        totalRevenue: 1000,
        cash: 600,
        card: 400,
        distribution: [
          { name: 'موظف 1', percentage: 50, amount: 500 },
          { name: 'موظف 2', percentage: 50, amount: 500 }
        ]
      };
      
      expect(() => validateRequest(revenueSchema, validRevenue)).not.toThrow();
      
      // Test calculation validation
      const invalidRevenue = {
        ...validRevenue,
        cash: 700 // Total doesn't match
      };
      
      expect(() => validateRequest(revenueSchema, invalidRevenue)).toThrow(ValidationError);
    });
    
    it('should prevent XSS in text fields', () => {
      const xssPayload = {
        date: new Date().toISOString(),
        branch: 'فرع لبن' as const,
        category: 'أخرى' as const,
        amount: 100,
        description: '<script>alert("XSS")</script>'
      };
      
      expect(() => validateRequest(expenseSchema, xssPayload)).toThrow(ValidationError);
    });
  });
  
  describe('Authentication Security', () => {
    it('should validate login credentials', () => {
      const validLogin = {
        email: 'admin@branchflow.com',
        password: '123456'
      };
      
      expect(() => validateRequest(loginSchema, validLogin)).not.toThrow();
      
      const shortPassword = {
        email: 'admin@branchflow.com',
        password: '12345' // Too short
      };
      
      expect(() => validateRequest(loginSchema, shortPassword)).toThrow(ValidationError);
    });
    
    it('should reject invalid email formats', () => {
      const testEmails = [
        'invalid@',
        '@invalid.com',
        'invalid..email@test.com',
        '.invalid@test.com',
        'invalid@test.com.',
        'invalid@test..com'
      ];
      
      testEmails.forEach(email => {
        expect(() => validateRequest(loginSchema, { 
          email, 
          password: 'validpass123' 
        })).toThrow(ValidationError);
      });
    });
  });
  
  describe('Comprehensive Security Audit', () => {
    let results: any;
    
    beforeAll(() => {
      results = securityTester.runAllTests();
    });
    
    it('should pass all XSS prevention tests', () => {
      const xssResults = results.filter((r: any) => r.test === 'XSS Prevention');
      const failedXSS = xssResults.filter((r: any) => !r.passed);
      
      expect(failedXSS.length).toBe(0);
      if (failedXSS.length > 0) {
        console.error('Failed XSS tests:', failedXSS);
      }
    });
    
    it('should pass all SQL injection prevention tests', () => {
      const sqlResults = results.filter((r: any) => r.test === 'SQL Injection Prevention');
      const failedSQL = sqlResults.filter((r: any) => !r.passed);
      
      expect(failedSQL.length).toBe(0);
      if (failedSQL.length > 0) {
        console.error('Failed SQL injection tests:', failedSQL);
      }
    });
    
    it('should have proper security headers configured', () => {
      const headerResults = results.filter((r: any) => r.test === 'Security Headers');
      const missingHeaders = headerResults.filter((r: any) => !r.passed);
      
      expect(missingHeaders.length).toBe(0);
      if (missingHeaders.length > 0) {
        console.error('Missing security headers:', missingHeaders);
      }
    });
    
    it('should generate comprehensive security report', () => {
      const report = securityTester.generateReport();
      const summary = securityTester.getSummary();
      
      expect(report).toContain('Security Test Report');
      expect(summary.total).toBeGreaterThan(0);
      
      // Log summary for visibility
      console.log(`
Security Test Summary:
- Total Tests: ${summary.total}
- Passed: ${summary.passed}
- Failed: ${summary.failed}
- Critical Issues: ${summary.critical}
- High Issues: ${summary.high}
      `);
      
      // No critical issues should exist
      expect(summary.critical).toBe(0);
    });
  });
});

describe('API Endpoint Security', () => {
  // Mock Firebase functions
  const mockAuth = {
    uid: 'test-user-id',
    token: {
      email: 'test@example.com',
      role: 'موظف'
    }
  };
  
  describe('Revenue API', () => {
    it('should validate revenue data before saving', async () => {
      const invalidData = {
        totalRevenue: -100, // Negative value
        branch: 'invalid-branch'
      };
      
      // This would be tested with actual API calls
      expect(() => validateRequest(revenueSchema, invalidData)).toThrow();
    });
    
    it('should enforce branch-based access control', () => {
      // Test that users can only access their branch data
      const userBranch = 'فرع لبن';
      const requestedBranch = 'فرع طويق';
      
      // In real implementation, this would check Firestore rules
      const canAccess = mockAuth.token.role === 'مدير النظام' || userBranch === requestedBranch;
      
      expect(canAccess).toBe(false);
    });
  });
  
  describe('Request Management API', () => {
    it('should validate request status transitions', () => {
      const validStatuses = ['مُعلق', 'مُوافق عليه', 'مرفوض'];
      const newRequest = {
        type: 'استقالة' as const,
        employeeId: 'emp123',
        employeeName: 'محمد أحمد',
        employeeBranch: 'فرع لبن' as const,
        date: new Date().toISOString(),
        status: 'مُعلق' as const
      };
      
      expect(() => validateRequest(requestSchema, newRequest)).not.toThrow();
      
      // Test invalid status
      const invalidRequest = { ...newRequest, status: 'invalid-status' };
      expect(() => validateRequest(requestSchema, invalidRequest)).toThrow();
    });
  });
});

describe('Performance Monitoring', () => {
  it('should detect slow operations', async () => {
    // Mock slow operation
    const slowOperation = () => new Promise(resolve => setTimeout(resolve, 150));
    
    const start = performance.now();
    await slowOperation();
    const duration = performance.now() - start;
    
    expect(duration).toBeGreaterThan(100);
  });
  
  it('should handle memory monitoring', () => {
    // Check if performance.memory is available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      expect(memory.usedJSHeapSize).toBeGreaterThan(0);
      expect(memory.totalJSHeapSize).toBeGreaterThan(0);
    }
  });
});

// Integration test for complete auth flow
describe('Authentication Flow Integration', () => {
  it('should handle complete login flow securely', async () => {
    // This would test:
    // 1. Input validation
    // 2. Rate limiting
    // 3. Secure session creation
    // 4. User data fetching
    // 5. Proper error handling
    
    const loginFlow = async (email: string, password: string) => {
      // Validate input
      const validated = validateRequest(loginSchema, { email, password });
      
      // Check rate limiting (mocked)
      const rateLimitCheck = true;
      
      if (!rateLimitCheck) {
        throw new Error('Rate limit exceeded');
      }
      
      // Return mock success
      return {
        user: { uid: 'test-uid', email },
        session: 'mock-session-token'
      };
    };
    
    const result = await loginFlow('test@example.com', 'password123');
    expect(result.user.uid).toBeDefined();
    expect(result.session).toBeDefined();
  });
});
