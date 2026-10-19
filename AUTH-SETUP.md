# Configure real login for WR

The account page uses Supabase Auth. The website does not store raw passwords in its own code or tables. Supabase Auth manages password verification and account sessions; the user's display name is saved as auth user metadata.

## One-time setup

1. Create a project at https://supabase.com/.
2. In the Supabase project, copy the Project URL and browser-safe publishable key (or legacy anon key). Never use the service_role key or a secret key in frontend code.
3. Edit supabase-config.js in this repository and replace:
   - YOUR_SUPABASE_PROJECT_URL with the Project URL (normally https://PROJECT_REF.supabase.co).
   - YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY with the publishable/anon key.
4. In Authentication → URL Configuration, set the Site URL to https://writings-of-wazirv.onrender.com and add these Redirect URLs:
   - https://writings-of-wazirv.onrender.com/login.html
   - http://localhost:8000/login.html (for local testing)
5. In Authentication → Sign In / Providers, enable Email sign-in and allow new sign-ups. Keep email confirmation enabled for production; configure the email provider/templates as needed.
6. Commit the configuration change and let Render deploy the latest commit.
7. Test on the deployed HTTPS site: create an account, confirm the email, sign in, refresh the page, and sign out. Also test password reset.

## Security notes

- Each visitor creates their own account with their own email/password; there is no shared hard-coded login.
- Supabase stores and verifies credentials. This project does not save plaintext passwords.
- Only the project URL and publishable/anon key belong in the browser. Never expose service-role keys, database passwords, SMTP credentials, or other secrets in GitHub.
- A successful login currently authenticates a visitor but does not make the public story archive private. Every story page remains publicly accessible. If private stories or an admin-only writing dashboard are intended, add server-verified authorization and protect the relevant data/routes separately.
- For production, add abuse protection (such as CAPTCHA/rate limits) in Supabase and monitor authentication logs.
