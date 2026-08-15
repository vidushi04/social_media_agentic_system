import React, { useEffect, useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { fetchAdminAnalytics, AdminUnauthorizedError } from './adminApi';

type AdminAuthState = 'checking' | 'authenticated' | 'unauthenticated';

export const AdminApp: React.FC = () => {
  const [authState, setAuthState] = useState<AdminAuthState>('checking');

  useEffect(() => {
    fetchAdminAnalytics()
      .then(() => setAuthState('authenticated'))
      .catch((err) => {
        if (err instanceof AdminUnauthorizedError) {
          setAuthState('unauthenticated');
        } else {
          // Server reachable but some other error (e.g. Supabase misconfigured) —
          // still let them see the login screen rather than a blank page.
          setAuthState('unauthenticated');
        }
      });
  }, []);

  if (authState === 'checking') {
    return (
      <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AdminLogin onSuccess={() => setAuthState('authenticated')} />;
  }

  return <AdminDashboard onUnauthorized={() => setAuthState('unauthenticated')} />;
};
