import type { AppProps } from 'next/app';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { ErrorProvider } from '../components/ErrorProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorProvider>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ErrorProvider>
  );
} 