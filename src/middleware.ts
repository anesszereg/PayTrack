import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    if (path.startsWith("/admin") && role !== "ADMIN")
      return NextResponse.redirect(new URL("/portal", req.url));
    if (path.startsWith("/portal") && role !== "CLIENT" && role !== "ADMIN")
      return NextResponse.redirect(new URL("/login", req.url));
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = { matcher: ["/admin/:path*", "/portal/:path*"] };
