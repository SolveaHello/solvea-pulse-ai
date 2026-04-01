// Mock auth for local demo - bypasses Clerk authentication
export function auth() {
  return Promise.resolve({ userId: "local-demo-user" });
}
