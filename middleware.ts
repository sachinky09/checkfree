import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add any custom middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without authentication
        if (req.nextUrl.pathname.startsWith('/auth/')) {
          return true;
        }
        
        // Require authentication for all other protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/buyer/:path*',
    '/seller/:path*',
    '/auth/role-select',
    '/auth/callback'
  ]
};