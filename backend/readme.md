MASTER AI PROMPT – LOCALE LEND AUTH INTERFACE
Project Name: Locale Lend
🎯 Goal

Generate a community-focused, trustworthy authentication interface for Locale Lend, a local lending & borrowing platform.
The UI must feel warm, safe, and neighborly, while maintaining a modern, polished SaaS quality.

🎨 DESIGN & THEME REQUIREMENTS

Overall mood: Warm, inviting, trustworthy

Color palette:

Cream / off-white backgrounds

Forest green as primary

Friendly amber for highlights & CTAs

Style:

Soft glassmorphism card

Rounded corners

Subtle shadows

Calm, friendly gradients

Typography:

Plus Jakarta Sans

Avoid flashy or aggressive visuals
→ This is about community trust, not gaming

🧩 LAYOUT STRUCTURE (IMPORTANT)

Full-screen responsive layout

Centered authentication card

Single card with:

Tabs: Sign In | Sign Up

Smooth animated transitions (Framer Motion)

NO page reloads

NO separate OTP page or tab

🔐 AUTHENTICATION FLOW (CUSTOM OTP FLOW)
1️⃣ SIGN UP FLOW

Step 1: User Details

Full Name

Email

Password

Action

On submit, call backend API:

POST /api/auth/send-otp


Disable inputs and show loading state

Step 2: OTP Verification (INLINE)

UI smoothly morphs into OTP input (6 digits)

Clear message:

“We’ve sent a verification code to your email”

OTP input styled as segmented boxes

Resend OTP option (with cooldown)

Step 3: Account Creation

On correct OTP:

Call Firebase:

createUserWithEmailAndPassword


Show success toast

Redirect to dashboard/home

⚠️ OTP is NEVER optional
⚠️ Account is created ONLY after OTP verification

2️⃣ SIGN IN FLOW

Email

Password

Firebase Auth login

Friendly error handling

Success redirect

🧠 UX / UI RULES

Inputs:

Soft borders

Highlight with forest-green glow on focus

Buttons:

Primary CTA: warm amber gradient

Subtle hover lift + scale

Animations:

Smooth, calm (Framer Motion)

No aggressive effects

Toasts:

Success, error, OTP sent, OTP verified

Fully accessible:

Labels

Keyboard navigation

Proper contrast

⚙️ TECH STACK (STRICT)
Frontend

Vite + React (TypeScript)

Tailwind CSS (HSL variables)

Shadcn UI (Radix)

Zustand (state management)

Firebase Auth (client SDK)

React Hook Form + Zod

Framer Motion

Backend (Already exists – DO NOT reimplement)

Node.js + Express

Nodemailer (Gmail SMTP)

Endpoint:

POST /api/auth/send-otp


Backend logs OTP if email fails




FRONTEND STRUCTURE TO FOLLOW
src/
 ├─ components/
 │   └─ AuthForm.tsx
 ├─ lib/
 │   └─ firebase.ts
 ├─ store/
 │   └─ authStore.ts (Zustand)
 ├─ styles/
 │   └─ index.css (design system)

🧾 OUTPUT REQUIREMENTS

Generate:

AuthForm.tsx

Clean, production-ready code

No backend code

No comments in code

Must match described UX exactly

Must look professional, trustworthy, and community-driven

🚫 DO NOT

Do NOT create a separate OTP page

Do NOT use basic forms

Do NOT skip OTP verification

Do NOT use aggressive or gaming visuals

✅ FINAL EXPECTATION

The final interface should feel like:

“I trust this app with my neighborhood.”