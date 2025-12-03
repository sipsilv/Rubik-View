/**
 * Authentication utility functions
 */

/**
 * Logout function that properly clears all authentication data
 */
export function logout(): void {
  // Clear localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("loginTimestamp");
  
  // Clear all cookies (including token cookie)
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
    // Clear cookie by setting it to expire
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
  });
  
  // Redirect to login page
  window.location.href = "/login";
}

/**
 * Check if user is authenticated by verifying token exists
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  return !!token;
}

/**
 * Get current user role
 */
export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role");
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(): boolean {
  const role = getUserRole();
  return role === "admin" || role === "superadmin";
}

