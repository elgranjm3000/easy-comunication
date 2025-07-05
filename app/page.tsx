'use client';

import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Navigation } from '@/components/dashboard/navigation';
import { SearchFilters } from '@/components/dashboard/search-filters';
import { NumbersTable } from '@/components/numbers/numbers-table';

export default function Home() {
  const { user } = useAuth();

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  // Show dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="p-6 space-y-6">
          <DashboardHeader />
          <SearchFilters />
          <NumbersTable />
        </main>
      </div>
    </div>
  );
}