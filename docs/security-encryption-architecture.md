# Restore Britain Platform — Security & Encryption Architecture

### Comprehensive Security Document

> **Companion document to:** *Political WebApp Overview (WIP)* and *Database Architecture*
> **Purpose:** This document explains every layer of the platform's security architecture — what we're implementing, how it works in plain English, the technical specifics of implementation, and an honest assessment of the threats we face and the risks that remain.

---

## 1. Security Philosophy

There is no such thing as an "unhackable" system. Every piece of software ever built has vulnerabilities — some known, some undiscovered. Security is not a destination; it is a continuous discipline.

Our philosophy is **defence in depth**: multiple independent layers of protection so that if any single layer is compromised, the others continue to protect the system. We assume that any individual component *can* be breached and design accordingly. The goal is to make the cost of attacking this platform so high — in time, resources, and expertise — that it is not worth the effort for any realistic adversary, and to ensure that even a successful breach exposes as little sensitive data as possible.

We also follow the **principle of least privilege**: every user, every piece of code, and every system component has access only to exactly what it needs to function, and nothing more.

**Key architectural decision:** By delegating all private and group messaging to **Telegram**, we have removed the single most complex and security-critical component from our own infrastructure. We do not store message content, do not manage encryption keys for messaging, and do not handle real-time message delivery. This dramatically reduces our attack surface and allows us to focus our security efforts on what we do control: the web application, the database, authentication, and the forum.

---

## 2. Threat Model — Who Might Attack Us and How

Before designing security, we need to understand who we're defending against. Here are the realistic threat actors for a political organising platform in the UK, ranked by capability:

### 2.1 Script Kiddies & Opportunistic Attackers
- **Capability:** Low. Using automated scanning tools and known exploits.
- **Motivation:** Vandalism, trolling, or ideological opposition.
- **Likely attacks:** SQL injection, cross-site scripting (XSS), credential stuffing (trying leaked passwords from other sites), automated bot registration.
- **Our defence:** Standard web security best practices stop these entirely. This is the baseline.

### 2.2 Motivated Individual Hackers
- **Capability:** Moderate. Skilled individuals who will spend time probing for weaknesses.
- **Motivation:** Political opposition, personal grudge, or desire to leak member data.
- **Likely attacks:** Phishing attacks against leaders/admins, exploiting misconfigured APIs, session hijacking, social engineering.
- **Our defence:** Strong authentication, server-side secret management, rate limiting, and security headers. This stops the vast majority.

### 2.3 Organised Groups / Hacktivists
- **Capability:** Moderate to high. Coordinated teams with diverse skills.
- **Motivation:** Political opposition, desire to disrupt or discredit the movement.
- **Likely attacks:** Distributed denial of service (DDoS), coordinated phishing campaigns, attempting to infiltrate as members to access the gated platform, supply chain attacks (compromising a dependency).
- **Our defence:** DDoS protection via Cloudflare/Vercel edge network, membership verification (so infiltrators need a valid membership ID), dependency auditing, and strict access controls.

### 2.4 State-Level Actors (Intelligence Services)
- **Capability:** Extremely high. Essentially unlimited resources, zero-day exploits, ability to compel service providers to hand over data.
- **Motivation:** Monitoring domestic political movements (this is a real consideration in the UK given the Investigatory Powers Act 2016).
- **Likely attacks:** Compelling Supabase/hosting providers to hand over data via legal process, intercepting traffic at the network level, exploiting zero-day vulnerabilities in browsers or libraries, compromising individual devices.
- **Our defence:** Our platform stores no message content (that's on Telegram's infrastructure). Server-side data (member lists, forum posts, quest data) *would* be accessible to a state actor with legal authority — this is an unavoidable reality. We mitigate by minimising sensitive data stored and encrypting everything at rest.

### 2.5 Honest Assessment of What We Cannot Defend Against
- A state actor who compromises an individual user's device (phone/laptop) can read everything that user can read. No amount of server-side security prevents this.
- If the UK government issues a legal order to our hosting provider, our server-side data (member lists, forum posts, quest data, membership verification records) will be accessible.
- A zero-day exploit in the browser or operating system could theoretically bypass all our protections. This is true of every web application in existence.
- Social engineering — tricking a leader into giving up their credentials — remains a threat regardless of technical security.
- Telegram is a third party we do not control. If Telegram is compromised, experiences downtime, or changes its policies, our communications infrastructure is affected. We have no ability to audit or guarantee Telegram's security.

**What this means practically:** Our security architecture makes the *platform itself* extremely hard to breach. Messaging is off our servers entirely. But individual user devices, legally compellable server-side data, and Telegram's own security posture remain exposure points outside our direct control.

---

## 3. Security Layers — Overview

| Layer | What It Protects | Key Technology |
|---|---|---|
| Secret Management | API keys, database credentials, tokens | Environment variables, server-side only |
| Authentication | User accounts and sessions | Supabase Auth, bcrypt, JWT, optional 2FA |
| Membership Gating | Platform access control | Membership ID verification, invite codes |
| Transport Encryption | Data moving between user and server | TLS 1.3 (HTTPS) |
| Database Security | Stored data and access control | Supabase Row Level Security, encryption at rest |
| Application Security | The app itself against web attacks | CSP, CSRF tokens, input sanitisation, rate limiting |
| Infrastructure Security | Hosting, DNS, DDoS protection | Cloudflare/Vercel edge network, security headers |
| Screen Capture Countermeasures | Content leaks via screenshots | Invisible watermarking, behavioural detection |
| Third-Party Messaging | Private and group communications | Delegated to Telegram (see Section 5) |

---

## 4. Layer-by-Layer Technical Detail

### 4.1 Secret Management — Keeping Keys Out of the Code

**The problem in plain English:**
Your app needs passwords to talk to the database, API keys to use third-party services, and tokens to verify it is who it says it is. If any of these secrets end up in your frontend code — the code that runs in the user's browser — anyone can find them by simply viewing the page source. This would give an attacker direct access to your database.

**How we solve it:**
- **No secrets ever exist in frontend code.** Not one. Zero. The browser-side application never directly communicates with Supabase using privileged credentials.
- All sensitive operations go through **server-side functions** — either Supabase Edge Functions (Deno-based serverless functions that run on Supabase's infrastructure) or a lightweight API layer on Vercel/Cloudflare Workers.
- Secrets are stored as **environment variables** on the hosting platform — they exist only in the server's memory at runtime and are never written into code files, never committed to version control, and never sent to the browser.
- The Supabase **anon key** (the only key the frontend uses) has extremely limited permissions, controlled entirely by Row Level Security policies. Even if someone extracts it (which is expected — it's a public key), they can only do what an unauthenticated or correctly-authenticated user could do through the normal UI.

**Technical implementation:**
```
# These live ONLY in the hosting platform's environment variable settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER in frontend
SUPABASE_ANON_KEY=eyJ...          # This one is safe for frontend — it's public by design

# Server-side function example (Edge Function or API route)
# This runs on the server, never in the browser
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Only accessible server-side
);
```

**What this protects against:** Anyone inspecting your frontend code, viewing network requests, or decompiling your app will find nothing of value. The real keys exist only on servers you control.

---

### 4.2 Authentication — Proving You Are Who You Say You Are

**The problem in plain English:**
We need to know that the person logging in is actually the person who created that account, and we need to make sure nobody can hijack someone else's session or forge their identity.

**How we solve it:**

**Password Handling:**
- Passwords are **never stored in plaintext.** When a user creates a password, it is run through **bcrypt** — a one-way hashing algorithm that converts it into an irreversible string. Even if someone steals the entire database, they cannot reverse the hashes back into passwords.
- bcrypt includes a **salt** — a random value added to each password before hashing — so even two users with the same password will have completely different hashes. This defeats precomputed "rainbow table" attacks.
- Supabase Auth handles this automatically and correctly. We do not implement our own password hashing.

**How bcrypt works (simplified):**
Imagine you have a machine that takes any word, scrambles it through a complex mathematical process, and spits out a 60-character string. The same input always produces the same output, but there is no way to run the machine backwards — you cannot put in the output and get the input. When you log in, the system takes your password attempt, runs it through the same machine, and checks if the output matches what's stored. It never needs to know your actual password.

**Session Management:**
- After successful login, Supabase issues a **JSON Web Token (JWT)** — a cryptographically signed token that proves the user's identity for subsequent requests.
- JWTs have a **short expiry time** (typically 1 hour). After expiry, the user's session is silently refreshed using a **refresh token** stored in an HttpOnly cookie (a cookie that JavaScript cannot access, preventing theft via XSS attacks).
- If a refresh token is compromised, it can be **revoked server-side**, immediately invalidating all sessions for that user.

**Optional Two-Factor Authentication (2FA):**
- Strongly recommended for all regional leaders and mandatory for national administrators.
- Uses **TOTP (Time-based One-Time Password)** — the same system used by Google Authenticator, Authy, etc.
- How it works: during setup, the server generates a shared secret and gives it to the user's authenticator app (via QR code). Every 30 seconds, the app generates a 6-digit code from this secret plus the current time. The server can independently calculate what the code should be. An attacker who steals the password still cannot log in without physical access to the user's authentication device.

**Implementation specifics:**
- Supabase Auth with email/password as the primary method
- Magic link (passwordless email login) as an alternative
- TOTP-based 2FA via Supabase Auth's MFA support
- Refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies
- Account lockout after 10 failed login attempts within 15 minutes
- Password requirements: minimum 12 characters (length matters far more than complexity rules)

---

### 4.3 Membership Gating — Controlling Platform Access

**The problem in plain English:**
The platform is exclusively for verified Restore Britain members. We need to ensure that no one can register without valid party membership, and that the verification process itself doesn't leak information about who is or isn't a member.

**How we solve it:**

**Membership ID Verification:**
- A `membership_verification` table in Supabase contains authorised membership IDs and their associated email addresses, maintained by national administrators.
- During registration, the user enters their membership ID and the email address they registered with the party.
- The backend checks: Does this ID exist? Does the email match? Has it already been claimed by another account?
- If all checks pass, the account is created and verified.
- If any check fails, a **generic error** is returned: "Verification failed." We never tell the user *which* check failed — this prevents attackers from discovering valid membership IDs or emails through trial and error (enumeration attack prevention).

**Invite Code System (alternative or supplementary):**
- Leaders and admins can generate single-use or limited-use invite codes.
- Each code is tied to the person who generated it, creating an accountability chain — if a bad actor gets in via an invite code, we know who vouched for them.
- Codes can have expiry dates and usage limits.

**Post-Verification Access:**
- Until verified, a user cannot see any platform content. They see only the verification screen.
- The `is_verified` flag on the user's profile controls all RLS policies — unverified users are blocked from every table.

**Security considerations:**
- The membership verification table itself is accessible only to national administrators. Regular users and even regional leaders cannot view, query, or modify it.
- All verification checks happen server-side via Edge Functions — the frontend never sees the membership database.
- Rate limiting on verification attempts prevents brute-force guessing of membership IDs.

---

### 4.4 Transport Encryption — Protecting Data in Transit

**The problem in plain English:**
When your phone sends data to our server (or vice versa), that data travels across the internet through many intermediate systems — your mobile network, internet service providers, routing infrastructure. Without encryption, anyone sitting on any of these intermediary points could read everything passing through.

**How we solve it:**
- **TLS 1.3** (Transport Layer Security, the latest version) encrypts all data between the user's device and our servers. This is what the padlock icon in your browser represents.
- TLS works by establishing an encrypted tunnel at the start of every connection using a combination of asymmetric and symmetric cryptography. The initial handshake uses public-key cryptography to securely exchange a session key, and then all subsequent data is encrypted with that session key using fast symmetric encryption.
- Every connection to our platform — web pages, API calls, WebSocket connections for real-time updates — runs over HTTPS (HTTP over TLS).

**What this protects against:** Network-level eavesdropping, man-in-the-middle attacks, ISP-level surveillance of the data content (they can see you connected to our domain, but not what you sent or received).

**What this does NOT protect against:** TLS protects data *in transit*. Once data arrives at our server, it is decrypted for processing. This is why we need database encryption at rest and Row Level Security for access control.

**Implementation:** This is handled automatically by our hosting provider (Vercel/Cloudflare) and by Supabase. We enforce HTTPS-only via HSTS headers (see Section 4.7).

---

### 4.5 Database Security — Protecting Stored Data

**The problem in plain English:**
Our database holds member profiles, regional data, forum posts, quest definitions, gamification stats, and membership verification records. We need to ensure that even if someone finds a way to query our database, they can only access data they're authorised to see.

**How we solve it:**

**Row Level Security (RLS):**
- This is Supabase's most powerful security feature and the backbone of our data access control.
- RLS policies are rules written directly into the database that define exactly who can read, insert, update, or delete each row in each table.
- These rules are enforced by PostgreSQL itself — not by our application code. Even if an attacker bypasses our entire frontend and backend and talks directly to the database using the anon key, the database will only return rows that the authenticated user is allowed to see.

**Example RLS policies (simplified):**
```sql
-- Members can only read their own full profile; others see public fields only
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Members can read forum posts in their region
CREATE POLICY "Members can view regional forum"
ON forum_posts FOR SELECT
USING (
  category_id IN (
    SELECT id FROM forum_categories
    WHERE scope_type = 'region'
    AND scope_id IN (
      SELECT region_id FROM region_members
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  )
  AND deleted_at IS NULL
);

-- Only regional leaders can create quests for their region
CREATE POLICY "Leaders can create quests"
ON quests FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles
    WHERE role_id IN (SELECT id FROM roles WHERE name = 'regional_leader')
    AND scope_type = 'region'
    AND scope_id = NEW.scope_id
    AND revoked_at IS NULL
  )
);
```

The full RLS policy matrix is documented in the *Database Architecture* companion document.

**Encryption at Rest:**
- Supabase encrypts all data at rest using **AES-256** — the same encryption standard used by governments and military organisations worldwide.
- This means that if someone physically stole the hard drives from Supabase's data centre, the data would be unreadable without the decryption keys.
- Supabase manages these keys via their infrastructure. We do not handle this ourselves, but we should be aware that Supabase (and by extension, their hosting provider AWS) *does* have access to these keys.

**What this protects against:** Unauthorised data access through the API, privilege escalation (a regular member trying to access admin data), physical theft of storage media.

**What this does NOT protect against:** If Supabase themselves are compromised or legally compelled to hand over data, RLS and at-rest encryption will not help — Supabase has the keys. For this reason, we minimise the amount of sensitive data we store and delegate the most sensitive communications to Telegram.

---

### 4.6 Application Security — Defending the App Itself

These are the protections built into the application code to prevent common web attacks.

**Content Security Policy (CSP):**
- A CSP header tells the browser exactly which sources of content are allowed to run on our pages.
- This is the primary defence against **Cross-Site Scripting (XSS)** — attacks where a malicious script is injected into a page and runs in the user's browser.
- Our CSP will be strict: only scripts from our own domain, only styles from our own domain and specific trusted CDNs, no inline scripts whatsoever.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**How CSP works in plain English:** Imagine you give the browser a guest list for a party. Only scripts on the list are allowed to run. If an attacker manages to inject a script tag pointing to their malicious server, the browser checks the guest list, doesn't find it, and refuses to load it. The attack fails.

**Cross-Site Request Forgery (CSRF) Protection:**
- CSRF attacks trick a user's browser into making requests to our server using the user's existing session — for example, an attacker's website could contain a hidden form that submits a "delete my account" request to our server, and the user's browser would send their authentication cookies along with it.
- We defend against this with **SameSite cookie attributes** (the browser won't send cookies on cross-origin requests) and **CSRF tokens** (a unique, unpredictable token included in every form and verified server-side).

**Input Sanitisation:**
- Every piece of user input — forum posts, quest descriptions, profile bios — is sanitised before being stored or displayed.
- This prevents **SQL injection** (manipulating database queries) and **stored XSS** (embedding malicious scripts in content that other users will view).
- We use parameterised queries exclusively (Supabase does this by default) and a library like **DOMPurify** to sanitise any HTML content before rendering.

**Rate Limiting:**
- All API endpoints are rate-limited to prevent abuse.
- Login attempts: maximum 10 per 15 minutes per IP address.
- Membership verification attempts: maximum 5 per 15 minutes per IP address.
- API calls: maximum 100 per minute per authenticated user.
- Forum posts: maximum 10 per minute per user.
- Invite code generation: maximum 20 per day per leader.
- This prevents brute-force attacks, spam, and denial-of-service at the application level.

**Security Headers (applied to all responses):**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

- **HSTS** forces all connections to use HTTPS — even if a user types http://, the browser automatically upgrades to HTTPS.
- **X-Frame-Options: DENY** prevents our app from being embedded in a malicious site's iframe (prevents clickjacking).
- **Referrer-Policy** controls what URL information is sent when navigating away from our site.
- **Permissions-Policy** restricts which browser features the app can access.

---

### 4.7 Infrastructure Security — The Foundation

**Hosting:**
- Deployed on **Vercel** or **Cloudflare Pages**, both of which provide edge-deployed hosting with built-in DDoS protection, automatic HTTPS, and a global CDN.
- These platforms absorb massive traffic spikes and distributed attacks at the network edge before they reach our application.

**DDoS Protection (in plain English):**
A DDoS (Distributed Denial of Service) attack floods your server with so much fake traffic that real users can't get through — like a thousand people blocking a doorway. Cloudflare/Vercel have networks spanning hundreds of data centres worldwide. They absorb and filter this traffic at the edge, letting only legitimate requests through to your actual application. A DDoS attack that would instantly take down a self-hosted server is routine for these platforms.

**DNS Security:**
- Use Cloudflare as DNS provider with **DNSSEC** enabled (prevents DNS spoofing — attackers redirecting your domain to their server).
- Enable **DNS over HTTPS (DoH)** in documentation for technically inclined members.

**Dependency Management:**
- All third-party libraries (npm packages) are audited regularly with `npm audit`.
- We use **lockfiles** (package-lock.json) to ensure exact versions are deployed.
- Consider **Snyk** or **Socket.dev** for automated vulnerability scanning of dependencies.
- This defends against **supply chain attacks** — where an attacker compromises a popular library to inject malicious code into all projects that use it.

---

## 5. Telegram as Messaging Infrastructure — Security Implications

By delegating all private and group messaging to Telegram, we gain significant advantages but also accept specific trade-offs that members should understand.

### 5.1 What We Gain
- **Massively reduced attack surface** — We don't store message content, don't manage encryption keys, don't handle real-time message delivery. An attacker who fully compromises our platform gets zero access to private conversations.
- **Mature security infrastructure** — Telegram has dedicated security teams, runs a public bug bounty programme, and has withstood years of scrutiny as one of the world's largest messaging platforms.
- **No encryption key management burden** — Building, storing, rotating, and recovering encryption keys is one of the hardest problems in applied cryptography. We avoid it entirely.

### 5.2 What We Accept
- **Trust in a third party** — We are trusting Telegram with the security and privacy of all member communications. We cannot audit their systems or independently verify their security claims.
- **Telegram's encryption model has nuances:**
  - **Regular groups and channels** use server-client encryption. Messages are encrypted in transit and at rest on Telegram's servers, but Telegram holds the keys and can theoretically read them. This is the same model as email or standard WhatsApp groups.
  - **Secret Chats** (one-to-one only, not available for groups) use end-to-end encryption with the MTProto 2.0 protocol. Telegram cannot read these.
  - **This means:** Standard group chats used for regional and national coordination are readable by Telegram. Members should understand this. For genuinely sensitive one-to-one discussions, members should be advised to use Secret Chats.
- **Availability dependency** — If Telegram experiences downtime, is blocked in a jurisdiction, or shuts down, our communications infrastructure goes with it.
- **Data jurisdiction** — Telegram's servers are distributed globally. Message data is subject to the laws of wherever Telegram's servers are located and wherever Telegram is incorporated (currently Dubai).
- **Policy changes** — Telegram could change its privacy policy, encryption implementation, or data sharing practices at any time without our consent.

### 5.3 Mitigations
- **Documented fallback plan** — If Telegram becomes unavailable, we maintain a list of alternative platforms (Signal, Matrix/Element) and a communication plan for migrating groups.
- **Member education** — Clear guidance during onboarding about what Telegram encrypts and what it doesn't, so members can make informed decisions about what they share in group chats.
- **Minimal data flow from Telegram** — Our optional Telegram bot only pulls aggregate metrics (message count, active users). It never relays, stores, or logs message content.
- **No critical platform data in Telegram** — The platform itself (member database, quests, forum, gamification) is entirely independent of Telegram. If Telegram disappeared tomorrow, only real-time chat is lost; the organising infrastructure continues to function.

---

## 6. Screen Capture Prevention — Honest Limitations & Realistic Countermeasures

### 6.1 The Hard Truth

Screenshot and screen recording blocking is **not technically possible in a web application.** This is a fundamental platform limitation, not a solvable engineering problem. Screenshots and screen recordings are handled at the operating system level — below the browser, in a layer that web code cannot access, intercept, or prevent. When a user presses their screenshot buttons, the OS captures the display buffer directly. The web app is not consulted, not notified (reliably), and cannot intervene.

Native iOS apps can use limited DRM screen capture prevention, and native Android apps can set `FLAG_SECURE` to black out the screen during capture. However, as a Progressive Web App running inside a browser, we do not have access to these native APIs. Even in native apps, these protections are bypassable — a user can always photograph their screen with a second device.

**We will not claim this capability in any documentation or to any user, because it would be dishonest and would create a false sense of security that could lead members to share more sensitive information than they otherwise would.**

### 6.2 What We Can Actually Do

While we cannot prevent screen capture, we can implement a layered set of countermeasures that create **accountability, deterrence, and detection** — which in practice are more valuable than a block that could be bypassed anyway.

**Invisible Watermarking (Primary Countermeasure):**
- All sensitive content (forum posts, campaign details, leader contact information) is rendered with an **invisible digital watermark** unique to the viewing user.
- This watermark encodes the user's ID, a timestamp, and a session identifier into the visual rendering of the content using subtle pixel-level variations or Unicode steganography in text content that are invisible to the naked eye but recoverable from a screenshot.
- **How it works in plain English:** Imagine every member sees the same forum post, but the spacing between letters, the exact shade of the background, or the specific Unicode characters used for spaces are slightly different for each viewer — imperceptibly different to the eye, but uniquely identifiable under analysis. If a screenshot leaks, we can analyse it and determine exactly which user's screen it came from.
- **Technical implementation:** CSS-based micro-adjustments to letter-spacing, line-height, and sub-pixel colour values keyed to the authenticated user's ID. For text content, invisible Unicode characters (zero-width spaces, directional marks) inserted in a pattern unique to each user.
- **Deterrence effect:** Members are informed during onboarding that all sensitive content is watermarked. They don't need to know the technical details — the knowledge that leaked screenshots are traceable to the source is itself a powerful deterrent.

**CSS-Level Copy Prevention (Minor Deterrent):**
- Sensitive content areas apply `user-select: none` to prevent text selection and copying.
- Right-click context menus are disabled on sensitive content via JavaScript.
- **Honest caveat:** This stops casual copying but is trivially bypassable by anyone who opens browser developer tools. It is a speed bump, not a wall. We implement it because it raises the effort floor, not because it provides real security.

```css
.sensitive-content {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
}
```

**Visibility Change Detection (Soft Signal):**
- The Page Visibility API (`document.visibilitychange`) can detect when the app loses focus — which *sometimes* correlates with a screenshot or app-switch to a screen recording tool.
- On iOS, the `blur` event can occasionally fire during the screenshot animation.
- **What we do with this:** We log these events server-side, tagged with the user ID and timestamp. We do NOT treat them as proof of a screenshot — there are dozens of innocent reasons for visibility changes (incoming call, switching apps, locking the phone). However, if a screenshot leak occurs, these logs provide corroborating forensic data alongside the watermark analysis.
- **The user is not notified or flagged from visibility events alone.** False positives would be extremely high and would erode trust. These logs are forensic evidence, not a detection system.

**Behavioural Flagging (Pattern-Based, Not Event-Based):**
- Rather than flagging individual screenshot events (which we cannot reliably detect), we monitor for **behavioural patterns** consistent with data exfiltration:
  - Rapidly opening and closing many forum threads in succession
  - Accessing an unusually high number of region/quest detail pages in a short period
  - Repeated rapid focus/blur cycles on sensitive content pages
- These patterns, when they exceed defined thresholds, generate a **silent flag** on the user's account for administrator review. The user is not notified. No automated action is taken — a human reviews the flag and makes a judgement call.
- **This is not surveillance of members.** It is anomaly detection identical to what banks use to detect fraudulent transactions. Normal usage never triggers it.

### 6.3 What Members Should Understand

During onboarding and in the platform's security documentation, members should be clearly told:

- All forum content and sensitive platform data is invisibly watermarked to the viewing user. If screenshots are leaked, they are traceable to the source.
- Screen capture cannot be technically prevented on any device. Members should exercise judgement about what they share, understanding that any participant could screenshot it.
- Private conversations on Telegram are outside our watermarking system — Telegram has its own screenshot policies depending on the chat type.
- The platform's security protects against external attackers and server-level compromises. It cannot protect against a trusted member choosing to betray confidentiality. This is a human problem, not a technical one, and no technology can fully solve it.

### 6.4 Why This Honest Approach Is Better

A platform that claims to block screenshots and doesn't (or can't) gives members a false sense of invulnerability. They share more freely, take fewer precautions, and are devastated when a leak occurs. A platform that honestly explains the limitations and implements traceable watermarking creates a culture of **informed trust** — members understand the real boundaries of their privacy and make decisions accordingly, while knowing that betrayal has consequences because it is traceable.

---

## 7. Data Classification & Handling

Not all data requires the same level of protection. We classify data into tiers:

| Classification | Examples | Where It Lives | Encryption |
|---|---|---|---|
| **Public** | Regional boundaries, MP data | Supabase, cached locally | TLS in transit, AES-256 at rest |
| **Internal** | Member display names, XP/levels, forum posts | Supabase with RLS | TLS in transit, AES-256 at rest, RLS access control |
| **Confidential** | Member emails, postcodes, membership IDs, leader contact info | Supabase with strict RLS | TLS in transit, AES-256 at rest, restricted RLS policies, watermarked on display |
| **Sensitive** | Membership verification database, invite code records | Supabase, admin-only RLS | TLS in transit, AES-256 at rest, national admin access only |
| **Critical** | User passwords, API secrets | Never stored in plaintext | bcrypt (passwords), environment variables (API secrets) |
| **Off-Platform** | Private messages, group conversations | Telegram's infrastructure | Governed by Telegram's encryption (server-client for groups, E2E for Secret Chats) |

---

## 8. Incident Response — What We Do If Something Goes Wrong

Even with all these protections, we must plan for the possibility of a security incident.

**Detection:**
- Monitor authentication logs for unusual patterns (many failed logins, logins from unusual locations)
- Monitor API usage for anomalous patterns (sudden spikes, unusual queries)
- Monitor membership verification attempts for brute-force patterns
- Supabase provides logging and monitoring capabilities
- Set up alerts for any RLS policy violations or attempted access to restricted data

**Response Plan:**
1. **Identify** the scope of the breach — what data was accessed, how entry was gained
2. **Contain** the breach — revoke compromised credentials, disable affected accounts, patch the vulnerability
3. **Assess** what data was exposed — classify by our data tiers above
4. **Notify** affected users — if personal data was exposed, UK GDPR requires notification within 72 hours
5. **Remediate** — fix the vulnerability, rotate all credentials, conduct a post-mortem
6. **Document** everything for legal compliance and future prevention

**Key point:** Because private messages are held by Telegram and not on our servers, a breach of our platform does not expose any message content. The most sensitive data an attacker could access would be member emails, membership IDs, and forum posts — serious, but significantly less damaging than if we held messaging data as well.

---

## 9. User-Facing Security Guidance

The platform's security is only as strong as its weakest user. We should provide clear, non-technical guidance to all members:

- **Use a strong, unique password** — at least 12 characters. Use a password manager.
- **Enable two-factor authentication** — especially if you are a leader.
- **Keep your device updated** — operating system and browser updates contain security patches.
- **Be wary of phishing** — we will never ask for your password via email or message. If someone claiming to be from the platform asks for your credentials, it is an attack.
- **Understand Telegram's encryption** — regular group chats are not end-to-end encrypted. For sensitive one-to-one conversations, use Telegram's Secret Chat feature.
- **Know that forum content is watermarked** — if you screenshot and leak platform content, it is traceable to your account.
- **If you lose your device**, log in from another device immediately and change your password. This will invalidate all existing sessions.

---

## 10. Compliance Considerations

**UK GDPR (Data Protection Act 2018):**
- We are collecting and processing personal data (email addresses, location data via postcode, political activity). This makes us a data controller under UK GDPR.
- We need a clear **privacy policy** explaining what data we collect, why, how it's stored, and users' rights.
- Users have the right to **access, correct, and delete** their personal data.
- We should appoint a **Data Protection Officer** or at minimum have someone responsible for data protection compliance.
- Data breach notification: 72 hours to the ICO (Information Commissioner's Office) if personal data is compromised.

**Important note on political data:** Under UK GDPR, political opinions are **special category data** — they receive extra protection. The fact that someone is a member of this platform implies a political opinion. We must have a lawful basis for processing this data (likely **explicit consent**) and must protect it accordingly.

**Investigatory Powers Act 2016 ("Snoopers' Charter"):**
- UK law allows security services to compel communications providers to hand over data and, in some cases, to retain data for specified periods.
- For our platform data (member lists, forum posts), we could potentially be compelled to provide access.
- For Telegram communications, any legal orders would need to be directed at Telegram, not at us — we do not hold message data.

**Telegram-specific compliance note:**
- Since we link members to Telegram but do not process or store their messages, we are not the data controller for messaging data. Telegram is. Our privacy policy should make this clear and link to Telegram's own privacy policy.
- If a member exercises their right to erasure, we delete their platform data but cannot delete their Telegram messages or group memberships on their behalf. We should inform them of this distinction.

---

## 11. Summary of Realistic Risk Assessment

| Threat | Risk Level | Mitigation | Residual Risk |
|---|---|---|---|
| Database breach exposing member data | Medium | RLS, encryption at rest, minimise stored data | Low after mitigations |
| Account takeover | Medium | Strong passwords, 2FA, session management | Low with 2FA enabled |
| Infiltration via fake membership | Medium | Membership ID verification, invite code accountability chains | Low-Medium depending on verification strength |
| XSS / code injection | Medium | CSP, input sanitisation, DOMPurify | Very low |
| DDoS taking platform offline | Medium | Cloudflare/Vercel edge protection | Low |
| Supply chain attack via npm dependency | Low-Medium | Lockfiles, auditing, Snyk | Low |
| State-level legal order for platform data | Medium | Data minimisation; messages are off-platform on Telegram | Accepted risk for platform data |
| Phishing attack against leaders | Medium-High | 2FA, user education, clear security guidelines | Medium — human factor is hardest to eliminate |
| Compromised user device | Medium | Outside our control; device security is user's responsibility | Accepted risk |
| Screenshot/screen recording leak | Medium-High | Invisible watermarking, behavioural flagging, member education | Medium — cannot prevent capture, but can trace source |
| Telegram compromise or policy change | Low-Medium | Documented fallback plan, no critical data on Telegram | Accepted risk — third-party dependency |
| Telegram group infiltration | Medium | Membership gating controls who gets TG links; TG group admin controls | Medium — TG invite links can be shared |

---

## 12. Implementation Priority

Security must be built from the foundation up. This is the order in which we implement:

1. **HTTPS and security headers** — before any code ships
2. **Supabase Auth with RLS** — before any user data is stored
3. **Environment variable management** — before any API keys exist
4. **Membership verification system** — before any user can register
5. **Input sanitisation and CSP** — before any user-generated content is displayed
6. **Rate limiting** — before the platform is public
7. **2FA for leaders** — before leader accounts are created
8. **Invisible watermarking system** — before the forum launches
9. **Dependency auditing** — ongoing from day one
10. **Behavioural anomaly detection** — before public launch
11. **Telegram integration security review** — before linking TG groups
12. **Incident response plan** — documented before launch
13. **Security audit / penetration test** — before public launch at scale

---

*Document version: 0.2 — Updated to reflect Telegram messaging delegation, membership gating, simplified data scope, and revised threat model*
*Last updated: February 2026*
*Author: Dennis Stevens & Claude (AI-assisted)*
