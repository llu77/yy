
"use client"

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { RevenueRecord } from "@/app/(app)/revenue/page";

const chartConfig = {
  revenue: {
    label: "الإيرادات",
    color: "hsl(var(--chart-1))",
  },
  expenses: { // This can be added later if needed
    label: "المصاريف",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

// Helper to get week of the month
function getWeekOfMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstDay) / 7);
}


export function RevenueChart({ chartData }: { chartData: RevenueRecord[] }) {
  
  const aggregatedData = useMemo(() => {
    const weeklyData: { [key: string]: number } = {
      "الأسبوع 1": 0,
      "الأسبوع 2": 0,
      "الأسبوع 3": 0,
      "الأسبوع 4": 0,
      "الأسبوع 5": 0,
    };

    chartData.forEach(record => {
      const date = new Date(record.date);
      const week = getWeekOfMonth(date);
      weeklyData[`الأسبوع ${week}`] += record.totalRevenue;
    });

    return Object.entries(weeklyData).map(([week, revenue]) => ({
      name: week,
      revenue: revenue / 1000 // Convert to thousands for chart
    })).filter(d => d.revenue > 0);

  }, [chartData]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>نظرة عامة على الإيرادات</CardTitle>
        <CardDescription>الإيرادات الأسبوعية للفرع المحدد هذا الشهر</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={aggregatedData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
             <YAxis
                tickFormatter={(value) => `${value} ألف`}
                axisLine={false}
                tickLine={false}
                width={80}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
