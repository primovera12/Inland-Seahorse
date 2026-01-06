import { NextRequest, NextResponse } from 'next/server'

// Email configuration
const NOTIFICATION_EMAIL = 'rabih@chipatech.com'

interface TicketNotification {
  ticketNumber: string
  title: string
  description: string
  type: string
  priority: string
  page: string
  submitterName: string
  submitterEmail: string
}

export async function POST(request: NextRequest) {
  try {
    const data: TicketNotification = await request.json()

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      // Log the notification if email is not configured
      console.log('=== NEW TICKET NOTIFICATION ===')
      console.log(`Ticket: ${data.ticketNumber}`)
      console.log(`Title: ${data.title}`)
      console.log(`Type: ${data.type}`)
      console.log(`Priority: ${data.priority}`)
      console.log(`Page: ${data.page}`)
      console.log(`Description: ${data.description}`)
      console.log(`Submitted by: ${data.submitterName} (${data.submitterEmail})`)
      console.log('================================')
      console.log('Note: Email notifications are not configured. Set RESEND_API_KEY in .env to enable.')

      return NextResponse.json({
        success: true,
        message: 'Notification logged (email not configured)',
      })
    }

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dismantle DB <tickets@notifications.chipatech.com>',
        to: [NOTIFICATION_EMAIL],
        subject: `[${data.type.toUpperCase()}] New Ticket: ${data.title} (${data.ticketNumber})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Ticket Submitted</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">${data.ticketNumber}</p>
            </div>

            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #111827; margin: 0 0 15px 0;">${data.title}</h2>

              <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <span style="background: ${data.type === 'error' ? '#fee2e2' : data.type === 'feature' ? '#dcfce7' : '#dbeafe'}; color: ${data.type === 'error' ? '#991b1b' : data.type === 'feature' ? '#166534' : '#1e40af'}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">
                  ${data.type === 'error' ? 'Error/Bug Report' : data.type === 'feature' ? 'New Feature' : 'Update/Enhancement'}
                </span>
                <span style="background: ${data.priority === 'urgent' ? '#fee2e2' : data.priority === 'high' ? '#ffedd5' : data.priority === 'medium' ? '#dbeafe' : '#f3f4f6'}; color: ${data.priority === 'urgent' ? '#991b1b' : data.priority === 'high' ? '#9a3412' : data.priority === 'medium' ? '#1e40af' : '#374151'}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">
                  ${data.priority.charAt(0).toUpperCase() + data.priority.slice(1)} Priority
                </span>
              </div>

              <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                <p style="color: #374151; margin: 0; white-space: pre-wrap;">${data.description}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Related Page:</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.page}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Submitted By:</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.submitterName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.submitterEmail}</td>
                </tr>
              </table>
            </div>

            <div style="background: #1f2937; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                This ticket was submitted via the Dismantle DB system.
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend API error:', errorData)
      throw new Error('Failed to send email notification')
    }

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
