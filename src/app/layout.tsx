
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { ErrorBoundary, AsyncErrorBoundary } from '@/components/error-boundary';


export const metadata: Metadata = {
  title: 'BranchFlow',
  description: 'نظام إدارة الفروع المتكامل',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-background antialiased">
        <ErrorBoundary>
          <AsyncErrorBoundary>
            <AuthProvider>
              {children}
            </AuthProvider>
          </AsyncErrorBoundary>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
