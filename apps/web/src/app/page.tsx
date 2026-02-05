'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      // Redirect to role-specific dashboard
      const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        RECEPTIONIST: '/receptionist',
        DOCTOR: '/doctor',
        LAB_TECH: '/lab',
        PHARMACIST: '/pharmacist',
        WARD_CLERK: '/ward',
      };
      router.push(roleRoutes[user.role] || '/login');
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
