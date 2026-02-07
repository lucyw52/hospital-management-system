# Creating Admin User

## Quick Start

Your hospital management system is already configured to redirect users to the login page when they visit the site.

## Create Admin User Command

To create the initial admin user, run:

```bash
npm run create-admin
```

This will create an admin user with the following credentials:

- **Email:** `admin@hospital.com`
- **Password:** `admin123`
- **Role:** ADMIN

### Default Admin Credentials

```
Email:    admin@hospital.com
Password: admin123
```

⚠️ **Important:** Please change the password immediately after your first login!

## Admin Capabilities

Once logged in as admin, you can:
- ✅ Create other staff members (doctors, nurses, receptionists, etc.)
- ✅ Assign roles and permissions
- ✅ Set passwords for new users
- ✅ Manage system settings
- ✅ View all system activities

## What Happens on First Visit?

When you run the system and visit `http://localhost:3000`:
1. The system checks if you're logged in
2. If not logged in → You're redirected to `/login`
3. If logged in → You're redirected to your role-specific dashboard:
   - Admin → `/admin`
   - Doctor → `/doctor`
   - Receptionist → `/receptionist`
   - Lab Technician → `/lab`
   - Pharmacist → `/pharmacist`
   - Ward Clerk → `/ward`

## Step-by-Step Setup

1. **Start the database** (if not already running)
2. **Run migrations:**
   ```bash
   npm run migrate:dev
   ```

3. **Create admin user:**
   ```bash
   npm run create-admin
   ```

4. **Start the system:**
   ```bash
   npm run dev
   ```

5. **Login at:** `http://localhost:3000/login`

## Troubleshooting

### "Admin user already exists"
If you see this message, an admin user has already been created. Use the credentials above to login.

### Can't login?
1. Verify the database is running
2. Check that migrations have been applied: `npm run migrate:dev`
3. Ensure the API is running on `http://localhost:3001`
4. Check browser console for errors

### Need to reset admin password?
You can manually reset it using Prisma Studio:
```bash
npm run studio
```
Then navigate to the User table and update the admin user.
