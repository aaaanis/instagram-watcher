import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function DashboardCard({ title, children, className = '' }: DashboardCardProps) {
  return (
    <div className={`p-5 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-800 mb-5">{title}</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function MetricDisplay({ 
  value, 
  label, 
  color = 'text-blue-600',
  size = 'large',
  className = ''
}: {
  value: string | number;
  label: string;
  color?: string;
  size?: 'large' | 'medium' | 'small';
  className?: string;
}) {
  const valueClass = size === 'large' 
    ? 'text-3xl font-bold' 
    : size === 'medium' 
      ? 'text-2xl font-bold' 
      : 'text-xl font-bold';

  return (
    <div className={`text-center ${className}`}>
      <div className={`${valueClass} ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
      {message}
    </div>
  );
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  listItems = [],
  footer = ''
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  listItems?: string[];
  footer?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">
        {description}
      </p>
      {listItems.length > 0 && (
        <ul className="text-sm text-gray-500 mb-4 list-disc pl-5 text-left">
          {listItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {footer && (
        <p className="text-sm text-gray-400">
          {footer}
        </p>
      )}
    </div>
  );
}

export function NoChangeState() {
  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="text-gray-500 text-center py-4">
        <div className="text-yellow-500 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-medium">No followings change found yet.</p>
        <p className="text-sm mt-1">Changes will be tracked over time as data is collected.</p>
      </div>
    </div>
  );
} 