import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    superAdmin?: boolean;
  }

  interface Session {
    user: User & {
      id: string;
      role: string;
      superAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    superAdmin?: boolean;
    name?: string | null;
    email?: string | null;
  }
}
