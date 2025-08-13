// /app/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LoginForm } from '@/components/shared/LoginForm'; // <-- THE FIX IS HERE. { LoginForm } instead of LoginForm
import { redirect } from 'next/navigation';
import { UploaderPage } from '@/components/pages/UploaderPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <LoginForm />
      </main>
    );
  }
  
  // If we want the main page to be the uploader after login
  return <UploaderPage userName={session.user?.name} />;

  // OR, if we want to redirect to the dashboard automatically
  // redirect('/dashboard'); 
}