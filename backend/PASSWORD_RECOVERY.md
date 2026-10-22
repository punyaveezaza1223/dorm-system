# Password recovery and Brevo setup

1. Copy `.env.example` to `.env` inside `backend/`; `.env` is ignored by Git.
2. Set distinct, long random values for `JWT_SECRET` and `PASSWORD_RESET_SECRET`.
3. Set the verified Brevo sender:

   ```env
   BREVO_API_KEY=your-transactional-api-key
   BREVO_SENDER_EMAIL=noreply@mail.kpnhaven.tech
   BREVO_SENDER_NAME=KPN Haven
   BREVO_EMAIL_MODE=live
   ```

   Keep `BREVO_EMAIL_MODE=mock` for automated tests and local UI work. The backend never exposes this key to the frontend.
4. Review and back up the target database, then run `npm run migrate` from `backend` during an approved maintenance window. This migration adds OTP, reset-token, delivery-deduplication, email-verification, and session-version columns/tables; it does not remove data.
5. Set `users.email_verified_at` only through a trusted email-verification process. Password recovery intentionally refuses unverified emails, without revealing that fact to the requester.

The OTP expires in 5 minutes, permits five verification attempts, and is invalidated after successful use. Requests are limited to one per 60 seconds, five per email per hour, and twenty per IP per hour. A successful reset increments `users.session_version`, invalidating existing signed-in sessions for that account. Legacy sessions remain valid only while that account has version `0`, so the migration does not force an unrelated global logout.

Existing notification events for invoices (including reminders), payment updates, and repair updates are emailed only for verified recipient emails. `email_delivery_events` enforces one email per recipient/event key; an email failure is recorded and never rolls back the application action.
