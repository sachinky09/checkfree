"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar } from 'lucide-react';

export default function RoleSelect() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, router]);

  const handleRoleSelect = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const response = await fetch('/api/user/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (response.ok) {
        router.push(selectedRole === 'buyer' ? '/buyer/dashboard' : '/seller/dashboard');
      } else {
        console.error('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Welcome to CheckFree</CardTitle>
          <CardDescription>
            Hi {session.user?.name}! Please select your role to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card 
              className={`cursor-pointer transition-all ${selectedRole === 'buyer' 
                ? 'border-blue-500 bg-blue-50' 
                : 'hover:border-gray-300'
              }`}
              onClick={() => setSelectedRole('buyer')}
            >
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <h3 className="text-xl font-semibold mb-2">I'm a Buyer</h3>
                <p className="text-gray-600">
                  I want to book appointments with sellers and manage my schedule
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${selectedRole === 'seller' 
                ? 'border-green-500 bg-green-50' 
                : 'hover:border-gray-300'
              }`}
              onClick={() => setSelectedRole('seller')}
            >
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2">I'm a Seller</h3>
                <p className="text-gray-600">
                  I want to offer my availability and receive bookings from buyers
                </p>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={handleRoleSelect}
            disabled={!selectedRole || loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Setting up your account...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}