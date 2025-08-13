// /app/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LoginForm } from '@/components/shared/LoginForm';
import { redirect } from 'next/navigation';
import { UploaderPage } from '@/components/pages/UploaderPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If there is no session, show the login form.
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <LoginForm />
      </main>
    );
  }
  
  // If there IS a session, show the main uploader page.
  // We are creating a new component for this to keep it clean.
  return <UploaderPage userName={session.user?.name} />;
}