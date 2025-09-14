"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }

      if (session) {
        try {
          const response = await fetch('/api/user/check');
          const userData = await response.json();
          
          if (userData.hasRole) {
            // User has a role, redirect to appropriate dashboard
            router.push(userData.role === 'buyer' ? '/buyer/dashboard' : '/seller/dashboard');
          } else {
            // New user, redirect to role selection
            router.push('/auth/role-select');
          }
        } catch (error) {
          console.error('Error checking user:', error);
          router.push('/auth/role-select');
        }
      }
    };

    handleCallback();
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Setting up your account...</p>
      </div>
    </div>
  );
}