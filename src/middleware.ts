import { NextResponse, type NextRequest } from "next/server";

export const ADMIN_AUTH_COOKIE = "admin_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.next();

  const cookie = req.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  if (cookie === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
