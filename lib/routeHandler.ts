// lib/routeHandler.ts
import { NextRequest, NextResponse } from "next/server";

type HandlerFunction = (req: NextRequest, params: Record<string, string>) => Promise<NextResponse>;

export function withRouteHandler(handler: HandlerFunction) {
  return async (req: NextRequest, context: { params: Record<string, string> }) => {
    try {
      return await handler(req, context.params);
    } catch (e: any) {
      return new NextResponse(`Internal Server Error: ${e.message}`, { status: 500 });
    }
  };
}