This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AP® Economics practice (`/practice`)

Original AP Microeconomics / Macroeconomics multiple-choice practice: unit practice with instant
feedback, a 60-question / 70-minute mock, review of missed questions, a progress dashboard, and an
admin screen for the question bank.

### Setup

1. **Apply the migration** in `supabase/migrations/` (Supabase SQL editor, or `supabase link` then
   `supabase db push`).
2. **Make yourself an admin** (run in the SQL editor; no client can write this table):

   ```sql
   insert into public.practice_admins (user_id)
   select id from auth.users where email = 'YOUR_EMAIL_HERE';
   ```

3. **Import the question bank as drafts.** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
   (it is only read by the import script, never by the app, and `.env*` is git-ignored), then:

   ```bash
   npm run questions:check    # validate content/questions (no network)
   npm run questions:import   # insert new questions as drafts (safe to re-run)
   ```

4. **Review and publish** at `/admin/practice`. Students only ever see published questions.

Question format and authoring rules: [`content/questions/README.md`](content/questions/README.md).
In development, `/admin/practice/preview` renders the JSON batches with the real exam components.

### How answers stay hidden

Students can read only the non-answer columns of published questions (column-level grants + RLS).
Correct answers and explanations come from security-definer functions: after each answer in
practice mode, and for a mock only after it is submitted. Signed-out students' sessions live in
`localStorage`; signed-in sessions are stored in `practice_sessions` / `practice_answers`.
