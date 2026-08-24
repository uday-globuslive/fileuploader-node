# Deployment Guide (Beginner-Friendly)

This guide assumes **zero prior experience**. Follow the steps in order.

---

## 1. Prerequisite software

Install these on the machine that will run the app (your PC for local testing,
or the server for a real deployment).

| Software | Why you need it | How to check if it's installed | Download |
|---|---|---|---|
| **Node.js** (v18 or newer, v20 LTS recommended) | Runs the app. Includes `npm`, the package manager. | Open a terminal and run `node -v` | https://nodejs.org (choose the "LTS" installer) |
| **Git** (optional, only if you're copying the code via a repository) | Lets you clone/pull the project source code. | `git --version` | https://git-scm.com/downloads |
| **A code/text editor** (optional, for editing config) | To edit the `.env` file. | — | Visual Studio Code: https://code.visualstudio.com |

You do **not** need to install a separate database — this app stores its data
as simple JSON files on disk.

### Checking your installation

Open a terminal (Windows: PowerShell, Mac/Linux: Terminal) and run:

```powershell
node -v
npm -v
```

You should see version numbers (e.g. `v20.14.0` and `10.7.0`). If you get an
error like "command not found", Node.js isn't installed correctly — reinstall
it and restart your terminal.

---

## 2. Get the project files onto the server

If you received the project as a folder/zip: copy the entire `fileuploader`
folder to the server, e.g. into `/opt/fileuploader` (Linux) or
`C:\apps\fileuploader` (Windows).

If you're pulling it from a git repository instead:

```powershell
git clone <repository-url> fileuploader
cd fileuploader
```

---

## 3. Install the app's dependencies

From inside the `fileuploader` folder, run:

```powershell
npm install
```

This downloads the libraries the app needs (Express, EJS, etc.) into a
`node_modules` folder. It only needs to be run once (and again whenever
`package.json` changes).

> If your machine is configured with a private/corporate npm registry that
> you don't have access to, you may see an authentication error. In that
> case, run instead:
> ```powershell
> npm install --registry https://registry.npmjs.org/
> ```

---

## 4. Configure the app (`.env` file)

The app is configured through a file named `.env` in the project's root
folder. A template is provided as `.env.example`.

1. Copy the template:
   ```powershell
   copy .env.example .env
   ```
   (On Linux/Mac: `cp .env.example .env`)

2. Open `.env` in a text editor and fill in the values:

   | Setting | What it means | What to put |
   |---|---|---|
   | `PORT` | Which network port the app listens on | `3000` is fine unless it's already in use |
   | `NODE_ENV` | Environment mode | `production` for a real deployment, `development` for local testing |
   | `SESSION_SECRET` | A secret key used to protect login sessions | **Required.** A long random string — see below on how to generate one. Never share this or commit it to git. |
   | `ADMIN_USERNAME` | Username of the built-in admin account | e.g. `admin` |
   | `ADMIN_EMAIL` | Email of the built-in admin account | e.g. `admin@yourcompany.com` |
   | `ADMIN_PASSWORD` | Password for the built-in admin account | Leave **blank** to have the app auto-generate a strong random one (recommended) — see step 6 |
   | `MAX_UPLOAD_BYTES` | Maximum size of a single uploaded file, in bytes | `21474836480` = 20 GB. Increase/decrease as needed |

### Generating a random `SESSION_SECRET`

Run this in a terminal (it uses Node, which you already installed) and paste
the output into `.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Start the app

From inside the `fileuploader` folder:

```powershell
npm start
```

You should see:

```
Server listening on http://localhost:3000
```

Open a browser and go to `http://localhost:3000` (or
`http://<server-ip>:3000` if running on a remote server, once firewall/
networking allows it — see section 8).

Press `Ctrl+C` in the terminal to stop the app.

---

## 6. First login — the default admin account

The **very first time** the app starts (when there are no users yet), it
automatically creates one admin account so you have a way in:

- If you set `ADMIN_PASSWORD` in `.env`, that's the password.
- If you left `ADMIN_PASSWORD` blank, the app generates a random password and
  prints it to the terminal **once**, like this:

  ```
  ============================================================
  Default admin account created.
    Username: admin
    Password: 8Jv2Qk...  (generated - copy this now, it will not be shown again)
  ============================================================
  ```

  **Copy this password immediately** — it is not stored anywhere in
  plain text and cannot be recovered later (only reset, see below).

Log in at `http://localhost:3000/login` with that username/password.

### If you lose the admin password

Stop the app, delete `data/users.json` and `data/files.json` (this wipes
**all** users and file records — do this only for a fresh setup, not on a
live system with real users), then start the app again to get a new admin
account and password. For an already-live system, ask a developer to reset
the password directly in `data/users.json` instead of deleting it.

---

## 7. Everyday use

- **Regular users** register themselves at `/register`. New accounts start
  **inactive** and cannot log in yet.
- **The admin** logs in and goes to `/admin` to activate (or deactivate)
  users, grant/revoke admin rights, or delete accounts.
- Once activated, a user can log in and use `/dashboard` to upload, download,
  and delete their own files.

---

## 8. Running it as a real, always-on service

Running `npm start` in a terminal only works while that terminal stays open.
For a real deployment, use a process manager so the app restarts
automatically on crashes or server reboots.

### Option A: PM2 (works on Windows, Linux, Mac)

```powershell
npm install -g pm2
cd fileuploader
pm2 start server.js --name fileuploader
pm2 save
```

- Check status: `pm2 status`
- View logs: `pm2 logs fileuploader`
- Make it start on server boot (Linux): `pm2 startup` then follow the printed
  instructions, then `pm2 save`.

### Option B: Linux systemd service

Create `/etc/systemd/system/fileuploader.service`:

```ini
[Unit]
Description=FileUploader app
After=network.target

[Service]
WorkingDirectory=/opt/fileuploader
ExecStart=/usr/bin/node server.js
Restart=always
EnvironmentFile=/opt/fileuploader/.env
User=www-data

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fileuploader
sudo systemctl status fileuploader
```

### Making it reachable on port 80/443 (recommended) — nginx reverse proxy

Right now the app is directly exposed to the internet on its own port (e.g.
`:3000`). The recommended setup is to put nginx in front of it, so nginx is
the only thing the public internet ever talks to, and Node only accepts
connections from nginx itself (`127.0.0.1`). This also avoids browser issues
where a `Strict-Transport-Security` header sent directly by the app causes
the browser to force-upgrade a plain-HTTP IP address to HTTPS and fail.

These steps assume a Debian/Ubuntu Linux server (adjust package manager for
other distros; on Windows Server use IIS + Application Request Routing
instead, or run nginx via WSL).

**Step 1 — Lock the Node app to localhost only.**

In the app's `.env`, set:
```
BIND_HOST=127.0.0.1
```
Restart the app. It will now refuse connections from anywhere except the
same machine — even if a firewall rule accidentally allows the port, no one
outside the server can reach Node directly anymore.

**Step 2 — Install nginx.**
```bash
sudo apt update
sudo apt install -y nginx
```

**Step 3 — Create a site config for the app.**
```bash
sudo nano /etc/nginx/sites-available/fileuploader
```
Paste (replace `server_name` with your domain, or use `_` to match any
hostname/IP if you don't have a domain yet):
```nginx
server {
    listen 80;
    server_name _;   # or files.yourcompany.com

    client_max_body_size 20G;  # must be >= MAX_UPLOAD_BYTES in .env

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;   # allow long uploads to complete
        proxy_send_timeout 3600s;
    }
}
```

**Step 4 — Enable the site and reload nginx.**
```bash
sudo ln -s /etc/nginx/sites-available/fileuploader /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # remove the default placeholder site
sudo nginx -t                                 # test the config for syntax errors
sudo systemctl reload nginx
```

**Step 5 — Update firewall / NSG rules.**
- Allow inbound `80` (and `443` once you add TLS) in the OS firewall
  (`sudo ufw allow 80,443/tcp`) and in the cloud NSG/security group.
- You can now remove/close the inbound rule for the app's own port (`3000`)
  entirely — since `BIND_HOST=127.0.0.1`, it wouldn't accept the connection
  anyway, but closing it at the firewall/NSG is good defense in depth.

Access the app at `http://<server-ip>/` (no more `:3000`) or your domain.

**Step 6 — Add real HTTPS (needs a domain name).**
Let's Encrypt cannot issue a certificate for a bare IP address — you need a
domain name pointed at the server first. Once you have one:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d files.yourcompany.com
```
Certbot edits the nginx config to add the certificate and redirect HTTP to
HTTPS, and sets up auto-renewal. Once this is in place, set `NODE_ENV=production`
in the app's `.env` and restart it — this makes the session cookie `Secure`
(browser-enforced HTTPS-only) and re-enables the HSTS header, which is only
safe to send once HTTPS is actually working end-to-end.

If you only have an IP address and no domain, stay on plain HTTP through
nginx (skip this step) and keep `NODE_ENV=development` — don't enable HSTS
without real HTTPS in place, or browsers will force-upgrade to HTTPS and
fail exactly like the raw-Node setup did.

### nginx on Windows Server (instead of the Linux steps above)

If your server is Windows instead of Linux, use these steps in place of
steps 2–5 above (step 1 — setting `BIND_HOST=127.0.0.1` — is the same on
any OS).

**Step 1 — Download and extract nginx.**
1. Download the latest **mainline** Windows zip from
   https://nginx.org/en/download.html
2. Extract it to `C:\nginx` (so `nginx.exe` ends up at `C:\nginx\nginx.exe`).

**Step 2 — Edit the config.**
Open `C:\nginx\conf\nginx.conf` in a text editor and replace the default
`server { ... }` block inside `http { ... }` with:
```nginx
server {
    listen 80;
    server_name _;   # or files.yourcompany.com

    client_max_body_size 20G;  # must be >= MAX_UPLOAD_BYTES in .env

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

**Step 3 — Start nginx.**
Open PowerShell as Administrator:
```powershell
cd C:\nginx
Start-Process .\nginx.exe
```
nginx runs as a background process (there's no window). Useful commands from
the same `C:\nginx` folder:
```powershell
.\nginx.exe -t          # test the config for syntax errors
.\nginx.exe -s reload   # reload after editing nginx.conf
.\nginx.exe -s stop     # stop nginx
```

**Step 4 — Run nginx as a proper Windows service (recommended).**
Plain `nginx.exe` won't survive a reboot or restart itself if it crashes. Use
NSSM (Non-Sucking Service Manager) to wrap it as a real service:
```powershell
# Download NSSM from https://nssm.cc/download and extract it, then:
cd C:\path\to\nssm\win64
.\nssm.exe install nginx "C:\nginx\nginx.exe"
.\nssm.exe set nginx AppDirectory "C:\nginx"
Start-Service nginx
```

**Step 5 — Update the Windows Firewall.**
```powershell
New-NetFirewallRule -DisplayName "nginx HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "nginx HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```
Also make sure the corresponding inbound rule is added in your cloud NSG
(Azure/AWS/etc.) if applicable. You can remove/close the rule for the app's
own port (`3000`) since `BIND_HOST=127.0.0.1` already blocks external access
to it directly.

**Step 6 — Add real HTTPS (needs a domain name).**
Use **win-acme** (https://www.win-acme.com/) — a free Let's Encrypt client
for Windows. Download it, run `wacme.exe` as Administrator, and follow the
prompts to issue a certificate for your domain and bind it in nginx (or IIS
if you're using that instead). As with Linux, Let's Encrypt cannot issue a
certificate for a bare IP address — you need a domain pointed at the server
first. Once HTTPS is working end-to-end, set `NODE_ENV=production` in `.env`
and restart the app.

---

## 9. Firewall / networking checklist

- If using nginx (recommended): open `80`/`443` only; the app's own port
  (`3000` by default) can be closed at the firewall/NSG once `BIND_HOST=127.0.0.1`
  is set, since nginx is the only public entry point.
- If not using nginx: open the app's own port (default `3000`) in your
  server's firewall / cloud security group.
- If deploying to a cloud VM (Azure, AWS, GCP), make sure the inbound rule for
  whichever port you're exposing is added to the VM's network security group.

---

## 10. Data & backups

- User accounts and file metadata live in `data/users.json` and
  `data/files.json`.
- The actual uploaded files live in the `uploads/` folder.
- Back up both `data/` and `uploads/` regularly — they are not committed to
  git and are the only copies of your data.

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `SESSION_SECRET is not set` error on startup | You haven't created `.env` from `.env.example`, or forgot to fill in `SESSION_SECRET` |
| `EADDRINUSE` error on startup | Something else is already using the configured `PORT`. Change `PORT` in `.env` or stop the other process |
| Can't log in as a newly registered user | New accounts are inactive by default — an admin must activate them at `/admin` |
| "Invalid or missing CSRF token" | Make sure cookies are enabled in the browser and you're not submitting a stale/cached form page. Refresh the page and try again |
| Uploads fail with a size error | The file is larger than `MAX_UPLOAD_BYTES` in `.env`. Increase the value and restart the app |
