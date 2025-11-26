### Supabase Edge Function setup

- Your app requires an edge function for PIN validation, located in `supabase/functions/validate-pin`.
- Do not forget to set the service role secret for the function: `SUPABASE_SERVICE_ROLE_KEY`.
- In the Supabase Dashboard, or using the Supabase CLI, set your secrets for functions before deploying. For example (Supabase CLI):
	- `supabase login`
	- `supabase functions deploy validate-pin --project-ref <project-ref>`
	- `supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<your_service_role_key>" --project-ref <project-ref>`

If the function returns 500 or other non-2xx errors, check the function logs in the dashboard and ensure these variables are set. The function will respond with diagnostics in the response body if there is a server misconfiguration (for example, missing env vars) or a DB error.

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/709a760e-fef3-4412-8fa8-4b961adab74c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/709a760e-fef3-4412-8fa8-4b961adab74c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/709a760e-fef3-4412-8fa8-4b961adab74c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Troubleshooting

- If you run into an error like "Error: listen EACCES: permission denied :::8080" when starting the dev server, it's likely that port 8080 is already reserved by the OS or another service.
- You can change the dev server port by setting the `PORT` environment variable before running the server, or by editing `vite.config.ts`.
	- Example: `PORT=5173 npm run dev` or add `PORT=5173` to `.env`.
	- We default to `5173` in `vite.config.ts` to avoid common port conflicts on Windows.

	### Troubleshooting edge function (validate-pin)

	- If the download fails with an "Edge Function returned a non-2xx status code" message, do the following:
	  1. Check the function logs in the Supabase Dashboard or via CLI:
		  - `supabase functions logs validate-pin --project-ref <project-ref>`
	  2. Ensure your Supabase Function has the service role secret set:
		  - `supabase secrets set SUPABASE_SERVICE_ROLE_KEY='<your_service_role_key>' --project-ref <project-ref>`
	  3. If testing locally, make a local `.env.local` with:
		  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (DO NOT commit this file).
		  - `supabase functions serve validate-pin --env-file .env.local` to test locally.
	  4. If the function logs show `Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`, follow step 2 above.
	  5. For performance or subtle errors, check the SQL migration logs in `supabase/migrations` and ensure required tables and policies exist.

	If you'd like, I can add a CLI-friendly script or GitHub Action to deploy functions and set secrets for CI-based deployments.
