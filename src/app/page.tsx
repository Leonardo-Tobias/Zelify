'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const savedGestor = localStorage.getItem('zelify_gestor');
    if (savedGestor) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center">
      {/* Loader sutil durante o redirecionamento rápido */}
      <div className="w-6 h-6 border-2 border-t-transparent border-[#001CFF] rounded-full animate-spin"></div>
    </div>
  );
}
