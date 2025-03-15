import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ServerErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <Head>
        <title>500 - Server Error | Instagram Automation Dashboard</title>
      </Head>
      
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          500 - Server Error
        </h1>
        
        <p className="text-gray-600 mb-6">
          Something went wrong on our server. Please try again later or contact support if the problem persists.
        </p>
        
        <div className="flex flex-col space-y-3">
          <Link 
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors inline-block"
          >
            Return to Dashboard
          </Link>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
} 