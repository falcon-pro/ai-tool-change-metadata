// /lib/auth.ts
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      // The name to display on the sign-in form
      name: 'Admin OTP',
      // The credentials are used to generate a suitable form on the sign-in page.
      credentials: {
        otp: { label: "Admin Access Code", type: "password" }
      },
      
      // This is the core of our new logic
      async authorize(credentials) {
        // 1. Get the list of all valid OTPs from the environment variable.
        const otpListString = process.env.ADMIN_OTPS;
        
        // 2. Safety check: If the variable is missing, deny all logins.
        if (!otpListString) {
          console.error("CRITICAL: ADMIN_OTPS environment variable is not set.");
          return null;
        }
        
        // 3. Convert the comma-separated string into an array of clean, valid OTPs.
        // For example: " 112233, 445566 " -> ["112233", "445566"]
        const validOtps = otpListString.split(',').map(otp => otp.trim());

        // 4. Get the OTP that the user typed into the form.
        const userProvidedOtp = credentials?.otp;

        // 5. Check if the user's OTP is present in our list of valid OTPs.
        if (userProvidedOtp && validOtps.includes(userProvidedOtp)) {
          // If it is, create a successful user session.
          // We can give each admin a unique ID based on their OTP for logging purposes later.
          const user = { 
            id: `admin_${userProvidedOtp}`, // e.g., "admin_112233"
            name: `Admin User`,
          };
          console.log(`Successful login for admin: ${user.id}`);
          return user;
        } else {
          // If the OTP is not in the list, reject the login.
          console.warn(`Failed login attempt with OTP: ${userProvidedOtp}`);
          return null;
        }
      }
    })
  ],
  
  // The rest of the configuration remains the same.
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/', // If login fails, redirect back to the home page
  },
  callbacks: {
    // This part is crucial for making the user ID available in our API routes.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};