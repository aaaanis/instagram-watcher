import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto py-3 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="font-bold text-xl text-blue-600">
              <Link href="/" className="hover:text-blue-800 transition-colors">
                Instagram Automation
              </Link>
            </h1>
          </div>
          <nav>
            <ul className="flex space-x-8">
              <li>
                <Link
                  href="/"
                  className={`hover:text-blue-600 transition-colors py-2 ${
                    router.pathname === '/' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'
                  }`}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/logs"
                  className={`hover:text-blue-600 transition-colors py-2 ${
                    router.pathname === '/logs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'
                  }`}
                >
                  Logs
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className={`hover:text-blue-600 transition-colors py-2 ${
                    router.pathname === '/settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'
                  }`}
                >
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="flex-grow py-6">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0 text-gray-600 text-sm">
              <p>&copy; {new Date().getFullYear()} Instagram Automation Dashboard</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                About
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 