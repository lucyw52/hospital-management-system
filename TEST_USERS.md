# Test Users Credentials

This file documents all test users available after running the seed script.

## How to Create Test Users

Run this command to seed the database with test users:

```bash
npm run seed
```

Or from the project root:

```bash
cd apps/api && npm run seed
```

## Available Test Users

All test users have the password: `password123`

| Role | Email | Name | Phone |
|------|-------|------|-------|
| **Admin** | `hospitaladmin@gmail.com` | System Administrator | +254712345678 |
| Receptionist | `receptionist@hms.com` | Sarah Johnson | +254700000002 |
| Doctor | `doctor@hms.com` | Dr. Michael Smith | +254700000003 |
| Lab Technician | `labtech@hms.com` | John Lab Tech | +254700000004 |
| Pharmacist | `pharmacist@hms.com` | Emma Pharmacist | +254700000005 |
| **Ward Clerk** | `wardclerk@hms.com` | Nurse Sarah | +254700000006 |

## Notes

- The admin password is `Kapiesh123` (set in create-admin script)
- All other roles use `password123`
- These are test credentials only. Change passwords in production!
- Accounts are automatically created as active
- You can modify credentials through the Staff Management UI as admin

## Creating New Users Manually

If you prefer not to run the seed script, you can create users manually:

1. Log in as Admin with credentials above
2. Navigate to **Staff Management**
3. Click **+ Add Staff Member**
4. Fill in the form and select the role
5. Saved user will be immediately available for login
