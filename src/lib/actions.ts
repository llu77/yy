"use server";

import { generateFinancialSummary, type FinancialSummaryInput } from "@/ai/flows/financial-summary";
import { z } from "zod";

const formSchema = z.object({
  revenue: z.coerce.number().positive({ message: "يجب أن يكون الإيراد رقمًا موجبًا." }),
  expenses: z.coerce.number().positive({ message: "يجب أن تكون المصاريف رقمًا موجبًا." }),
  startDate: z.string().min(1, { message: "تاريخ البدء مطلوب." }),
  endDate: z.string().min(1, { message: "تاريخ الانتهاء مطلوب." }),
});

export type FormState = {
  success: boolean;
  message: string;
  data?: {
    summary: string;
    keyInsights: string;
  };
  errors?: {
    revenue?: string[];
    expenses?: string[];
    startDate?: string[];
    endDate?: string[];
  }
};

export async function getFinancialSummary(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const rawFormData = Object.fromEntries(formData.entries());
  
  const validatedFields = formSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "الرجاء تصحيح الأخطاء في النموذج.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const input: FinancialSummaryInput = validatedFields.data;
    const result = await generateFinancialSummary(input);
    return { 
        success: true,
        message: "تم إنشاء الملخص بنجاح.",
        data: result
    };
  } catch (error) {
    return {
        success: false,
        message: "حدث خطأ أثناء إنشاء الملخص. الرجاء المحاولة مرة أخرى."
    };
  }
}
