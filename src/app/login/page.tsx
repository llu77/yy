
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, userDetails, login, loading, error: authError } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && userDetails) {
        router.push('/');
    }
  }, [user, userDetails, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بعودتك! سيتم توجيهك الآن.",
      });
      // The useEffect hook will handle redirection once the user object is confirmed.
    } 
    // The useAuth hook will now set the error, so we don't need a separate toast here.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/60">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-3xl font-bold">مرحباً بعودتك</CardTitle>
          <CardDescription>
            سجل الدخول إلى حسابك في BranchFlow لإدارة فروعك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {authError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>خطأ في تسجيل الدخول</AlertTitle>
                    <AlertDescription>{authError}</AlertDescription>
                </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                />
            </div>
            <Button type="submit" className="w-full text-lg font-bold" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
            </Button>
          </form>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">© 2024 BranchFlow. جميع الحقوق محفوظة.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
