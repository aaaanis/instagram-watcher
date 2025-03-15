import React from 'react';
import Link from 'next/link';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Component Error</h2>
      <p className="text-gray-600 mb-4">
        An error occurred while rendering this component.
      </p>
      
      <div className="mb-4 p-3 bg-gray-50 rounded text-sm font-mono text-gray-800 overflow-x-auto">
        {error.message}
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={resetErrorBoundary}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <Link 
          href="/"
          className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default ErrorFallback; 