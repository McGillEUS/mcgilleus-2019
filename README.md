# McGill EUS Website

Website for the McGill Engineering Undergraduate Society, with a self-hosted admin for site content, contacts, groups, hours, and media.

## Pages

| Path | Description |
|------|-------------|
| `index.html` | Home |
| `getting-involved.html` | Societies, clubs, committees, design teams |
| `resources.html` | Services and resource links |
| `contact-us.html` | Executive + representation photo cards |
| `/admin/` | Single-account admin for all editable site content |

## Local development

Requires Node.js.

```bash
npm install
npm start
```

Then open:

- Site: http://localhost:3000
- Contact Us: http://localhost:3000/contact-us.html
- Admin: http://localhost:3000/admin/

### Default admin login

Copy the example config if needed:

```bash
cp config.example.json config.local.json
```

Default credentials (local/dev only — change immediately on any shared server):

- Username: `admin`
- Password: `eus-admin-change-me`

Admin login is rate-limited, uses httpOnly `SameSite=Strict` sessions, and blocks cross-site mutating requests. On first login with the example password, the UI forces a password change (14+ chars, letters + numbers).

To set a password hash manually:

```bash
node -e "console.log(require('bcryptjs').hashSync('YOUR_NEW_PASSWORD', 12))"
```

Paste the hash into `config.local.json` as `adminPasswordHash`. Also set a random `sessionSecret` (32+ chars) before deploy.

## How content editing works

Everything stays on your server under [`data/`](data/) and [`img/`](img/). Edit from `/admin/`:

| Admin tab | Data |
|-----------|------|
| Site | Nav, footer, brand (`site.json`) |
| Home | Hero + loader (`home.json`) |
| Contact | Page copy + office map (`contact-page.json`, `office.json`) |
| Get Involved | Hero / quiz labels (`involved.json`) |
| Resources | Featured cards, directory, short links (`resources.json`) |
| Quiz | Groups quiz graph (`quiz.json`) |
| Hours / Contacts / Groups | Existing roster, hours, and group directory |

General image uploads go to `img/uploads/`. Contact photos and group logos still use their dedicated folders.

### Office map (Mapbox)

Contact Us includes an office map. Add your Mapbox public token to `config.local.json`:

```json
"mapboxToken": "pk.your_token_here"
```

Without a token, the page falls back to an OpenStreetMap embed of the EUS office.

## Production notes

mcgilleus.ca currently serves static files through Caddy. For the admin to work in production, run this Node app on the EUS server and reverse-proxy to it (ask IT / `it.director@mcgilleus.ca` if unsure), for example:

```caddy
reverse_proxy localhost:3000
```

Keep `config.local.json` on the server only (it is gitignored). Do not commit real passwords.

## Yearly exec handoff

1. Log in at `/admin/`
2. Update names, roles, emails, sort order
3. Upload new headshots
4. Fill in SSMU Representative and Engineering Senator (seeded as TBD)
5. Optionally change the admin password hash in `config.local.json`
