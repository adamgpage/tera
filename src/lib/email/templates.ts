// Plain-text first email templates — minimal, warm in tone.
// No marketing content in transactional emails per spec.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tera.com";

interface BaseEmailData {
  recipientName: string;
}

interface MatchFoundData extends BaseEmailData {
  conversationId: string;
  otherUserExpertise: string;
}

interface SummaryReadyData extends BaseEmailData {
  conversationId: string;
}

interface MatchNotificationData extends BaseEmailData {
  requestSummary: string;
  expertiseTags: string[];
}

interface RequestExpiredData extends BaseEmailData {
  requestId: string;
}

interface NewRatingData extends BaseEmailData {
  conversationId: string;
}

export function matchFoundEmail(data: MatchFoundData) {
  return {
    subject: "You've been matched on Tera",
    text: `Hi ${data.recipientName},

Someone with relevant experience has accepted your request. Their expertise includes: ${data.otherUserExpertise}.

Start your conversation:
${APP_URL}/conversations/${data.conversationId}

— Tera`,
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${data.recipientName},</p>
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Someone with relevant experience has accepted your request. Their expertise includes: <strong>${data.otherUserExpertise}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${APP_URL}/conversations/${data.conversationId}" style="background: #0f7a5f; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Start Conversation</a>
  </p>
  <p style="color: #888; font-size: 13px;">— Tera</p>
</div>`,
  };
}

export function matchNotificationEmail(data: MatchNotificationData) {
  return {
    subject: "Someone needs your expertise on Tera",
    text: `Hi ${data.recipientName},

Someone has submitted a request that matches your experience.

Problem summary: ${data.requestSummary}
Domain: ${data.expertiseTags.join(", ")}

Review and respond:
${APP_URL}/helper/invitations

— Tera`,
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${data.recipientName},</p>
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Someone has submitted a request that matches your experience.</p>
  <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="color: #1a1a1a; font-size: 14px; line-height: 1.5; margin: 0 0 8px;">${data.requestSummary}</p>
    <p style="color: #888; font-size: 13px; margin: 0;">${data.expertiseTags.join(" · ")}</p>
  </div>
  <p style="margin: 24px 0;">
    <a href="${APP_URL}/helper/invitations" style="background: #0f7a5f; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Review Invitation</a>
  </p>
  <p style="color: #888; font-size: 13px;">— Tera</p>
</div>`,
  };
}

export function summaryReadyEmail(data: SummaryReadyData) {
  return {
    subject: "Your conversation summary is ready",
    text: `Hi ${data.recipientName},

The AI-generated summary of your conversation is ready.

View summary:
${APP_URL}/conversations/${data.conversationId}/summary

— Tera`,
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${data.recipientName},</p>
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">The AI-generated summary of your conversation is ready.</p>
  <p style="margin: 24px 0;">
    <a href="${APP_URL}/conversations/${data.conversationId}/summary" style="background: #0f7a5f; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View Summary</a>
  </p>
  <p style="color: #888; font-size: 13px;">— Tera</p>
</div>`,
  };
}

export function requestExpiredEmail(data: RequestExpiredData) {
  return {
    subject: "Your request has expired",
    text: `Hi ${data.recipientName},

Your request on Tera has expired after 7 days without a match. You can submit a new request at any time.

Submit new request:
${APP_URL}/requests/new

— Tera`,
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${data.recipientName},</p>
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Your request on Tera has expired after 7 days without a match. You can submit a new request at any time.</p>
  <p style="margin: 24px 0;">
    <a href="${APP_URL}/requests/new" style="background: #0f7a5f; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Submit New Request</a>
  </p>
  <p style="color: #888; font-size: 13px;">— Tera</p>
</div>`,
  };
}

export function newRatingEmail(data: NewRatingData) {
  return {
    subject: "New rating on your Tera profile",
    text: `Hi ${data.recipientName},

You have received a new rating. View your conversation:
${APP_URL}/conversations/${data.conversationId}/rate

— Tera`,
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${data.recipientName},</p>
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">You have received a new rating on a completed conversation.</p>
  <p style="margin: 24px 0;">
    <a href="${APP_URL}/conversations/${data.conversationId}/rate" style="background: #0f7a5f; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View Rating</a>
  </p>
  <p style="color: #888; font-size: 13px;">— Tera</p>
</div>`,
  };
}
