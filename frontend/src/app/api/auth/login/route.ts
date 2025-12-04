import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Send to FastAPI
  const apiRes = await fetch("http://localhost:8000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await apiRes.json();

  const token = data.access_token;

  if (!token) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  // Create response and set cookie
  const res = NextResponse.json({ success: true });

  res.cookies.set("jwt", token, {
    httpOnly: true, // JS cannot read it → protects from XSS
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}