// app/login/page.tsx
import LoginForm from '@/components/shared/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <LoginForm />
    </main>
  );
}