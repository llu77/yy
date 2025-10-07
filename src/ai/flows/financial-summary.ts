/**
 * @fileOverview An AI-powered financial summary generator.
 *
 * - generateFinancialSummary - A function that generates a financial summary.
 * - FinancialSummaryInput - The input type for the generateFinancialSummary function.
 * - FinancialSummaryOutput - The return type for the generateFinancialSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialSummaryInputSchema = z.object({
  revenue: z.number().describe('Total revenue for the period.'),
  expenses: z.number().describe('Total expenses for the period.'),
  startDate: z.string().describe('The start date of the period (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the period (YYYY-MM-DD).'),
});
export type FinancialSummaryInput = z.infer<typeof FinancialSummaryInputSchema>;

const FinancialSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the financial performance.'),
  keyInsights: z.string().describe('Key insights and trends identified in the data.'),
});
export type FinancialSummaryOutput = z.infer<typeof FinancialSummaryOutputSchema>;

export async function generateFinancialSummary(input: FinancialSummaryInput): Promise<FinancialSummaryOutput> {
  return financialSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialSummaryPrompt',
  input: {schema: FinancialSummaryInputSchema},
  output: {schema: FinancialSummaryOutputSchema},
  prompt: `You are an AI assistant that summarizes financial data.

  Provide a concise summary of the financial performance between {{startDate}} and {{endDate}} considering the following data:
  Revenue: {{revenue}}
  Expenses: {{expenses}}

  Also, identify key insights and trends based on the provided data. Be concise and professional.
  `,
});

const financialSummaryFlow = ai.defineFlow(
  {
    name: 'financialSummaryFlow',
    inputSchema: FinancialSummaryInputSchema,
    outputSchema: FinancialSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
