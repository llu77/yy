// نظام الذكاء المحاسبي المتقدم
import { analyzeTrend, calculateFinancialRatios, calculateNetSalary, checkWarningIndicators, forecastRevenue } from './financial-calculations';


// ============= كشف الاحتيال =============

// قانون بنفورد - التوزيع المتوقع للأرقام الأولى
const BENFORD_DISTRIBUTION = [
  0.301, // 1
  0.176, // 2
  0.125, // 3
  0.097, // 4
  0.079, // 5
  0.067, // 6
  0.058, // 7
  0.051, // 8
  0.046  // 9
]

export interface BenfordAnalysis {
  chiSquare: number
  isAnomaly: boolean
  distribution: number[]
  expectedDistribution: number[]
  deviations: number[]
  riskLevel: 'low' | 'medium' | 'high'
  message: string
}

// تحليل قانون بنفورد
export function analyzeBenfordLaw(numbers: number[]): BenfordAnalysis {
  if (numbers.length < 100) {
    return {
      chiSquare: 0,
      isAnomaly: false,
      distribution: [],
      expectedDistribution: BENFORD_DISTRIBUTION,
      deviations: [],
      riskLevel: 'low',
      message: 'عينة صغيرة جداً للتحليل الموثوق'
    }
  }

  // حساب توزيع الأرقام الأولى الفعلي
  const firstDigitCounts = new Array(9).fill(0)
  
  numbers.forEach(num => {
    const absNum = Math.abs(num)
    if (absNum >= 1) {
      const firstDigit = parseInt(absNum.toString()[0])
      if (firstDigit >= 1 && firstDigit <= 9) {
        firstDigitCounts[firstDigit - 1]++
      }
    }
  })

  const total = firstDigitCounts.reduce((sum, count) => sum + count, 0)
  const actualDistribution = firstDigitCounts.map(count => count / total)

  // حساب Chi-Square
  let chiSquare = 0
  const deviations: number[] = []
  
  for (let i = 0; i < 9; i++) {
    const expected = BENFORD_DISTRIBUTION[i] * total
    const actual = firstDigitCounts[i]
    if (expected > 0) {
      chiSquare += Math.pow(actual - expected, 2) / expected
    }
    deviations.push(Math.abs(actualDistribution[i] - BENFORD_DISTRIBUTION[i]) * 100)
  }

  // تحديد مستوى الخطر
  let riskLevel: 'low' | 'medium' | 'high'
  let message: string
  
  if (chiSquare > 15.51) {
    riskLevel = 'high'
    message = 'انحراف يتجاوز 15.51 - احتمالية تلاعب عالية'
  } else if (chiSquare > 11.07) {
    riskLevel = 'medium'
    message = 'انحراف بين 11.07-15.51 - يتطلب مراجعة'
  } else {
    riskLevel = 'low'
    message = 'انحراف أقل من 11.07 - طبيعي'
  }

  return {
    chiSquare: Math.round(chiSquare * 100) / 100,
    isAnomaly: chiSquare > 15.51,
    distribution: actualDistribution.map(d => Math.round(d * 1000) / 1000),
    expectedDistribution: BENFORD_DISTRIBUTION,
    deviations,
    riskLevel,
    message
  }
}

// كشف المعاملات المكررة
export interface DuplicateTransaction {
  id: string
  amount: number
  date: string
  employeeId?: string
  description?: string
  count: number
  risk: 'low' | 'medium' | 'high'
}

export function detectDuplicates(
  transactions: Array<{
    id: string
    amount: number
    date: string
    employeeId?: string
    description?: string
  }>,
  tolerance: number = 0.01,
  timeWindowHours: number = 24
): DuplicateTransaction[] {
  const duplicates: Map<string, DuplicateTransaction[]> = new Map()
  
  transactions.forEach((trans, index) => {
    const transDate = new Date(trans.date)
    
    // البحث عن معاملات مشابهة
    transactions.slice(index + 1).forEach(otherTrans => {
      const otherDate = new Date(otherTrans.date)
      const timeDiff = Math.abs(transDate.getTime() - otherDate.getTime()) / (1000 * 60 * 60)
      const amountDiff = Math.abs(trans.amount - otherTrans.amount)
      
      // التحقق من التطابق
      if (timeDiff <= timeWindowHours && amountDiff <= tolerance) {
        const key = `${Math.round(trans.amount)}_${trans.employeeId || 'unknown'}`
        
        if (!duplicates.has(key)) {
          duplicates.set(key, [])
        }
        
        const existing = duplicates.get(key)!
        const found = existing.find(d => d.id === trans.id)
        
        if (!found) {
          existing.push({
            ...trans,
            count: 2,
            risk: timeDiff < 1 ? 'high' : timeDiff < 12 ? 'medium' : 'low'
          })
        } else {
          found.count++
          if (found.count > 3) found.risk = 'high'
        }
      }
    })
  })
  
  return Array.from(duplicates.values()).flat()
}

// تحليل الأرقام المستديرة
export interface RoundNumberAnalysis {
  suspiciousTransactions: Array<{
    id: string
    amount: number
    pattern: string
    risk: 'medium' | 'high'
  }>
  totalSuspicious: number
  percentageSuspicious: number
}

export function analyzeRoundNumbers(
  transactions: Array<{ id: string; amount: number }>
): RoundNumberAnalysis {
  const suspicious: Array<{
    id: string
    amount: number
    pattern: string
    risk: 'medium' | 'high'
  }> = []
  
  const patterns = [
    { regex: /000$/, risk: 'medium' as const, name: 'ينتهي بثلاث أصفار' },
    { regex: /999$/, risk: 'high' as const, name: 'ينتهي بثلاث تسعات' },
    { regex: /^(\d)\1+$/, risk: 'high' as const, name: 'رقم متكرر' },
    { regex: /^[1-9]0+$/, risk: 'medium' as const, name: 'رقم يليه أصفار' }
  ]
  
  transactions.forEach(trans => {
    const amountStr = Math.abs(Math.round(trans.amount)).toString()
    
    patterns.forEach(pattern => {
      if (pattern.regex.test(amountStr)) {
        suspicious.push({
          id: trans.id,
          amount: trans.amount,
          pattern: pattern.name,
          risk: pattern.risk
        })
      }
    })
  })
  
  return {
    suspiciousTransactions: suspicious,
    totalSuspicious: suspicious.length,
    percentageSuspicious: (suspicious.length / transactions.length) * 100
  }
}

// ============= النسب المالية =============

export interface LiquidityRatios {
  currentRatio: {
    value: number
    status: 'healthy' | 'warning' | 'critical'
    message: string
  }
  quickRatio: {
    value: number
    status: 'healthy' | 'warning' | 'critical'
    message: string
  }
  cashRatio: {
    value: number
    status: 'healthy' | 'warning' | 'critical'
    message: string
  }
}

export function calculateLiquidityRatios(data: {
  currentAssets: number
  currentLiabilities: number
  inventory: number
  cash: number
}): LiquidityRatios {
  const { currentAssets, currentLiabilities, inventory, cash } = data
  
  // النسبة الجارية
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
  let currentStatus: 'healthy' | 'warning' | 'critical'
  let currentMessage: string
  
  if (currentRatio >= 1.5 && currentRatio <= 3.0) {
    currentStatus = 'healthy'
    currentMessage = 'نسبة سيولة صحية'
  } else if (currentRatio >= 1.0 && currentRatio < 1.5) {
    currentStatus = 'warning'
    currentMessage = 'سيولة منخفضة نسبياً'
  } else if (currentRatio < 1.0) {
    currentStatus = 'critical'
    currentMessage = 'مشكلة سيولة حرجة'
  } else {
    currentStatus = 'warning'
    currentMessage = 'سيولة زائدة غير مستغلة'
  }
  
  // النسبة السريعة
  const quickRatio = currentLiabilities > 0 
    ? (currentAssets - inventory) / currentLiabilities 
    : 0
  let quickStatus: 'healthy' | 'warning' | 'critical'
  let quickMessage: string
  
  if (quickRatio >= 1.0) {
    quickStatus = 'healthy'
    quickMessage = 'قدرة جيدة على سداد الالتزامات'
  } else if (quickRatio >= 0.7) {
    quickStatus = 'warning'
    quickMessage = 'قدرة محدودة على السداد السريع'
  } else {
    quickStatus = 'critical'
    quickMessage = 'صعوبة في سداد الالتزامات قصيرة الأجل'
  }
  
  // نسبة النقدية
  const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0
  let cashStatus: 'healthy' | 'warning' | 'critical'
  let cashMessage: string
  
  if (cashRatio >= 0.2) {
    cashStatus = 'healthy'
    cashMessage = 'نقدية كافية'
  } else if (cashRatio >= 0.1) {
    cashStatus = 'warning'
    cashMessage = 'نقدية منخفضة'
  } else {
    cashStatus = 'critical'
    cashMessage = 'نقص حاد في النقدية'
  }
  
  return {
    currentRatio: {
      value: Math.round(currentRatio * 100) / 100,
      status: currentStatus,
      message: currentMessage
    },
    quickRatio: {
      value: Math.round(quickRatio * 100) / 100,
      status: quickStatus,
      message: quickMessage
    },
    cashRatio: {
      value: Math.round(cashRatio * 100) / 100,
      status: cashStatus,
      message: cashMessage
    }
  }
}

export interface EfficiencyRatios {
  inventoryTurnover: number
  daysInventoryOutstanding: number
  receivablesTurnover: number
  daysReceivablesOutstanding: number
  assetTurnover: number
  operatingCycle: number
}

export function calculateEfficiencyRatios(data: {
  costOfGoodsSold: number
  averageInventory: number
  creditSales: number
  averageReceivables: number
  revenue: number
  averageTotalAssets: number
}): EfficiencyRatios {
  const {
    costOfGoodsSold,
    averageInventory,
    creditSales,
    averageReceivables,
    revenue,
    averageTotalAssets
  } = data
  
  const inventoryTurnover = averageInventory > 0 
    ? costOfGoodsSold / averageInventory 
    : 0
  
  const daysInventoryOutstanding = inventoryTurnover > 0 
    ? 365 / inventoryTurnover 
    : 365
  
  const receivablesTurnover = averageReceivables > 0 
    ? creditSales / averageReceivables 
    : 0
  
  const daysReceivablesOutstanding = receivablesTurnover > 0 
    ? 365 / receivablesTurnover 
    : 365
  
  const assetTurnover = averageTotalAssets > 0 
    ? revenue / averageTotalAssets 
    : 0
  
  const operatingCycle = daysInventoryOutstanding + daysReceivablesOutstanding
  
  return {
    inventoryTurnover: Math.round(inventoryTurnover * 100) / 100,
    daysInventoryOutstanding: Math.round(daysInventoryOutstanding),
    receivablesTurnover: Math.round(receivablesTurnover * 100) / 100,
    daysReceivablesOutstanding: Math.round(daysReceivablesOutstanding),
    assetTurnover: Math.round(assetTurnover * 100) / 100,
    operatingCycle: Math.round(operatingCycle)
  }
}

// ============= كشف الشذوذ الإحصائي =============

export interface StatisticalAnomaly {
  value: number
  zScore: number
  isOutlier: boolean
  severity: 'low' | 'medium' | 'high'
  description: string
}

// حساب Z-Score للكشف عن القيم الشاذة
export function detectStatisticalAnomalies(
  values: number[],
  threshold: number = 3
): StatisticalAnomaly[] {
  if (values.length < 3) {
    return []
  }
  
  // حساب المتوسط والانحراف المعياري
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  
  const anomalies: StatisticalAnomaly[] = []
  
  values.forEach(value => {
    const zScore = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0
    
    if (zScore > threshold) {
      let severity: 'low' | 'medium' | 'high'
      let description: string
      
      if (zScore > 4) {
        severity = 'high'
        description = `قيمة شاذة جداً (Z=${zScore.toFixed(2)})`
      } else if (zScore > 3.5) {
        severity = 'medium'
        description = `قيمة شاذة (Z=${zScore.toFixed(2)})`
      } else {
        severity = 'low'
        description = `انحراف ملحوظ (Z=${zScore.toFixed(2)})`
      }
      
      anomalies.push({
        value,
        zScore: Math.round(zScore * 100) / 100,
        isOutlier: true,
        severity,
        description
      })
    }
  })
  
  return anomalies
}

// ============= تحليل السلوك =============

export interface BehavioralPattern {
  userId: string
  unusualActivity: boolean
  patterns: string[]
  riskScore: number
  recommendations: string[]
}

export function analyzeBehavioralPatterns(
  activities: Array<{
    userId: string
    timestamp: string
    action: string
    amount?: number
  }>
): Map<string, BehavioralPattern> {
  const userPatterns = new Map<string, BehavioralPattern>()
  
  // تجميع الأنشطة حسب المستخدم
  const userActivities = new Map<string, typeof activities>()
  
  activities.forEach(activity => {
    if (!userActivities.has(activity.userId)) {
      userActivities.set(activity.userId, [])
    }
    userActivities.get(activity.userId)!.push(activity)
  })
  
  // تحليل كل مستخدم
  userActivities.forEach((userActs, userId) => {
    const patterns: string[] = []
    let riskScore = 0
    const recommendations: string[] = []
    
    // تحليل الأوقات
    const hours = userActs.map(a => new Date(a.timestamp).getHours())
    const afterHoursActivity = hours.filter(h => h < 6 || h > 22).length
    
    if (afterHoursActivity > userActs.length * 0.3) {
      patterns.push('نشاط متكرر خارج ساعات العمل')
      riskScore += 30
      recommendations.push('مراجعة صلاحيات الوصول خارج ساعات العمل')
    }
    
    // تحليل التكرار
    const actionCounts = new Map<string, number>()
    userActs.forEach(a => {
      actionCounts.set(a.action, (actionCounts.get(a.action) || 0) + 1)
    })
    
    actionCounts.forEach((count, action) => {
      if (count > userActs.length * 0.5) {
        patterns.push(`تكرار مفرط للعملية: ${action}`)
        riskScore += 20
        recommendations.push(`مراجعة الحاجة لتكرار ${action}`)
      }
    })
    
    // تحليل المبالغ
    const amounts = userActs.filter(a => a.amount).map(a => a.amount!)
    if (amounts.length > 0) {
      const anomalies = detectStatisticalAnomalies(amounts)
      if (anomalies.length > 0) {
        patterns.push('مبالغ شاذة في المعاملات')
        riskScore += anomalies.length * 15
        recommendations.push('التحقق من المعاملات ذات المبالغ الشاذة')
      }
    }
    
    userPatterns.set(userId, {
      userId,
      unusualActivity: riskScore > 50,
      patterns,
      riskScore: Math.min(100, riskScore),
      recommendations
    })
  })
  
  return userPatterns
}

// ============= نظام التنبؤ المالي =============

export interface FinancialPrediction {
  nextPeriod: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonalFactor: number
  riskFactors: string[]
}

// تنبؤ بسيط باستخدام المتوسط المتحرك الموزون
export function predictFinancialMetric(
  historicalData: number[],
  weights?: number[]
): FinancialPrediction {
    const forecast = forecastRevenue(historicalData);
    const trendAnalysis = analyzeTrend(historicalData);

    const seasonalFactor = historicalData.length >= 12 
    ? historicalData[historicalData.length - 12] / (historicalData.slice(0, -1).reduce((s,v) => s+v, 0)/ (historicalData.length-1))
    : 1
  
  // تحديد عوامل الخطر
  const riskFactors: string[] = []
  if (trendAnalysis.volatility > (historicalData.reduce((s,v)=>s+v,0)/historicalData.length) * 0.3) {
    riskFactors.push('تذبذب عالي في البيانات')
  }
  if (forecast.trend === 'decreasing' && forecast.nextPeriod < (historicalData.slice(-3).reduce((s,v)=>s+v,0)/3) * 0.8) {
    riskFactors.push('انخفاض متسارع متوقع')
  }
  if (Math.abs(seasonalFactor - 1) > 0.2) {
    riskFactors.push('تأثير موسمي قوي')
  }
  
  return {
    nextPeriod: forecast.nextPeriod,
    confidence: Math.round(forecast.confidence * 100),
    trend: forecast.trend,
    seasonalFactor: Math.round(seasonalFactor * 100) / 100,
    riskFactors
  }
}

// ============= نظام الامتثال =============

export interface ComplianceCheck {
  rule: string
  passed: boolean
  severity: 'info' | 'warning' | 'error'
  details: string
  action?: string
}

export function performComplianceChecks(data: {
  transactions?: any[]
  approvals?: any[]
  users?: any[]
  financialRatios?: any
}): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []
  
  // فحص فصل المهام
  if (data.approvals) {
    const selfApprovals = data.approvals.filter(a => a.createdBy === a.approvedBy)
    if (selfApprovals.length > 0) {
      checks.push({
        rule: 'فصل المهام',
        passed: false,
        severity: 'error',
        details: `تم اكتشاف ${selfApprovals.length} حالة موافقة ذاتية`,
        action: 'إلغاء الموافقات الذاتية وإعادة التوجيه'
      })
    }
  }
  
  // فحص حدود المعاملات
  if (data.transactions) {
    const largeTransactions = data.transactions.filter(t => t.amount > 100000)
    const unapprovedLarge = largeTransactions.filter(t => !t.approved)
    
    if (unapprovedLarge.length > 0) {
      checks.push({
        rule: 'حدود الموافقة',
        passed: false,
        severity: 'error',
        details: `${unapprovedLarge.length} معاملة كبيرة بدون موافقة`,
        action: 'تعليق المعاملات حتى الموافقة'
      })
    }
  }
  
  // فحص النسب المالية
  if (data.financialRatios) {
    if (data.financialRatios.currentRatio < 1.0) {
      checks.push({
        rule: 'السيولة المطلوبة',
        passed: false,
        severity: 'warning',
        details: 'النسبة الجارية أقل من 1.0',
        action: 'مراجعة خطة السيولة'
      })
    }
    
    if (data.financialRatios.debtToEquity > 2.0) {
      checks.push({
        rule: 'حد المديونية',
        passed: false,
        severity: 'warning',
        details: 'نسبة الدين إلى حقوق الملكية تتجاوز 2.0',
        action: 'تقليل الاقتراض أو زيادة رأس المال'
      })
    }
  }
  
  // فحص الصلاحيات
  if (data.users) {
    const adminUsers = data.users.filter(u => u.role === 'admin')
    if (adminUsers.length > data.users.length * 0.2) {
      checks.push({
        rule: 'مبدأ الصلاحيات الأقل',
        passed: false,
        severity: 'warning',
        details: 'عدد المسؤولين يتجاوز 20% من المستخدمين',
        action: 'مراجعة وتقليل الصلاحيات الإدارية'
      })
    }
  }
  
  return checks
}

// ============= نظام التوصيات الذكية =============

export interface IntelligentRecommendation {
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
  expectedImpact: string
  implementation: string
  estimatedROI?: number
}

export function generateIntelligentRecommendations(
  analysis: {
    benfordAnalysis?: BenfordAnalysis
    liquidityRatios?: LiquidityRatios
    efficiencyRatios?: EfficiencyRatios
    anomalies?: StatisticalAnomaly[]
    behavioralPatterns?: Map<string, BehavioralPattern>
    predictions?: FinancialPrediction
    complianceChecks?: ComplianceCheck[]
  }
): IntelligentRecommendation[] {
  const recommendations: IntelligentRecommendation[] = []
  
  // توصيات بناءً على قانون بنفورد
  if (analysis.benfordAnalysis?.riskLevel === 'high') {
    recommendations.push({
      category: 'كشف الاحتيال',
      priority: 'critical',
      recommendation: 'إجراء تدقيق جنائي فوري للمعاملات المالية',
      expectedImpact: 'كشف ومنع الاحتيال المحتمل',
      implementation: 'تعيين مدقق خارجي مستقل خلال 48 ساعة'
    })
  }
  
  // توصيات السيولة
  if (analysis.liquidityRatios?.currentRatio.status === 'critical') {
    recommendations.push({
      category: 'إدارة السيولة',
      priority: 'critical',
      recommendation: 'تحسين السيولة بشكل عاجل',
      expectedImpact: 'تجنب العجز عن السداد',
      implementation: 'تسريع التحصيل، تأجيل المدفوعات غير الحرجة، التفاوض على تسهيلات ائتمانية'
    })
  }
  
  // توصيات الكفاءة
  if (analysis.efficiencyRatios && analysis.efficiencyRatios.daysReceivablesOutstanding > 60) {
    recommendations.push({
      category: 'إدارة المدينين',
      priority: 'high',
      recommendation: 'تحسين عملية التحصيل',
      expectedImpact: `تقليل فترة التحصيل بـ ${analysis.efficiencyRatios.daysReceivablesOutstanding - 45} يوم`,
      implementation: 'نظام متابعة آلي، خصومات للسداد المبكر، إجراءات تحصيل صارمة',
      estimatedROI: 15
    })
  }
  
  // توصيات السلوك
  if (analysis.behavioralPatterns) {
    const highRiskUsers = Array.from(analysis.behavioralPatterns.values())
      .filter(p => p.riskScore > 70)
    
    if (highRiskUsers.length > 0) {
      recommendations.push({
        category: 'الأمن والمراقبة',
        priority: 'high',
        recommendation: `مراجعة أنشطة ${highRiskUsers.length} مستخدمين عالي الخطورة`,
        expectedImpact: 'منع الأنشطة الاحتيالية الداخلية',
        implementation: 'تدقيق مفصل للأنشطة، تقييد الصلاحيات، تدريب على الامتثال'
      })
    }
  }
  
  // توصيات الامتثال
  if (analysis.complianceChecks) {
    const failedChecks = analysis.complianceChecks.filter(c => !c.passed)
    
    failedChecks.forEach(check => {
      recommendations.push({
        category: 'الامتثال والحوكمة',
        priority: check.severity === 'error' ? 'critical' : 'medium',
        recommendation: check.action || 'معالجة مشكلة الامتثال',
        expectedImpact: `ضمان الامتثال لقاعدة: ${check.rule}`,
        implementation: check.details
      })
    })
  }
  
  // توصيات التنبؤ
  if (analysis.predictions?.trend === 'decreasing' && analysis.predictions.riskFactors.length > 0) {
    recommendations.push({
      category: 'التخطيط المالي',
      priority: 'medium',
      recommendation: 'وضع خطة طوارئ للانخفاض المتوقع',
      expectedImpact: 'التخفيف من تأثير الانخفاض المتوقع',
      implementation: 'تنويع مصادر الإيرادات، خفض التكاليف المتغيرة، بناء احتياطي'
    })
  }
  
  // ترتيب التوصيات حسب الأولوية
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  
  return recommendations
}
