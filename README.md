# Faculty Research & Project Collaboration Finder

This project follows the **Incremental Process Model** across four complete increments:

- **Increment 1**: Core authentication & opportunity posting
- **Increment 2**: Student applications & seat management
- **Increment 3**: Faculty review & applicant decision workflow (Accept/Reject)
- **Increment 4**: Department Administrator oversight dashboard & analytics

---

## What's Included

### Increment 1 — Core Authentication & Opportunity Posting
- **Role-based authentication**: Faculty, Student, and Admin account registration and login.
- **Security**: Passwords salted and hashed with `bcrypt`, session management via `express-session` with HTTP-only cookies.
- **Faculty features**: Create research opportunities with title, description, domain tags, required skills, and seat counts. View owned postings.
- **Student features**: Browse open opportunities, real-time debounced filtering by research domain and required skills.
- **Storage**: SQLite database via `better-sqlite3` with transactional consistency.

### Increment 2 — Student Applications & Seat Tracking
- **Application flow**: Students can apply to open postings with an optional cover message.
- **Atomic seat management**: Seats filled increment on application and decrement on withdrawal using database transactions.
- **Duplicate prevention**: `UNIQUE(opportunity_id, student_id)` constraint prevents multiple submissions.
- **Student dashboard**: "My Applications" view tracking status, opportunity metadata, and an option to withdraw pending applications.
- **Dynamic badges**: Live state indicators on opportunity cards (`Applied`, `Full`, `Closed`).

### Increment 3 — Faculty Review & Decision Workflow
- **Applicant tracking**: Faculty can view the full applicant roster for each of their postings with cover messages, student department, and timestamp.
- **Accept/Reject decisions**: Faculty can accept or reject individual pending applicants.
- **Auto-closure**: When all seats are filled by accepted applicants, the opportunity automatically transitions to `Closed`, and remaining pending applications are resolved.
- **Seat recovery**: Rejecting an application frees up the reserved seat, reopening capacity for other applicants.
- **Student feedback**: Accepted and Rejected badges update in real-time on both the student's board and application history.

### Increment 4 — Department Admin Oversight & Analytics
- **Admin role & security**: Dedicated `admin` role with route guards (`requireAdmin`).
- **Metrics dashboard**: Live aggregate statistics covering total faculty, students, opportunities, open postings, total applications, accepted matches, and pending reviews.
- **Full opportunity oversight**: Master table of all department opportunities with seat occupancy and application breakdown.
- **Applicant drill-down**: Expandable inline details showing student names, emails, departments, application statuses, and dates.
- **User directory**: System-wide directory of all registered users with role badges and join dates.

---

## Run the Application

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

---

## Project Structure

```
server.js                Express app entry point & route mounting
db.js                    SQLite schema, constraints & database connection
routes/
  auth.js                Registration, login, logout, and session check
  opportunities.js       Post, list, and filter research opportunities
  applications.js        Apply, withdraw, list applicants, and accept/reject decisions
  admin.js               Oversight stats, all opportunities, drill-down, and user directory
public/
  index.html             Landing page with role portal entry points
  login.html             Universal login screen
  register.html          3-way registration (Student / Faculty / Dept Admin)
  student.html           Student dashboard (browse, search, apply, my applications)
  faculty.html           Faculty dashboard (post opportunity, review applicants, accept/reject)
  admin.html             Department administrator oversight & analytics dashboard
  css/style.css          Shared theme styling, cards, status pills, and tables
  js/                    Frontend client logic for auth, student, faculty, admin
data/
  app.db                 SQLite database file (automatically generated on first run)
```
