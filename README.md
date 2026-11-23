# Hello Again — coming-soon page

Static, single-page site. Plain HTML/CSS/JS, no build step, no dependencies
(fonts load from Google Fonts). Deploys as-is to Vercel or any static host.

```
index.html            page markup, SEO + Open Graph tags
styles.css            all styling (colors: #0A0A15 background, #FF3366 accent)
main.js               form states + the interest -> discovery "wires" visual
signup.js             THE signup adapter: the only file that knows about a backend
favicon.svg / favicon-32.png / apple-touch-icon.png
og-image.png          1200x630 social preview
robots.txt, vercel.json
```

## Preview locally

```bash
cd hello-again-landing
python3 -m http.server 8080        # or: npx serve .
# open http://localhost:8080
```

Opening `index.html` straight from disk mostly works too, but use a server so the
signup adapter's network calls behave like production.

## Deploy to Vercel

No framework, no build command, output directory = the project root.

```bash
npm i -g vercel
cd hello-again-landing
vercel            # preview deploy
vercel --prod     # production
```

Or push the folder to a Git repo and import it in the Vercel dashboard
(Framework preset: "Other", leave Build Command and Output Directory empty).
Then add the custom domain under Project -> Settings -> Domains.

**After the domain is live:** in `index.html`, add
`<meta property="og:url" content="https://YOUR-DOMAIN/">` and
`<link rel="canonical" href="https://YOUR-DOMAIN/">`, and change `og:image` /
`twitter:image` to the absolute `https://YOUR-DOMAIN/og-image.png`
(some social crawlers ignore relative image URLs).

## Deploy to GitHub Pages (current hosting)

The live site is served by GitHub Pages from this repo's `main` branch, root folder
(Settings -> Pages). Every push to `main` redeploys it. `.nojekyll` makes Pages serve
the files as-is. All asset paths are relative, so it works under the
`/hello-again-landing/` project path.

## Signup is currently OFF

The early-access forms were removed from the live page because no backend is
connected yet. Nothing on the page collects email. The pieces are kept, unreferenced:

- `signup.js`: the backend adapter (see below)
- `signup-ui/forms.html`: the hero and closing form markup
- `signup-ui/form.css`: the form styles
- `signup-ui/form.js`: the form behaviour (validation, honest states, success)

### Re-enabling it

1. Connect a backend in `signup.js` (Firebase or an endpoint, below) and test it.
2. Paste the hero form from `signup-ui/forms.html` into `index.html` right after
   `<p class="hero__lede">`, and the closing form after `<p class="closing__sub">`.
3. Add `<link rel="stylesheet" href="signup-ui/form.css" />` after `styles.css`.
4. Before `</body>`, add `<script src="signup.js"></script>` and
   `<script src="signup-ui/form.js" defer></script>`.
5. Optional: put "Get early access" back into the meta descriptions, and restore
   the closing section's two-column layout (title left, form right).

## How the signup behaves (once re-enabled)

Out of the box `signup.js` has `PROVIDER: "none"`. In that state:

- Emails are validated in the browser (empty / malformed shows an inline error).
- A valid email is **not stored or sent anywhere**. The page says so:
  *"Early access opens soon. Signup isn't connected yet, so we haven't saved your
  email. Please check back shortly."*
- The "You're on the list" success state is shown **only** after a configured
  provider confirms the write. Provider failures show an honest error.

### Adapter interface (`window.HelloAgainSignup`)

```js
HelloAgainSignup.isConfigured()          // boolean
HelloAgainSignup.isValidEmail(email)     // boolean
HelloAgainSignup.subscribe(email, { source: "hero" | "closing" })
  // -> Promise<{status:"subscribed"} | {status:"not_configured"} | {status:"error", message}>
  // never throws; "subscribed" only after the backend confirms
```

Each stored record: `{ email (lowercased), source, referrer, page, userAgent, createdAt }`.

You can configure by editing the `CONFIG` block at the top of `signup.js`, or
without touching it by defining `window.HELLO_AGAIN_SIGNUP_CONFIG = {...}` in a
`<script>` placed before `signup.js` in `index.html`.

## Connecting the signup

### Option A: Firebase Firestore

1. Firebase console -> your project (or a new one) -> Build -> Firestore Database -> Create.
2. Project settings -> Your apps -> Add web app -> copy `apiKey`, `authDomain`, `projectId`, `appId`.
3. In `signup.js`: set `PROVIDER: "firebase"` and fill the `firebase` block.
   (Web API keys are public by design. Security comes from the rules below.)
4. Firestore -> Rules: allow anonymous *create only*, no reads:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /earlyAccess/{id} {
      allow create: if request.resource.data.keys().hasOnly(
                        ['email','source','referrer','page','userAgent','createdAt'])
                    && request.resource.data.email is string
                    && request.resource.data.email.matches('^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$')
                    && request.resource.data.email.size() < 255;
      allow read, update, delete: if false;
    }
  }
}
```

5. Optional but recommended: enable **App Check** (reCAPTCHA Enterprise) to cut spam.
6. Export signups from the console, or later sync them to an email tool.
   Duplicates are possible (one doc per submit); dedupe on `email` when exporting.

### Option B: an email marketing provider (Mailchimp, Kit/ConvertKit, Resend, Loops, Beehiiv…)

These need a **secret API key**, which must never ship in browser code. Put a tiny
serverless function in front of them and point the adapter at it.

1. In `signup.js`: `PROVIDER: "endpoint"`, `endpoint.url: "/api/subscribe"`.
2. Create `api/subscribe.js` in this folder (Vercel runs it as a function automatically):

```js
// api/subscribe.js  (Vercel Node function). Example: Resend Audiences.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, source } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || "")) return res.status(400).json({ error: "invalid_email" });
  const r = await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false })
  });
  if (!r.ok) return res.status(502).json({ error: "provider_failed" });
  return res.status(200).json({ ok: true, source });
}
```

3. Add the secrets in Vercel -> Project -> Settings -> Environment Variables
   (`RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, or the equivalents for your provider), then redeploy.
   Swap the `fetch` for Mailchimp (`/3.0/lists/{id}/members`), Kit (`/v4/subscribers`), etc.

A hosted form backend that accepts a public JSON POST (e.g. Formspree) also works
directly: set `endpoint.url` to its URL. Any 2xx response counts as success.

### Testing a configured adapter

Submit a real address on the deployed site and confirm the record appears in
Firestore / your provider before announcing the page.

## Accessibility and motion

- Labelled inputs, `aria-live` status messages, visible focus rings, keyboard-friendly.
- All animation (entrance, glow drift, wire draw-in, moving sparks, pulse) is
  disabled under `prefers-reduced-motion: reduce`.

© Hello Again Labs LLC
