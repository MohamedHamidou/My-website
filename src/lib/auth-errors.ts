import type { AuthError } from '@supabase/supabase-js'

const messages: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_not_confirmed: 'Confirm your email first, then sign in.',
  user_already_exists: 'An account with this email already exists.',
  email_exists: 'An account with this email already exists.',
  weak_password: 'Use at least 8 characters for your password.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a minute and try again.',
  same_password: 'Choose a password you have not used before.',
}

export function getAuthErrorMessage(error: AuthError): string {
  if (error.code && messages[error.code]) return messages[error.code]
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return messages.invalid_credentials
  }
  return error.message
}
