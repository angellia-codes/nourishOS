# Nourish Candidate Portal → NourishOS
## Full Technical Blueprint

## 1. System Architecture

```text
                         CANDIDATE
                             │
                             ▼
              ┌──────────────────────────┐
              │   NOURISH CAREER PORTAL  │
              │                          │
              │ React + Vite + Tailwind  │
              │                          │
              │ • Application            │
              │ • Employment Form        │
              │ • DISC Assessment        │
              │ • Document Upload        │
              │ • Submission             │
              └────────────┬─────────────┘
                           │
                           │ Firebase SDK
                           ▼
        ┌──────────────────────────────────────────┐
        │              FIREBASE                    │
        │                                          │
        │ Firebase Authentication                  │
        │ Firestore                                │
        │ Firebase Storage                         │
        │ Cloud Functions                          │
        │ Firebase App Check                       │
        │ Cloud Scheduler                          │
        └────────────────────┬─────────────────────┘
                             │
                       Secure Internal API
                             │
                             ▼
              ┌──────────────────────────┐
              │        NOURISHOS         │
              │                          │
              │ Recruitment              │
              │ Candidate Management     │
              │ Interview Management     │
              │ Scorecards               │
              │ Hiring Decision          │
              │ Employee Conversion      │
              └──────────────────────────┘
```

---

## 2. Applications

There should be two separate applications.

### App 1 — Nourish Career Portal

Candidate-facing application.

Recommended stack:

- React
- Vite
- TypeScript
- Tailwind CSS
- Firebase SDK
- React Hook Form
- Zod

Example URL:

`careers.nourishgroup.id`

### App 2 — NourishOS

Internal management application.

Recommended stack:

- React
- TypeScript
- Tailwind CSS
- Firebase
- Firestore
- Cloud Functions

Example URL:

`os.nourishgroup.id`

Both applications connect to the same Firebase project, while access is controlled through Firebase Authentication, Custom Claims, Firestore Rules, Storage Rules, and Cloud Functions.

---

## 3. Firebase Services

| Firebase Service | Purpose |
|---|---|
| Firebase Authentication | Candidate and employee authentication |
| Firestore | Main database |
| Firebase Storage | CV, certificates, and candidate documents |
| Cloud Functions | Backend/business logic |
| Firebase App Check | Protect Firebase resources |
| Cloud Scheduler | Automated reminders and maintenance |
| Firebase Hosting | Host web applications |
| Cloud Logging | Audit and debugging |

---

## 4. Authentication Architecture

### Candidates

Candidate creates an account using:

- Email + password
- Optional Google Sign-In

Candidate Firebase UID becomes the primary identity.

```text
Firebase Auth UID
        ↓
Candidate Profile
        ↓
candidateId
```

### Internal Users

NourishOS users use:

- Google Workspace login, or
- Email/password

Roles are stored using Firebase Custom Claims.

Example:

```json
{
  "role": "HR_MANAGER",
  "department": "HR"
}
```

Possible roles:

```text
SUPER_ADMIN
HR_MANAGER
HR_ADMIN
GM
DEPT_HEAD
INTERVIEWER
RECRUITER
```

---

# 5. Firestore Data Model

Recommended top-level collections:

```text
users/
employees/
departments/
outlets/
positions/

candidates/
applications/
employment_forms/
disc_questions/
disc_attempts/
disc_results/
candidate_documents/

interviews/
interview_scores/
hiring_decisions/

notifications/
audit_logs/
```

---

# 6. Users Collection

Path:

```text
users/{uid}
```

Example:

```json
{
  "uid": "firebase_uid",
  "name": "Angel",
  "email": "angel@company.com",
  "role": "HR_MANAGER",
  "departmentId": "HR",
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# 7. Candidates

Path:

```text
candidates/{candidateId}
```

Example:

```json
{
  "candidateId": "CAND-2026-00125",
  "authUid": "firebase_uid",
  "fullName": "John Doe",
  "email": "john@email.com",
  "phone": "+628123456789",
  "source": "Instagram",
  "status": "DISC_COMPLETED",
  "currentApplicationId": "APP-2026-00125",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Candidate Status

```text
REGISTERED
FORM_IN_PROGRESS
FORM_COMPLETED
DISC_IN_PROGRESS
DISC_COMPLETED
HR_SCREENING
HR_INTERVIEW
DEPT_HEAD_INTERVIEW
GM_INTERVIEW
OFFER
HIRED
REJECTED
WITHDRAWN
ON_HOLD
```

---

# 8. Applications

A candidate can apply for more than one position.

Path:

```text
applications/{applicationId}
```

Example:

```json
{
  "applicationId": "APP-2026-00125",
  "candidateId": "CAND-2026-00125",
  "positionId": "BARISTA",
  "positionName": "Barista",
  "departmentId": "F&B",
  "outletId": "NOURISH-ULUWATU",
  "source": "Instagram",
  "status": "HR_SCREENING",
  "assignedHR": "USER-001",
  "assignedDeptHead": "USER-023",
  "assignedGM": "USER-003",
  "appliedAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# 9. Employment Form

Path:

```text
employment_forms/{applicationId}
```

Example:

```json
{
  "applicationId": "APP-2026-00125",
  "candidateId": "CAND-2026-00125",

  "personal": {
    "fullName": "John Doe",
    "nickname": "John",
    "dateOfBirth": "1998-04-12",
    "placeOfBirth": "Denpasar",
    "gender": "Male",
    "maritalStatus": "Single"
  },

  "contact": {
    "phone": "+628123456789",
    "email": "john@email.com",
    "address": "Bali"
  },

  "education": [
    {
      "institution": "ABC School",
      "level": "Senior High School",
      "major": "Hospitality",
      "graduationYear": 2017
    }
  ],

  "employmentHistory": [
    {
      "company": "XYZ Restaurant",
      "position": "Barista",
      "startDate": "2022-01",
      "endDate": "2026-06",
      "reasonForLeaving": "Career development"
    }
  ],

  "skills": {
    "languages": [
      "Indonesian",
      "English"
    ],
    "computerSkills": [],
    "technicalSkills": [
      "Espresso",
      "Latte Art"
    ]
  },

  "references": [],
  "declarationAccepted": true,
  "completedAt": "timestamp"
}
```

---

# 10. DISC Assessment

## Important

The candidate should submit answers, not the final DISC scores.

The final DISC result must be calculated server-side using Cloud Functions.

Do not allow the client to directly write or manipulate the final result.

---

## 10.1 DISC Question Bank

Path:

```text
disc_questions/{questionId}
```

Example:

```json
{
  "questionId": "DISC-001",
  "question": "Which statement describes you best?",
  "options": [
    {
      "id": "A",
      "text": "I like taking charge",
      "dimension": "D"
    },
    {
      "id": "B",
      "text": "I enjoy meeting people",
      "dimension": "I"
    },
    {
      "id": "C",
      "text": "I prefer a stable environment",
      "dimension": "S"
    },
    {
      "id": "D",
      "text": "I pay attention to details",
      "dimension": "C"
    }
  ],
  "active": true
}
```

For production, use a properly licensed DISC assessment methodology/questions rather than copying proprietary assessment content.

---

## 10.2 DISC Attempts

Path:

```text
disc_attempts/{attemptId}
```

Example:

```json
{
  "attemptId": "DISC-ATT-001",
  "applicationId": "APP-2026-00125",
  "responses": [
    {
      "questionId": "DISC-001",
      "answer": "A"
    }
  ],
  "status": "COMPLETED",
  "startedAt": "timestamp",
  "completedAt": "timestamp"
}
```

---

## 10.3 DISC Results

Path:

```text
disc_results/{applicationId}
```

Example:

```json
{
  "applicationId": "APP-2026-00125",
  "candidateId": "CAND-2026-00125",

  "scores": {
    "D": 72,
    "I": 58,
    "S": 41,
    "C": 69
  },

  "primaryStyle": "D",
  "secondaryStyle": "C",

  "completedAt": "timestamp",
  "calculatedBy": "cloud_function_v1"
}
```

Flow:

```text
DISC Attempt
      ↓
Cloud Function
      ↓
Calculate Result
      ↓
disc_results
```

---

# 11. Candidate Documents

Use Firebase Storage.

Storage structure:

```text
candidate-documents/
    {candidateId}/
        cv.pdf
        certificate.pdf
        portfolio.pdf
```

Firestore metadata:

```text
candidate_documents/{documentId}
```

Example:

```json
{
  "documentId": "DOC-001",
  "candidateId": "CAND-2026-00125",
  "applicationId": "APP-2026-00125",
  "type": "CV",
  "fileName": "John-Doe-CV.pdf",
  "storagePath": "candidate-documents/CAND-2026-00125/cv.pdf",
  "uploadedAt": "timestamp"
}
```

---

# 12. Interview Structure

Path:

```text
interviews/{interviewId}
```

Example:

```json
{
  "interviewId": "INT-00125-HR",
  "applicationId": "APP-2026-00125",
  "type": "HR",
  "interviewerId": "USER-001",
  "scheduledAt": "timestamp",
  "status": "COMPLETED",
  "createdAt": "timestamp"
}
```

Interview types:

```text
HR
DEPARTMENT_HEAD
GM
```

---

# 13. Interview Scorecard

Path:

```text
interview_scores/{scoreId}
```

Example:

```json
{
  "interviewId": "INT-00125-HR",

  "criteria": {
    "communication": 4,
    "attitude": 5,
    "technicalKnowledge": 3,
    "teamwork": 5,
    "problemSolving": 4,
    "cultureFit": 5
  },

  "overallScore": 4.3,

  "strengths": "Strong communication and positive attitude.",
  "concerns": "Limited technical experience.",

  "recommendation": "PROCEED",

  "comments": "Recommended for Dept Head interview.",
  "submittedAt": "timestamp"
}
```

---

# 14. Hiring Decision

Path:

```text
hiring_decisions/{applicationId}
```

Example:

```json
{
  "applicationId": "APP-2026-00125",
  "hrRecommendation": "PROCEED",
  "deptHeadRecommendation": "PROCEED",
  "gmDecision": "HIRE",
  "finalStatus": "HIRED",
  "decidedBy": "USER-003",
  "decidedAt": "timestamp"
}
```

---

# 15. Candidate Portal Flow

## Screen 1 — Landing

```text
Welcome to Nourish Group Indonesia

[ Apply for a Position ]
```

## Screen 2 — Position Selection

```text
Select Position

Barista
Bartender
Waitress
Cashier
Cook
Chef de Partie
...
```

## Screen 3 — Account

```text
Create Candidate Account

Email
Password

[ Continue ]
```

## Screen 4 — Employment Form

Sections:

- Personal Information
- Education
- Employment History
- Skills
- References
- Emergency Contact
- Declaration

Action:

```text
[ Save & Continue ]
```

## Screen 5 — Document Upload

```text
CV
Certificates
Portfolio

[ Upload ]
```

## Screen 6 — DISC

```text
DISC Personality Assessment

Estimated time: 10–15 minutes

Please answer honestly.

[ Start Assessment ]
```

## Screen 7 — Completion

```text
Assessment Completed ✓

Thank you for completing your application.

Your application has been submitted to
Nourish Group Indonesia.
```

---

# 16. Candidate Dashboard

```text
MY APPLICATION

Barista
Nourish Uluwatu

Application Status
━━━━━━━━━━━━━━━━━━
✓ Application
✓ Employment Form
✓ DISC Test
✓ HR Screening
○ HR Interview
○ Department Interview
○ Final Decision
```

Candidate must not see internal interview scores or internal DISC interpretation intended for interviewers.

---

# 17. NourishOS Recruitment Dashboard

HR dashboard:

```text
RECRUITMENT

New Candidates             24
HR Screening               12
HR Interview                8
Dept Head Interview         5
GM Interview                3
Offer                       2
Hired                       7
```

Candidate table:

| Candidate | Position | Outlet | DISC | Status |
|---|---|---|---|---|
| John Doe | Barista | Uluwatu | D/C | HR Screening |
| Jane Doe | Cashier | Ungasan | S/I | Dept Head |
| Maria | Waitress | Berawa | I/S | GM Interview |

---

# 18. Candidate 360° Page

The Candidate 360° should be the core NourishOS recruitment screen.

```text
JOHN DOE
Barista — Nourish Uluwatu

────────────────────────────

APPLICATION
Applied: 19 Aug 2026
Source: Instagram

────────────────────────────

EMPLOYMENT PROFILE

Experience: 2.5 years
Previous Position: Barista

[ View Full Form ]

────────────────────────────

DISC PROFILE

Primary: D
Secondary: C

D ████████
I ██████
S ████
C ███████

[ View DISC Report ]

────────────────────────────

INTERVIEW

HR
Score: 4.3
Recommendation: Proceed

Dept Head
Score: 4.6
Recommendation: Proceed

GM
Pending

────────────────────────────

FINAL DECISION
Pending
```

---

# 19. Interviewer View

Department Heads should only see information relevant to their role.

Potential access:

- Candidate profile
- Relevant employment history
- CV
- DISC summary
- HR recommendation
- Technical interview
- Department scorecard

Potentially restricted:

- Previous salary
- Internal HR notes
- Sensitive personal information

This should be implemented using role-based access control.

---

# 20. DISC → Interview Intelligence

NourishOS can generate interview focus areas based on the DISC profile.

Example:

```text
DISC PROFILE

Primary: I
Secondary: S
```

Suggested interview focus:

```text
Strengths to explore:
✓ Customer interaction
✓ Communication
✓ Team collaboration

Areas to explore:
⚠ Attention to detail
⚠ Handling pressure
⚠ Consistency
```

This is decision support only and must not automatically determine hiring outcomes.

---

# 21. Cloud Functions

Recommended backend functions:

```text
createCandidate()
createApplication()
submitEmploymentForm()
startDiscAssessment()
submitDiscAssessment()
calculateDiscResult()
completeApplication()
assignRecruiter()
assignInterviewer()
createInterview()
submitInterviewScore()
updateApplicationStatus()
createEmployeeFromCandidate()
sendCandidateNotification()
sendInternalNotification()
generateCandidateSummary()
writeAuditLog()
```

---

# 22. Key Cloud Function — Complete Application

Flow:

```text
Candidate submits application
        ↓
Validate employment form
        ↓
Check DISC completed
        ↓
Check required documents
        ↓
Update application
        ↓
Status = HR_SCREENING
        ↓
Create HR notification
        ↓
Candidate appears in NourishOS
```

---

# 23. Candidate → Employee Conversion

When GM selects:

```text
HIRE
```

Call:

```text
createEmployeeFromCandidate()
```

Flow:

```text
Candidate
     ↓
Application
     ↓
GM = HIRE
     ↓
Cloud Function
     ↓
Create Employee
     ↓
Generate Employee ID
     ↓
Copy required profile data
     ↓
Create onboarding record
```

Example:

```text
CAND-2026-00125
        ↓
NGI-EMP-00452
```

Then:

```text
Employee
 ├── Personal Information
 ├── Position
 ├── Department
 ├── Outlet
 ├── Employment Contract
 ├── Onboarding
 └── Training
```

---

# 24. Firebase Security Rules

Core principle:

> Candidates can only access their own candidate/application data. Internal users can access recruitment data according to their role.

Access model:

```text
Candidate
    ↓
Own data only

HR
    ↓
All recruitment data

Dept Head
    ↓
Assigned candidates

GM
    ↓
Candidates requiring GM decision

Super Admin
    ↓
Everything
```

Example structure:

```text
match /candidates/{candidateId} {

  allow read:
    if isCandidateOwner(candidateId)
    || isHR()
    || isSuperAdmin();

  allow create:
    if isAuthenticated();

  allow update:
    if isCandidateOwner(candidateId)
    || isHR()
    || isSuperAdmin();

  allow delete:
    if isSuperAdmin();
}
```

Helper functions:

```text
isAuthenticated()
isSuperAdmin()
isHR()
isGM()
isDeptHead()
isCandidateOwner()
isAssignedInterviewer()
```

---

# 25. DISC Security

DISC results should be more restricted.

```text
match /disc_results/{applicationId} {

  allow read:
    if isHR()
    || isGM()
    || isAssignedDeptHead(applicationId)
    || isSuperAdmin();

  allow write:
    if false;
}
```

Only Cloud Functions should create/update final DISC results.

---

# 26. Interview Security

```text
match /interview_scores/{scoreId} {

  allow read:
    if isHR()
    || isGM()
    || isAssignedInterviewer(scoreId)
    || isSuperAdmin();

  allow create:
    if isAssignedInterviewer(scoreId);

  allow update:
    if isAssignedInterviewer(scoreId)
    || isHR()
    || isSuperAdmin();
}
```

---

# 27. Storage Security

Candidate should only access their own documents.

Structure:

```text
candidate-documents/{candidateId}/{file}
```

Security requirements:

- Candidate can access only their own documents.
- HR can access recruitment documents.
- Assigned interviewers receive access only when required.
- Maximum file size enforced.
- Allowed MIME types restricted.
- PDF/JPG/PNG only unless another format is specifically required.
- Secure file naming.
- Malware/virus scanning should be considered for production.

---

# 28. Audit Logs

Create:

```text
audit_logs/{logId}
```

Example:

```json
{
  "actorId": "USER-001",
  "action": "VIEW_CANDIDATE",
  "resource": "CAND-2026-00125",
  "timestamp": "timestamp",
  "metadata": {}
}
```

Track:

```text
VIEW_CANDIDATE
VIEW_DISC
DOWNLOAD_DOCUMENT
UPDATE_STATUS
ASSIGN_INTERVIEWER
SUBMIT_SCORE
CHANGE_DECISION
CREATE_EMPLOYEE
```

---

# 29. Notifications

Collection:

```text
notifications/{notificationId}
```

Example:

```json
{
  "recipientId": "USER-001",
  "type": "NEW_CANDIDATE",
  "title": "New Candidate",
  "message": "John Doe has applied for Barista.",
  "applicationId": "APP-2026-00125",
  "read": false,
  "createdAt": "timestamp"
}
```

NourishOS can show:

```text
🔔 3 New Candidates
```

Future integrations can include WhatsApp and email notifications.

---

# 30. Application State Machine

Do not allow arbitrary status changes from the frontend.

Recommended flow:

```text
APPLIED
   ↓
FORM_COMPLETED
   ↓
DISC_COMPLETED
   ↓
HR_SCREENING
   ↓
HR_INTERVIEW
   ↓
DEPT_HEAD_INTERVIEW
   ↓
GM_INTERVIEW
   ↓
OFFER
   ↓
HIRED
```

Alternative exits:

```text
REJECTED
WITHDRAWN
ON_HOLD
```

Cloud Functions should validate every status transition.

---

# 31. Example Integration

Candidate completes all requirements:

```text
Candidate Portal
       │
       ▼
submitEmploymentForm()
       │
       ▼
submitDiscAssessment()
       │
       ▼
calculateDiscResult()
       │
       ▼
completeApplication()
       │
       ▼
Firestore
       │
       ├──────────────┐
       ▼              ▼
NourishOS       HR Notification
       │
       ▼
Candidate 360°
```

HR immediately sees:

```text
🆕 NEW CANDIDATE

John Doe
Barista
Nourish Uluwatu

Form: ✓
CV: ✓
DISC: ✓

Primary DISC: D
Secondary: C

[ Start HR Screening ]
```

---

# 32. Recommended Firebase Project Structure

For production:

```text
nourish-production
│
├── Firebase Authentication
├── Firestore
├── Storage
├── Cloud Functions
├── App Check
├── Cloud Scheduler
├── Career Portal
└── NourishOS
```

For development:

```text
nourish-development
```

Keep development and production data completely separated.

---

# 33. Environment Variables

Candidate Portal:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

NourishOS uses the same Firebase project configuration where appropriate.

Firebase client configuration is not itself a secret. Security must be enforced using:

- Firebase Security Rules
- Storage Rules
- Authentication
- Custom Claims
- App Check
- Cloud Functions
- Server-side authorization

Never place Firebase Admin SDK credentials in frontend code.

---

# 34. Repository Structure

## Candidate Portal

```text
nourish-career-portal/
│
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Landing/
│   │   ├── Apply/
│   │   ├── EmploymentForm/
│   │   ├── DISC/
│   │   └── Dashboard/
│   │
│   ├── hooks/
│   ├── services/
│   ├── schemas/
│   ├── firebase/
│   └── utils/
│
└── functions/
```

## NourishOS

```text
nourishOS/
│
├── src/
│   ├── modules/
│   │   ├── recruitment/
│   │   ├── employees/
│   │   ├── onboarding/
│   │   └── training/
│   │
│   └── firebase/
│
└── functions/
```

Alternative centralized backend:

```text
nourish-backend/
└── functions/
    ├── candidates/
    ├── recruitment/
    ├── disc/
    ├── interviews/
    ├── employees/
    └── notifications/
```

---

# 35. Development Phases

## Phase 1 — Candidate Portal MVP

Build:

- Candidate registration
- Position selection
- Employment form
- Document upload
- DISC assessment
- Application submission
- Candidate dashboard

## Phase 2 — NourishOS Integration

Build:

- Candidate database
- Candidate 360°
- DISC display
- Document viewer
- Recruitment status
- HR screening

## Phase 3 — Interview Management

Build:

- Interview scheduling
- HR scorecard
- Department Head scorecard
- GM scorecard
- Recommendations
- Interview history

## Phase 4 — Hiring Automation

Build:

- GM approval
- Offer status
- Candidate → Employee conversion
- Employee ID generation
- Onboarding creation

## Phase 5 — Advanced Features

Potential future features:

- AI candidate summary
- Interview question recommendations
- WhatsApp notifications
- Email notifications
- Recruitment analytics
- Time-to-hire dashboard
- Source-of-hire analytics
- Candidate pipeline analytics
- Talent pool

---

# 36. Final Recommended Architecture

```text
                    ┌─────────────────────┐
                    │   CANDIDATE         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ NOURISH CAREER      │
                    │ PORTAL              │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Firebase Auth       │
                    │ Firestore           │
                    │ Storage             │
                    │ App Check           │
                    │ Cloud Functions     │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴──────────────┐
                 │                            │
                 ▼                            ▼
       ┌─────────────────┐          ┌─────────────────┐
       │ Recruitment DB  │          │ Employee DB     │
       │                 │          │                 │
       │ Candidates      │          │ Employees       │
       │ Applications    │          │ Contracts       │
       │ DISC            │          │ Onboarding      │
       │ Interviews      │          │ Training        │
       └────────┬────────┘          └─────────────────┘
                │
                ▼
       ┌─────────────────────────┐
       │       NOURISHOS         │
       │                         │
       │ Recruitment Dashboard   │
       │ Candidate 360°          │
       │ Interview Scorecards    │
       │ Hiring Decision         │
       └──────────┬──────────────┘
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
         HR     HOD        GM
                  │
                  ▼
                HIRED
                  │
                  ▼
          Employee Profile
                  │
                  ▼
             Onboarding
```

## Core Design Principle

The **Nourish Career Portal** is the controlled candidate intake system.

**NourishOS** remains the single source of truth for internal recruitment and employee management.

**Firebase Cloud Functions** sit between candidate actions and sensitive internal recruitment records.

This prevents the public candidate application from directly manipulating internal HR data while allowing completed Employment Forms, DISC results, documents, and application information to flow automatically into NourishOS.
