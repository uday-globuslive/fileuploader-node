# FileUploader

A small Node.js/Express web app for uploading and downloading files, with
username/password login, self-service registration, and an admin panel to
activate/deactivate users.

## Features

- Register / Login / Logout with hashed passwords (bcrypt)
- New accounts are **inactive by default** and cannot log in until an admin activates them
- A default admin account is seeded automatically on first run
- Admin panel: activate/deactivate users, grant/revoke admin rights, delete users
- Authenticated users can upload, list, download and delete their own files
- Admins can also download/delete any user's file
- CSRF protection on all state-changing requests, session-based auth, rate-limited login/register, security headers via helmet

## Setup

For a complete, beginner-friendly walkthrough (prerequisites, configuration,
running as a service, HTTPS, backups, troubleshooting), see
[DEPLOYMENT.md](DEPLOYMENT.md).

```powershell
npm install
copy .env.example .env
```

Edit `.env` and set `SESSION_SECRET` to a long random string. Optionally set
`ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the seeded admin
account. If `ADMIN_PASSWORD` is left blank, a random password is generated
and printed to the console **once** on first startup — copy it immediately.

## Run

```powershell
npm start
```

Then open http://localhost:3000

## Notes

- Data is stored as JSON files under `data/` (users, file metadata) and the
  actual uploaded binaries under `uploads/`. Both are git-ignored.
- This is a small/demo-scale app: the JSON store is fine for light use but
  isn't a substitute for a real database under heavy concurrent load.
