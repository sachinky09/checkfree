import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import clientPromise from '../../../lib/mongodb';
import { encryptToken } from '../../../lib/encryption';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const client = await clientPromise;
          const db = client.db('checkfree');
          const users = db.collection('users');
          
          const existingUser = await users.findOne({ email: user.email });
          
          if (!existingUser && account.refresh_token) {
            // New user - will be handled in role selection
            await users.insertOne({
              email: user.email,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              refreshToken: encryptToken(account.refresh_token),
              role: null,
              createdAt: new Date(),
            });
          } else if (existingUser && account.refresh_token) {
            // Update refresh token for existing user
            await users.updateOne(
              { email: user.email },
              {
                $set: {
                  refreshToken: encryptToken(account.refresh_token),
                  updatedAt: new Date(),
                }
              }
            );
          }
          
          return true;
        } catch (error) {
          console.error('SignIn error:', error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, account, user }) {
      if (account && user) {
        try {
          const client = await clientPromise;
          const db = client.db('checkfree');
          const users = db.collection('users');
          
          const dbUser = await users.findOne({ email: user.email });
          
          token.userId = dbUser?._id?.toString();
          token.role = dbUser?.role;
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
        } catch (error) {
          console.error('JWT error:', error);
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string;
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);