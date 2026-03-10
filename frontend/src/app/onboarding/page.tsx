'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnboardingStatus, useCompleteOnboarding } from '@/domains/organizations';
import type { CreateOrganizationRequest, OnboardingData } from '@/domains/organizations';
import { Loader2, Building2, User, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Organization', description: 'Configure your organization' },
  { id: 2, title: 'Admin User', description: 'Create admin account' },
  { id: 3, title: 'Complete', description: 'Finish setup' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: status, isLoading } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();
  
  const [step, setStep] = useState(1);
  const [orgData, setOrgData] = useState<CreateOrganizationRequest>({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
    address_country: 'France',
  });
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status?.completed) {
      router.push('/dashboard');
    }
  }, [status?.completed, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Checking setup status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!orgData.name.trim()) newErrors.name = 'Organization name is required';
      if (orgData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (currentStep === 2) {
      if (!adminData.email.trim()) newErrors.admin_email = 'Admin email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.email)) {
        newErrors.admin_email = 'Invalid email format';
      }
      if (!adminData.password || adminData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (!adminData.first_name.trim()) newErrors.first_name = 'First name is required';
      if (!adminData.last_name.trim()) newErrors.last_name = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    const data: OnboardingData = {
      organization: orgData,
      admin_email: adminData.email,
      admin_password: adminData.password,
      admin_first_name: adminData.first_name,
      admin_last_name: adminData.last_name,
    };

    try {
      await completeOnboarding.mutateAsync(data);
      setStep(3);
    } catch {
      setErrors({ submit: 'Failed to complete onboarding. Please try again.' });
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to RPMA</h1>
          <p className="text-muted-foreground">Let&apos;s set up your organization</p>
        </div>

        <div className="flex justify-center gap-4">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.id ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4 flex items-center justify-center text-sm font-medium">
                  {s.id}
                </span>
              )}
              <span className="text-sm font-medium">{s.title}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Organization Details</CardTitle>
              </div>
              <CardDescription>
                Enter your organization&apos;s basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={orgData.name}
                    onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                    placeholder="My Company"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={orgData.email || ''}
                    onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                    placeholder="contact@company.com"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={orgData.phone || ''}
                    onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={orgData.address_street || ''}
                    onChange={(e) => setOrgData({ ...orgData, address_street: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={orgData.address_city || ''}
                    onChange={(e) => setOrgData({ ...orgData, address_city: e.target.value })}
                    placeholder="Paris"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">Postal Code</Label>
                  <Input
                    id="zip"
                    value={orgData.address_zip || ''}
                    onChange={(e) => setOrgData({ ...orgData, address_zip: e.target.value })}
                    placeholder="75001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={orgData.address_country || 'France'}
                    onChange={(e) => setOrgData({ ...orgData, address_country: e.target.value })}
                    placeholder="France"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleNext}>
                Next Step
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Administrator Account</CardTitle>
              </div>
              <CardDescription>
                Create the first administrator account for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.submit && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin_first_name">First Name *</Label>
                  <Input
                    id="admin_first_name"
                    value={adminData.first_name}
                    onChange={(e) => setAdminData({ ...adminData, first_name: e.target.value })}
                    placeholder="John"
                  />
                  {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_last_name">Last Name *</Label>
                  <Input
                    id="admin_last_name"
                    value={adminData.last_name}
                    onChange={(e) => setAdminData({ ...adminData, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                  {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="admin_email">Email *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    placeholder="admin@company.com"
                  />
                  {errors.admin_email && <p className="text-sm text-destructive">{errors.admin_email}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="admin_password">Password *</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={completeOnboarding.isPending}
              >
                {completeOnboarding.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Complete Setup
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Setup Complete!</h2>
                <p className="text-muted-foreground">
                  Your organization has been created successfully. You can now start using RPMA.
                </p>
                <Button onClick={handleFinish} size="lg">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
