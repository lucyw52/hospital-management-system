import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/store/auth-store';

export function useAuthGuard(allowedRoles?: UserRole[]) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, user } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
  }));

  // Stabilise the roles array so a new literal on every render doesn't
  // retrigger the effect (the roles never change at runtime).
  const allowedRolesRef = useRef(allowedRoles);

  useEffect(() => {
    const roles = allowedRolesRef.current;

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    // If specific roles are required, check if user has the right role
    if (roles && roles.length > 0) {
      if (!roles.includes(user.role)) {
        // Redirect to their appropriate dashboard
        const roleRoutes: Record<UserRole, string> = {
          ADMIN: '/admin',
          RECEPTIONIST: '/receptionist',
          DOCTOR: '/doctor',
          LAB_TECH: '/lab',
          PHARMACIST: '/pharmacist',
          WARD_CLERK: '/ward',
        };
        router.replace(roleRoutes[user.role] || '/login');
        return;
      }
    }

    setIsChecking(false);
  }, [isAuthenticated, user, router]);

  return { isAuthenticated, user, isChecking };
}
