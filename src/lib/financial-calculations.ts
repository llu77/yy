// مكتبة الحسابات المالية الدقيقة

// نسب الأداء المالي
export interface FinancialRatios {
  costRatio: number           // نسبة التكاليف
  profitMargin: number        // هامش الربح
  turnoverRate: number        // معدل دوران الموظفين
  avgEmployeeCost: number     // متوسط تكلفة الموظف
  salaryToRevenueRatio: number // نسبة الرواتب للإيرادات
}

export function calculateFinancialRatios(data: {
  totalSalaries: number
  totalRevenue: number
  totalExpenses: number
  employeeCount: number
  leftEmployees: number
  avgEmployeeCount: number
}): FinancialRatios {
  const { totalSalaries, totalRevenue, totalExpenses, employeeCount, leftEmployees, avgEmployeeCount } = data
  
  // نسبة التكاليف = (إجمالي الرواتب ÷ الإيرادات) × 100
  const costRatio = totalRevenue > 0 ? (totalSalaries / totalRevenue) * 100 : 0
  
  // هامش الربح = ((الإيرادات - المصروفات) ÷ الإيرادات) × 100
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
  
  // معدل دوران الموظفين = (عدد المغادرين ÷ متوسط عدد الموظفين) × 100
  const turnoverRate = avgEmployeeCount > 0 ? (leftEmployees / avgEmployeeCount) * 100 : 0
  
  // متوسط تكلفة الموظف = إجمالي المصروفات ÷ عدد الموظفين
  const avgEmployeeCost = employeeCount > 0 ? totalExpenses / employeeCount : 0
  
  // نسبة الرواتب للإيرادات
  const salaryToRevenueRatio = totalRevenue > 0 ? (totalSalaries / totalRevenue) * 100 : 0
  
  return {
    costRatio: Math.round(costRatio * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    turnoverRate: Math.round(turnoverRate * 100) / 100,
    avgEmployeeCost: Math.round(avgEmployeeCost * 100) / 100,
    salaryToRevenueRatio: Math.round(salaryToRevenueRatio * 100) / 100
  }
}

// التنبؤات المالية
export interface FinancialForecast {
  expectedMonthlyExpenses: number
  emergencyReserve: number
  growthRate: number
  projectedRevenue: number
  projectedExpenses: number
  cashFlowForecast: number
}

export function calculateFinancialForecast(
  monthlyData: Array<{ revenue: number; expenses: number }>,
  growthFactor: number = 1.05 // معامل النمو الافتراضي 5%
): FinancialForecast {
  if (monthlyData.length < 3) {
    throw new Error('Need at least 3 months of data for forecast')
  }
  
  // المتوسط المتحرك لآخر 3 شهور
  const recentData = monthlyData.slice(-3)
  const avgRevenue = recentData.reduce((sum, d) => sum + d.revenue, 0) / 3
  const avgExpenses = recentData.reduce((sum, d) => sum + d.expenses, 0) / 3
  
  // حساب معدل النمو الفعلي
  let growthRate = growthFactor
  if (monthlyData.length >= 6) {
    const oldAvg = monthlyData.slice(0, 3).reduce((sum, d) => sum + d.revenue, 0) / 3
    const newAvg = monthlyData.slice(-3).reduce((sum, d) => sum + d.revenue, 0) / 3
    if (oldAvg > 0) {
      growthRate = newAvg / oldAvg
    }
  }
  
  // توقع المصروفات الشهرية = المتوسط المتحرك لآخر 3 شهور × معامل النمو
  const expectedMonthlyExpenses = avgExpenses * growthRate
  
  // احتياطي الطوارئ = 3 × متوسط المصروفات الشهرية
  const emergencyReserve = avgExpenses * 3
  
  // التوقعات
  const projectedRevenue = avgRevenue * growthRate
  const projectedExpenses = expectedMonthlyExpenses
  const cashFlowForecast = projectedRevenue - projectedExpenses
  
  return {
    expectedMonthlyExpenses: Math.round(expectedMonthlyExpenses * 100) / 100,
    emergencyReserve: Math.round(emergencyReserve * 100) / 100,
    growthRate: Math.round((growthRate - 1) * 10000) / 100, // نسبة مئوية
    projectedRevenue: Math.round(projectedRevenue * 100) / 100,
    projectedExpenses: Math.round(projectedExpenses * 100) / 100,
    cashFlowForecast: Math.round(cashFlowForecast * 100) / 100
  }
}

// مؤشرات الإنذار المبكر
export interface WarningIndicator {
  type: 'HIGH_EXPENSE_RATIO' | 'LOW_LIQUIDITY' | 'NEGATIVE_GROWTH' | 'HIGH_COST_GROWTH'
  message: string
  severity: 'warning' | 'danger' | 'critical'
  value: number
  threshold: number
}

export function checkWarningIndicators(data: {
  revenue: number
  expenses: number
  liquidity: number
  expenseGrowth: number
  revenueGrowth: number
  monthlyExpenses: number
}): WarningIndicator[] {
  const warnings: WarningIndicator[] = []
  
  // تنبيه إذا (المصروفات > 80% من الإيرادات)
  const expenseRatio = data.revenue > 0 ? (data.expenses / data.revenue) * 100 : 100
  if (expenseRatio > 80) {
    warnings.push({
      type: 'HIGH_EXPENSE_RATIO',
      message: `المصروفات تتجاوز ${expenseRatio.toFixed(1)}% من الإيرادات`,
      severity: expenseRatio > 90 ? 'critical' : 'danger',
      value: expenseRatio,
      threshold: 80
    })
  }
  
  // تنبيه إذا (السيولة < مصروفات شهرين)
  const monthsOfLiquidity = data.monthlyExpenses > 0 ? data.liquidity / data.monthlyExpenses : 0
  if (monthsOfLiquidity < 2) {
    warnings.push({
      type: 'LOW_LIQUIDITY',
      message: `السيولة تكفي لـ ${monthsOfLiquidity.toFixed(1)} شهر فقط`,
      severity: monthsOfLiquidity < 1 ? 'critical' : 'danger',
      value: monthsOfLiquidity,
      threshold: 2
    })
  }
  
  // تنبيه إذا (نمو المصروفات > نمو الإيرادات)
  if (data.expenseGrowth > data.revenueGrowth && data.revenueGrowth >= 0) {
    const growthDiff = data.expenseGrowth - data.revenueGrowth
    warnings.push({
      type: 'HIGH_COST_GROWTH',
      message: `نمو المصروفات (${data.expenseGrowth.toFixed(1)}%) يتجاوز نمو الإيرادات (${data.revenueGrowth.toFixed(1)}%)`,
      severity: growthDiff > 10 ? 'danger' : 'warning',
      value: growthDiff,
      threshold: 0
    })
  }
  
  // تنبيه للنمو السلبي
  if (data.revenueGrowth < 0) {
    warnings.push({
      type: 'NEGATIVE_GROWTH',
      message: `انخفاض في الإيرادات بنسبة ${Math.abs(data.revenueGrowth).toFixed(1)}%`,
      severity: data.revenueGrowth < -10 ? 'critical' : 'danger',
      value: data.revenueGrowth,
      threshold: 0
    })
  }
  
  return warnings
}

// حساب الراتب بدقة عالية
export interface SalaryCalculationResult {
  basicSalary: number
  bonuses: number
  overtime: number
  allowances: number
  socialInsurance: number
  tax: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
}

export function calculateSalaryWithPrecision(data: {
  basicSalary: number
  bonuses?: number
  overtime?: number
  allowances?: number
  otherDeductions?: number
  socialInsuranceRate?: number
  taxBrackets?: Array<{ min: number; max: number; rate: number }>
}): SalaryCalculationResult {
  const {
    basicSalary,
    bonuses = 0,
    overtime = 0,
    allowances = 0,
    otherDeductions = 0,
    socialInsuranceRate = 0.09,
    taxBrackets = [
      { min: 0, max: 10000, rate: 0 },
      { min: 10000, max: 20000, rate: 0.1 },
      { min: 20000, max: Infinity, rate: 0.15 }
    ]
  } = data
  
  // حساب التأمينات الاجتماعية
  const socialInsurance = basicSalary * socialInsuranceRate
  
  // حساب الضريبة بناءً على الشرائح
  let tax = 0
  let remainingSalary = basicSalary
  
  for (const bracket of taxBrackets) {
    if (remainingSalary <= 0) break
    
    const taxableInBracket = Math.min(
      remainingSalary,
      bracket.max - bracket.min
    )
    
    if (basicSalary > bracket.min) {
      tax += taxableInBracket * bracket.rate
      remainingSalary -= taxableInBracket
    }
  }
  
  // إجمالي الخصومات
  const totalDeductions = socialInsurance + tax + otherDeductions
  
  // صافي الراتب
  const netSalary = basicSalary + bonuses + overtime + allowances - totalDeductions
  
  // التأكد من عدم وجود راتب سالب
  const finalNetSalary = Math.max(0, netSalary)
  
  return {
    basicSalary: Math.round(basicSalary * 100) / 100,
    bonuses: Math.round(bonuses * 100) / 100,
    overtime: Math.round(overtime * 100) / 100,
    allowances: Math.round(allowances * 100) / 100,
    socialInsurance: Math.round(socialInsurance * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    otherDeductions: Math.round(otherDeductions * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary: Math.round(finalNetSalary * 100) / 100
  }
}

// تحليل الاتجاهات
export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable'
  averageChange: number
  volatility: number
  forecast: number
}

// تنبؤ الإيرادات باستخدام الانحدار الخطي البسيط
export function forecastRevenue(historicalData: number[]): {
  nextPeriod: number
  trend: 'increasing' | 'decreasing' | 'stable'
  confidence: number
} {
    if (historicalData.length < 2) {
        return {
            nextPeriod: historicalData[0] || 0,
            trend: 'stable',
            confidence: 0
        };
    }
  const n = historicalData.length
  const x = Array.from({ length: n }, (_, i) => i + 1)
  const y = historicalData
  
  // حساب معاملات الانحدار الخطي
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // التنبؤ للفترة التالية
  const nextPeriod = slope * (n + 1) + intercept
  
  // تحديد الاتجاه
  const trend = slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable'
  
  // حساب معامل الثقة (R²)
  const yMean = sumY / n
  const totalSS = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const residualSS = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept
    return sum + Math.pow(yi - predicted, 2)
  }, 0)
  const confidence = totalSS > 0 ? 1 - (residualSS / totalSS) : 1;
  
  return {
    nextPeriod: Math.max(0, nextPeriod),
    trend,
    confidence: Math.min(1, Math.max(0, confidence))
  }
}

export function analyzeTrend(values: number[]): TrendAnalysis {
  if (values.length < 2) {
    return {
      trend: 'stable',
      averageChange: 0,
      volatility: 0,
      forecast: values[0] || 0
    }
  }
  
  // حساب التغييرات
  const changes: number[] = []
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    changes.push(change)
  }
  
  // متوسط التغيير
  const averageChange = changes.reduce((sum, c) => sum + c, 0) / changes.length
  
  // التذبذب (الانحراف المعياري للتغييرات)
  const changeVariance = changes.reduce((sum, c) => sum + Math.pow(c - averageChange, 2), 0) / changes.length
  const volatility = Math.sqrt(changeVariance)
  
  // تحديد الاتجاه
  let trend: 'increasing' | 'decreasing' | 'stable'
  if (Math.abs(averageChange) < volatility * 0.5) {
    trend = 'stable'
  } else if (averageChange > 0) {
    trend = 'increasing'
  } else {
    trend = 'decreasing'
  }
  
  // التنبؤ بالقيمة التالية
  const lastValue = values[values.length - 1]
  const forecast = lastValue + averageChange
  
  return {
    trend,
    averageChange: Math.round(averageChange * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    forecast: Math.round(forecast * 100) / 100
  }
}
