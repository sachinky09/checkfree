"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
    } else {
      // Check user role and redirect appropriately
      const checkRole = async () => {
        try {
          const response = await fetch('/api/user/check');
          const userData = await response.json();
          
          if (userData.hasRole) {
            router.push(userData.role === 'buyer' ? '/buyer/dashboard' : '/seller/dashboard');
          } else {
            router.push('/auth/role-select');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          router.push('/auth/role-select');
        }
      };

      checkRole();
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading CheckFree...</p>
      </div>
    </div>
  );
}