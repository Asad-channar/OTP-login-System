# SecureAuth — OTP Login System

A web-based two-factor authentication (2FA) system built with vanilla HTML, CSS, and JavaScript. Users log in with a username and password, then verify a 6-digit One-Time Password (OTP) sent to their registered email — all within a 10-second window.

---

## What It Does

Standard login alone is vulnerable. If a password is stolen or leaked, an attacker can walk straight in. This system adds a second gate: even with the correct password, you cannot get in without the OTP that was just sent to the account's email address.

The two factors are:
1. **Something you know** — username + password
2. **Something you receive** — a fresh 6-digit OTP delivered to your email

Both must pass, in order, for access to be granted.

---

## Project Structure

```
├── index.html       # The login interface (markup only)
├── style.css        # All visual styling
├── app.js           # All authentication logic
└── users.json       # User database (75 accounts)
```

Each file has a single responsibility. HTML, CSS, and JavaScript are kept completely separate.

---

## How the Login Works

```
User enters username + password
        ↓
System checks users.json
        ↓
 ┌──────┴──────┐
 │             │
Not found   Credentials
/ wrong      correct
 │             ↓
 │       OTP generated (6 digits)
 │             ↓
Login      OTP sent to registered email
Failed          ↓
           User enters OTP (10s window)
                ↓
         ┌──────┴──────┐
         │             │
      Wrong /       Correct +
      Expired       In time
         │             ↓
         │       Login Successful
      Login       Database panel
      Failed        revealed
```

---

## Features

- **JSON-based user database** — 75 user accounts loaded via `fetch()` at startup
- **Login button disabled** until the database finishes loading
- **Live countdown ring** — changes from blue → amber → red as time runs out
- **6-box OTP input** — auto-advances between digits, supports paste
- **Database panel hidden** until OTP is verified — not visible before login
- **Real-time server log** — every event is recorded (login attempts, OTP generation, successes, failures, sign-outs)
- **Search + pagination** on the user table (10 records per page)
- **Responsive layout** — works on desktop and mobile browsers

---

## Getting Started

> **Note:** The database is loaded via `fetch()`, which requires an HTTP server. Opening `index.html` directly as a file (`file://`) will not work.

**Option 1 — Python (no install needed):**
```bash
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000)

**Option 2 — VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html` → *Open with Live Server*.

**Option 3 — Node.js:**
```bash
npx serve .
```

---

## User Database

Accounts are stored in `users.json` with this structure:

```json
{
  "users": [
    {
      "user_id": 1,
      "username": "ali29",
      "password": "Ali24$7",
      "email": "ali.khan8@yahoo.com"
    }
  ]
}
```

The database contains 75 accounts. Passwords follow the format: first 3 letters capitalised + digits + special character.

> ⚠️ Passwords are stored in plaintext in this project for demonstration purposes. In a production system they must be hashed with bcrypt or Argon2.

---

## Known Security Limitations

Some limitations were left to undertand the concept of security if it will be in a production environment. This will help us to improve such systems in a real environment.

| # | Issue | Why It Matters |
|---|-------|----------------|
| 1 | Plaintext password storage | A database leak exposes all passwords immediately |
| 2 | No brute-force protection | All 1,000,000 OTP combinations can be tried within 10 seconds |
| 3 | No HTTPS | Credentials travel unencrypted over the network |
| 4 | Weak random number generator | `Math.random()` is not cryptographically secure |
| 5 | No account lockout | Unlimited login attempts are permitted |
| 6 | No session tokens | No secure state is maintained after login |
| 7 | OTP shown on screen | In a real system the OTP must only arrive via email |
| 8 | No input sanitisation | Fields are not protected against injection attacks |

A full analysis of all weaknesses and their mitigations is covered in the accompanying security report.


## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, animations) |
| Logic | Vanilla JavaScript (ES6+) |
| Database | JSON file loaded via Fetch API |
| Fonts | Space Mono, DM Sans (Google Fonts) |

---

## File Responsibilities

**`index.html`** — Structure only. Contains the three screens (login, OTP, success) and the database panel. No inline styles or scripts.

**`style.css`** — All visual design. CSS variables for theming, animations for transitions, and responsive layout rules.

**`app.js`** — All logic. Loads the database, handles credential checks, generates the OTP, runs the countdown timer, controls which screen is visible, and manages the server log.

**`users.json`** — Data only. 75 user records. Consumed by `app.js` via `fetch()` on page load.

---

## License

This project was created for academic/educational purposes.
