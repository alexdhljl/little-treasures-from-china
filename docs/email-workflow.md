# Auctus Heritage Email Workflow

This document defines the production email architecture for Auctus Heritage.

## Current Architecture

Website:

```text
https://auctusheritage.com
```

Transactional email provider:

```text
Resend
```

Customer-facing email identity:

```text
Auctus Heritage <hello@auctusheritage.com>
```

Internal notification inbox:

```text
auctusheritage@gmail.com
```

The old `inquiry@auctusheritage.com` mailbox is no longer used by the website.

## Email Flow

```text
Customer submits inquiry
        |
        v
Inquiry is saved in Supabase
        |
        +--> Customer confirmation email
        |       From: Auctus Heritage <hello@auctusheritage.com>
        |       To: customer_email
        |       Reply-To: hello@auctusheritage.com
        |
        +--> Internal notification email
                From: Auctus Heritage <hello@auctusheritage.com>
                To: ADMIN_NOTIFICATION_EMAIL
                Reply-To: customer_email
```

When staff clicks Reply on the internal notification in Gmail, the reply opens to the customer email address automatically.

## Environment Variables

Required for email sending:

```env
RESEND_API_KEY=
PUBLIC_EMAIL=hello@auctusheritage.com
ADMIN_NOTIFICATION_EMAIL=auctusheritage@gmail.com
TRANSACTIONAL_FROM=Auctus Heritage <hello@auctusheritage.com>
TRANSACTIONAL_REPLY_TO=hello@auctusheritage.com
```

Compatibility variables may still exist in Vercel, but new code should use the centralized email configuration module:

```text
frontend/lib/email/config.ts
```

## How To Change The Company Email Later

To change the public email from `hello@auctusheritage.com` to another address:

1. Verify the new sender address or domain in Resend.
2. Update `PUBLIC_EMAIL`.
3. Update `TRANSACTIONAL_FROM`.
4. Update `TRANSACTIONAL_REPLY_TO`.
5. Redeploy the site.

No inquiry form or email template changes should be required.

## How To Change The Internal Notification Inbox

To change the company inbox that receives internal notifications:

```env
ADMIN_NOTIFICATION_EMAIL=new-inbox@example.com
```

No code changes are required.

## Future Google Workspace Migration

When Auctus Heritage moves to Google Workspace:

1. Create the Google Workspace mailbox, for example `hello@auctusheritage.com`.
2. Update MX records according to Google Workspace instructions.
3. Keep Resend configured for transactional website emails, or move transactional sending to the chosen provider.
4. Update `ADMIN_NOTIFICATION_EMAIL` if the internal inbox changes.

The website should continue using the centralized email configuration module.

## Gmail Send Mail As

For the current lightweight setup, `auctusheritage@gmail.com` can receive internal notifications. To reply with the brand address from Gmail:

1. Open Gmail settings for `auctusheritage@gmail.com`.
2. Go to Accounts and Import.
3. Add `hello@auctusheritage.com` under Send mail as.
4. Complete verification.
5. Set it as the default sending identity if desired.

After this setup, staff can manage conversations in Gmail while customers see the brand address.
