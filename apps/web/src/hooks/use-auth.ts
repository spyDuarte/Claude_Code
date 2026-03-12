'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, clearAuth, isAuthenticated } from '@/lib/auth';
import { authApi } from '@/lib/api';
import type { StoredUser } from '@/lib/auth';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!isAuthenticated()) {
        if (requireAuth) router.push('/login');
        setLoading(false);
        return;
      }

      const stored = getStoredUser();
      if (stored) {
        setUser(stored);
        setLoading(false);
        return;
      }

      try {
        const me = await authApi.me();
        setUser({ id: me.id, name: me.name, email: me.email });
      } catch {
        clearAuth();
        if (requireAuth) router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [requireAuth, router]);

  const logout = () => {
    clearAuth();
    router.push('/login');
  };

  return { user, loading, logout };
}
