# NourishOS Authentication & Authorization

Version: 1.0  
Product: Nourish Operational System (NourishOS)

---

# 1. Overview

NourishOS uses **Firebase Authentication** as the identity provider and **Google Sign-In** as the primary authentication method.

Authentication verifies **who the user is**, while authorization determines **what the user is allowed to do** using Role-Based Access Control (RBAC).

The system is designed to provide:

- Secure authentication
- Single Sign-On (SSO) with Google
- Role-based access
- Multi-outlet authorization
- Department-based permissions
- Real-time session management
- Audit logging

---

# 2. Authentication Architecture

```text
                 User
                   │
                   ▼
          Google Sign-In
                   │
                   ▼
      Firebase Authentication
                   │
            Firebase ID Token
                   │
                   ▼
        React Authentication Provider
                   │
         Load User Profile (Firestore)
                   │
                   ▼
        Load Role & Permissions
                   │
                   ▼
            Application Dashboard
```

---

# 3. Authentication Provider

Current provider:

- Google Authentication

Future providers:

- Microsoft Entra ID (Azure AD)
- Email & Password (Admin only)
- SAML / Enterprise SSO

---

# 4. User Login Flow

```text
Open Application

↓

Click "Sign in with Google"

↓

Google Authentication

↓

Firebase Authentication

↓

Receive ID Token

↓

Verify User Exists

↓

Load User Profile

↓

Load Role

↓

Load Permissions

↓

Load Outlet

↓

Load Department

↓

Record Login Audit

↓

Redirect to Dashboard
```

---

# 5. User Provisioning

Users are **not self-registered**.

Accounts are created by the HR onboarding process.

Provisioning workflow:

```text
HR Creates Employee

↓

HR Creates User Account

↓

Assign Role

↓

Assign Department

↓

Assign Outlet

↓

Activate Account

↓

Employee Signs In
```

If no active user profile exists after Google authentication, access is denied.

---

# 6. Firestore User Document

Collection:

```text
users
```

Example:

```json
{
  "uid": "firebase_uid",
  "employeeId": "EMP-0001",
  "email": "john@nourish.id",
  "displayName": "John Doe",
  "photoURL": "",
  "roleId": "hrManager",
  "departmentId": "hr",
  "outletId": "hq",
  "status": "active",
  "theme": "system",
  "lastLogin": "Timestamp",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

# 7. Account Status

Supported values:

```text
active
inactive
suspended
terminated
pending
```

Only **active** users may access the application.

---

# 8. Session Management

Firebase Authentication manages:

- Secure ID Tokens
- Refresh Tokens
- Automatic token renewal
- Persistent sessions

The application should:

- Restore sessions on refresh.
- Detect expired tokens.
- Automatically redirect to login if authentication fails.

---

# 9. Authorization (RBAC)

After authentication:

```text
Authenticate User

↓

Load User Document

↓

Load Role

↓

Load Permissions

↓

Verify Outlet

↓

Verify Department

↓

Render UI
```

Permissions are enforced through:

- Firestore Security Rules
- Cloud Functions
- Client-side permission guards

---

# 10. Route Protection

Routes are divided into:

### Public

- Login

### Protected

- Dashboard
- HR
- Operations
- Finance
- Documents
- Communication
- Settings

Unauthorized users are redirected to:

```text
/unauthorized
```

Unauthenticated users are redirected to:

```text
/login
```

---

# 11. Authentication Context

The React application should expose an authentication context.

Example:

```typescript
interface AuthContext {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  permissions: string[];
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}
```

---

# 12. Custom Hooks

Recommended hooks:

```text
useAuth()

useCurrentUser()

usePermissions()

useRole()

useOutlet()

useDepartment()
```

These hooks should abstract Firebase and Firestore logic from UI components.

---

# 13. Permission Guard

Reusable component:

```tsx
<PermissionGuard permission="employees.create">
  <CreateEmployeeButton />
</PermissionGuard>
```

If the permission is missing:

- Hide the component
- Or display an access denied message, depending on context

---

# 14. Outlet Restrictions

Users belong to one outlet unless granted cross-outlet access.

Example:

```text
Headquarters

Outlet A

Outlet B
```

Rules:

- Standard users access only their outlet.
- General Manager may access multiple outlets.
- Director and Super Admin may access all outlets.

---

# 15. Department Restrictions

Users are assigned to one department.

Examples:

- HR
- Finance
- Kitchen
- Bar
- Security
- Engineering

Department access further limits visibility of department-specific data.

---

# 16. Audit Logging

Record the following events:

- Login
- Logout
- Failed login
- Role change
- Permission change
- Account activation
- Account suspension

Audit records should include:

```json
{
  "userId": "",
  "action": "LOGIN",
  "timestamp": "Timestamp",
  "ipAddress": "",
  "userAgent": ""
}
```

Audit entries are created by Cloud Functions where possible.

---

# 17. Security Rules

Firestore Security Rules should verify:

- User is authenticated.
- User status is active.
- Required permission exists.
- Outlet matches.
- Department matches.
- Resource ownership (when applicable).

Sensitive writes (approvals, role changes, audit logs) must go through Cloud Functions.

---

# 18. Cloud Functions

Authentication-related functions:

```text
getCurrentUser()

createUserProfile()

updateUserProfile()

activateUser()

suspendUser()

changeRole()

assignOutlet()

assignDepartment()
```

Each function validates:

- Authentication
- Caller permissions
- Input data
- Business rules

---

# 19. Session Timeout

Recommended behavior:

- Firebase handles token refresh automatically.
- Inactive browser tabs continue to refresh tokens while authenticated.
- Users can manually sign out at any time.
- Optionally prompt users after extended inactivity (future enhancement).

---

# 20. Login Screen

Elements:

- Nourish Logo
- Welcome message
- "Sign in with Google" button
- Company branding
- Version number
- Support link (optional)

No username or password fields are required in the initial release.

---

# 21. Logout Flow

```text
User Clicks Logout

↓

Firebase Sign Out

↓

Clear Local State

↓

Clear Cached Data

↓

Record Audit Log

↓

Redirect to Login
```

---

# 22. Error Handling

Possible scenarios:

| Scenario           | Message                                             |
| ------------------ | --------------------------------------------------- |
| Unauthorized email | Your account is not authorized.                     |
| Inactive account   | Your account is inactive. Please contact HR.        |
| Suspended account  | Your account has been suspended.                    |
| Network error      | Unable to connect. Please try again.                |
| Permission denied  | You do not have permission to access this resource. |

Messages should be user-friendly and avoid exposing technical details.

---

# 23. Security Best Practices

- Use HTTPS exclusively.
- Never trust client-side authorization.
- Validate permissions server-side.
- Keep Firebase SDK up to date.
- Apply the principle of least privilege.
- Store only required user profile data.
- Do not expose sensitive configuration values.
- Log security-relevant events.

---

# 24. Future Enhancements

Planned improvements:

- Multi-factor Authentication (MFA)
- Microsoft Entra ID login
- Enterprise SSO (SAML/OIDC)
- Passwordless authentication
- Biometric authentication (mobile)
- Device management
- Session management dashboard
- Login notifications
- Trusted device recognition

---

# 25. Authentication Acceptance Criteria

A release is considered complete when:

- Users can sign in using Google.
- Only active users gain access.
- User profiles load successfully.
- RBAC is enforced across the application.
- Protected routes cannot be accessed anonymously.
- Audit logs record authentication events.
- Sessions persist across browser refreshes.
- Logout clears the session correctly.
- Authentication flows function on desktop, tablet, and mobile.
