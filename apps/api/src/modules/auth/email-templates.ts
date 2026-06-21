/**
 * Branded email templates for Sterling auth flows.
 * All styles are inline — required for email client compatibility.
 */

const BRAND = {
  primary: '#3D52A0',
  accent: '#7091E6',
  surface: '#EDE8F5',
  text: '#1a1f3a',
  muted: '#8697C4',
  border: '#ADBBDA',
  success: '#2E9E7B',
  danger: '#C9485B',
};

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sterling</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});border-radius:10px;display:inline-block;text-align:center;line-height:40px;font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.5px;">S$</div>
                <span style="font-size:18px;font-weight:700;color:${BRAND.text};letter-spacing:-0.02em;">Sterling</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid ${BRAND.border};overflow:hidden;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
                Sterling — Smart Invoice &amp; Payroll Platform<br/>
                You received this email because an action was taken on your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string, color = BRAND.primary): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="background:${color};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

// ── Welcome email (sent on registration) ────────────────────────────────────

export function welcomeEmailHtml(firstName: string, companyName: string, loginUrl: string): string {
  const body = `
    <div style="padding:36px 36px 32px;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BRAND.text};letter-spacing:-0.03em;">
        Welcome to Sterling, ${firstName} 👋
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Your company <strong style="color:${BRAND.text};">${companyName}</strong> is set up and ready. You can now create invoices, manage employees, and run payroll — all from one place.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border-radius:10px;margin-bottom:28px;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${BRAND.text};">Here's what you can do next:</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              ${[
                ['Create your first invoice', 'Design and send professional invoices to your clients.'],
                ['Add clients & employees', 'Build your master data before running payroll.'],
                ['Run payroll', 'Process salaries and generate branded salary slips.'],
              ]
                .map(
                  ([title, desc]) => `
              <tr>
                <td style="padding:6px 0;vertical-align:top;">
                  <span style="display:inline-block;width:20px;height:20px;background:${BRAND.primary}20;border-radius:50%;text-align:center;line-height:20px;font-size:10px;color:${BRAND.primary};margin-right:10px;">✓</span>
                </td>
                <td style="padding:6px 0;vertical-align:top;">
                  <span style="font-size:13px;font-weight:600;color:${BRAND.text};">${title}</span>
                  <span style="font-size:13px;color:${BRAND.muted};"> — ${desc}</span>
                </td>
              </tr>`,
                )
                .join('')}
            </table>
          </td>
        </tr>
      </table>

      ${button('Open Sterling', loginUrl)}
    </div>

    <div style="padding:20px 36px;border-top:1px solid ${BRAND.border};background:#fafbff;">
      <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
        Your account was created as <strong>Owner</strong> of ${companyName}. You can invite teammates and assign roles from your company settings.
      </p>
    </div>`;

  return layout(body);
}

export function welcomeEmailText(firstName: string, companyName: string, loginUrl: string): string {
  return `Welcome to Sterling, ${firstName}!\n\n${companyName} is set up and ready.\n\nOpen Sterling: ${loginUrl}\n\nYour account was created as Owner of ${companyName}.`;
}

// ── Email verification (sent on registration) ────────────────────────────────

export function verificationEmailHtml(firstName: string, verifyUrl: string): string {
  const body = `
    <div style="padding:36px 36px 32px;">
      <div style="width:48px;height:48px;background:${BRAND.primary}15;border-radius:12px;text-align:center;line-height:48px;font-size:22px;margin-bottom:20px;">✉️</div>

      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.text};letter-spacing:-0.03em;">
        Confirm your email address
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${firstName}, welcome to Sterling!
      </p>
      <p style="margin:0 0 28px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Click the button below to verify your email and activate your account. This link expires in <strong style="color:${BRAND.text};">24 hours</strong>.
      </p>

      ${button('Verify my email', verifyUrl, BRAND.success)}

      <p style="margin:28px 0 0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
        Or copy and paste this URL into your browser:<br/>
        <a href="${verifyUrl}" style="color:${BRAND.accent};word-break:break-all;">${verifyUrl}</a>
      </p>
    </div>

    <div style="padding:20px 36px;border-top:1px solid ${BRAND.border};background:#fafbff;">
      <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
        If you didn't create a Sterling account, you can safely ignore this email.
      </p>
    </div>`;

  return layout(body);
}

export function verificationEmailText(firstName: string, verifyUrl: string): string {
  return `Hi ${firstName},\n\nWelcome to Sterling! Please verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, ignore this email.`;
}

// ── Password reset email ─────────────────────────────────────────────────────

export function passwordResetEmailHtml(firstName: string, resetUrl: string): string {
  const body = `
    <div style="padding:36px 36px 32px;">
      <div style="width:48px;height:48px;background:${BRAND.danger}15;border-radius:12px;text-align:center;line-height:48px;font-size:22px;margin-bottom:20px;">🔑</div>

      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.text};letter-spacing:-0.03em;">
        Reset your password
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${firstName}, we received a request to reset the password for your Sterling account.
      </p>
      <p style="margin:0 0 28px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Click the button below to choose a new password. This link is valid for <strong style="color:${BRAND.text};">1 hour</strong>.
      </p>

      ${button('Reset password', resetUrl, BRAND.danger)}

      <p style="margin:28px 0 0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
        Or copy and paste this URL into your browser:<br/>
        <a href="${resetUrl}" style="color:${BRAND.accent};word-break:break-all;">${resetUrl}</a>
      </p>
    </div>

    <div style="padding:20px 36px;border-top:1px solid ${BRAND.border};background:#fafbff;">
      <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
        If you didn't request a password reset, you can safely ignore this email. Your password will not change until you click the link above.
      </p>
    </div>`;

  return layout(body);
}

export function passwordResetEmailText(firstName: string, resetUrl: string): string {
  return `Hi ${firstName},\n\nWe received a request to reset your Sterling password.\n\nReset your password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;
}
