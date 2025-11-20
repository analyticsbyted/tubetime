import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// Trim GitHub ID to remove leading space
const githubId = process.env.GITHUB_ID?.trim() || process.env.GITHUB_ID

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: githubId,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
}

// NextAuth v5 beta: NextAuth() returns an object with handlers
const authHandler = NextAuth(authOptions)

// Extract GET and POST handlers - handle both v4 and v5 beta patterns
let GET, POST

if (typeof authHandler === 'function') {
  // v4 pattern: NextAuth returns a function
  GET = authHandler
  POST = authHandler
} else if (authHandler?.handlers) {
  // v5 beta pattern: NextAuth returns { handlers: { GET, POST } }
  GET = authHandler.handlers.GET
  POST = authHandler.handlers.POST
} else if (authHandler?.GET && authHandler?.POST) {
  // Alternative v5 pattern: NextAuth returns { GET, POST }
  GET = authHandler.GET
  POST = authHandler.POST
} else {
  // Fallback: try to use the object as a handler
  GET = authHandler
  POST = authHandler
}

export { GET, POST }