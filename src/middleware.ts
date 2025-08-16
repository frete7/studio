import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que não precisam de autenticação
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/api/auth',
  '/favicon.ico',
  '/_next',
  '/static',
];

// Rotas que precisam de autenticação
const protectedRoutes = [
  '/profile',
  '/driver-dashboard',
  '/company-dashboard',
  '/admin',
  '/fretes/solicitar',
  '/solicitar-frete',
  '/support',
];

// Rotas que precisam de role específico
const adminRoutes = ['/admin'];
const companyRoutes = ['/company-dashboard', '/fretes/solicitar'];
const driverRoutes = ['/driver-dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar se é uma rota pública
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar se é uma rota protegida
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Aqui você pode adicionar lógica adicional de verificação
    // Por exemplo, verificar tokens JWT ou cookies de sessão
    
    // Por enquanto, permitimos o acesso e deixamos a verificação para o componente
    // Em produção, você deve implementar verificação de token aqui
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
