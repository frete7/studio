import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/providers/auth-provider';

const inter = Inter({ 
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Frete7 - Plataforma de Fretes Inteligente',
    template: '%s | Frete7',
  },
  description: 'Conectamos empresas e motoristas para otimizar o transporte de cargas em todo o Brasil. Use nossa IA para encontrar as melhores rotas e oportunidades.',
  keywords: ['frete', 'transporte', 'logística', 'motorista', 'empresa', 'carga', 'rota', 'otimização'],
  authors: [{ name: 'Frete7 Team' }],
  creator: 'Frete7',
  publisher: 'Frete7',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://frete7.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://frete7.com',
    title: 'Frete7 - Plataforma de Fretes Inteligente',
    description: 'Conectamos empresas e motoristas para otimizar o transporte de cargas em todo o Brasil.',
    siteName: 'Frete7',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Frete7 - Plataforma de Fretes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frete7 - Plataforma de Fretes Inteligente',
    description: 'Conectamos empresas e motoristas para otimizar o transporte de cargas em todo o Brasil.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
