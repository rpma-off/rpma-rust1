'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function UnauthorizedPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            {t('auth.accessDenied')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">
            {t('errors.permissionDenied')}
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => router.back()} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              {t('nav.home')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

