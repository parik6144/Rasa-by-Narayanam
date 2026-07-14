/** Map auth errors to HTTP responses for admin APIs. */
export function authErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return { status: 401 as const, body: { error: "Unauthorized" } };
  }
  if (msg === "FORBIDDEN") {
    return { status: 403 as const, body: { error: "Forbidden" } };
  }
  return { status: 500 as const, body: { error: msg || "Server error" } };
}
