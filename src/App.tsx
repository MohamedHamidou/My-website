import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/layout/AppShell'
import { SignInPage } from '@/pages/auth/SignIn'
import { SignUpPage } from '@/pages/auth/SignUp'
import { BudgetsPage } from '@/pages/Budgets'
import { DashboardPage } from '@/pages/Dashboard'
import { ExpensesPage } from '@/pages/Expenses'
import { InventoryPage } from '@/pages/Inventory'
import { OnboardingPage } from '@/pages/Onboarding'
import { SettingsPage } from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="auth/sign-in" element={<SignInPage />} />
      <Route path="auth/sign-up" element={<SignUpPage />} />

      <Route element={<AuthGate />}>
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="theme" element={<Navigate to="/settings" replace />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
