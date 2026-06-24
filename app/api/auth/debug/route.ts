import { NextResponse } from "next/server";

export async function GET() {
  const pwd = process.env.APP_PASSWORD;
  return NextResponse.json({
    defined: !!pwd,
    length: pwd?.length ?? 0,
    first3: pwd ? pwd.slice(0, 3) : null,
  });
}
