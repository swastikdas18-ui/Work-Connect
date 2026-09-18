/**
 * Utility to sanitize raw backend/API auth errors into user-friendly messages.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = (error.message || error.error_description || String(error)).toLowerCase();

  if (msg.includes('invalid') && msg.includes('email')) {
    return 'Please enter a valid work or school email address.';
  }
  if (msg.includes('email_not_confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Incorrect email or password. Please verify your credentials.';
  }
  if (msg.includes('already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (msg.includes('password') && (msg.includes('least') || msg.includes('short'))) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  return 'Authentication failed. Please verify your details and try again.';
}
