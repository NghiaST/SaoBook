// src/modules/auth/auth.email.ts
import { config } from '../../config'
 
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
) {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`
 
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resend.from,
      to,
      subject: 'Reset your password',
      html: `
        <p>Hi ${name},</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
  })
 
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${response.status} ${error}`)
  }
}