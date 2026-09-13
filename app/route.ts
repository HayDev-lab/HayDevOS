export function GET(request: Request) { return Response.redirect(new URL("/hy", request.url), 307); }
