# NourishOS CRM Module

Version: 1.0
Module: Business Module - CRM (Customer Relationship Management)

---

# 1. Overview

The CRM Module manages all customer-related data, interactions, feedback, and engagement across Nourish outlets.

It centralizes customer profiles, purchase behavior (future POS integration), feedback, loyalty programs, and marketing segmentation into a single system.

The goal is to build a data-driven customer experience ecosystem.

---

# 2. Objectives

- Centralize customer data across outlets
- Track customer interactions and feedback
- Enable customer segmentation
- Support loyalty programs (future)
- Improve customer experience
- Enable data-driven marketing decisions
- Integrate with Communications module
- Support AI-driven personalization (future)

---

# 3. Scope

```text
CRM Module
│
├── Customer Profiles
├── Customer Interactions
├── Feedback & Reviews
├── Loyalty Program (Future)
├── Customer Segmentation
├── Campaign Management (Future)
├── Customer Analytics
└── Communication History
```

---

# 4. User Roles

- Frontline Staff (Limited View)
- Outlet Manager
- Marketing Team
- Customer Service Staff
- General Manager
- Director
- Super Admin

---

# 5. Customer Profile

## Core Entity: Customer

Each customer has a unified profile.

## Fields

- Customer ID
- Full Name
- Phone Number
- Email (optional)
- Gender (optional)
- Date of Birth (optional)
- Preferred Outlet
- Customer Type (Walk-in, Regular, VIP, Corporate)
- Registration Date
- Last Visit Date
- Status (Active / Inactive)

---

# 6. Customer Interaction Tracking

Tracks all touchpoints:

- Visits
- Orders (future POS integration)
- Reservations (future)
- Feedback submissions
- Complaint history
- Staff interactions

## Interaction Types

```text
Visit

Feedback

Complaint

Inquiry

Reservation

Campaign Response
```

---

# 7. Feedback & Reviews

## Purpose

Capture customer satisfaction and operational feedback.

## Fields

- Feedback ID
- Customer ID (optional if anonymous)
- Outlet
- Rating (1–5)
- Comment
- Category (Food, Service, Cleanliness, Speed)
- Submitted At
- Source (QR, Staff, App, Web)

---

# 8. Customer Segmentation

Customers are grouped based on behavior and attributes.

## Segments

```text
New Customers

Regular Customers

VIP Customers

At-Risk Customers

Inactive Customers

Corporate Clients

High-Value Customers
```

## Segmentation Rules

- Visit frequency
- Spending patterns (future POS)
- Feedback score
- Engagement level
- Recency of visit

---

# 9. Loyalty Program (Future)

Planned features:

- Points system
- Tier system (Silver, Gold, Platinum)
- Rewards redemption
- Birthday rewards
- Special promotions

---

# 10. Communication Integration

CRM integrates with **Communications Module**.

Use cases:

- Send promotions
- Send thank-you messages
- Request feedback
- Notify loyalty rewards
- Campaign targeting

---

# 11. Customer Journey Tracking

Tracks lifecycle stages:

```text
Prospect

↓

First Visit

↓

Regular Customer

↓

VIP Customer

↓

Inactive

↓

Reactivated
```

---

# 12. Customer Notes

Internal notes by staff:

- Preferences
- Allergies
- Behavior notes
- Complaints history
- Special requests

---

# 13. Customer Analytics

## Key Metrics

- Customer retention rate
- Visit frequency
- Average engagement
- Feedback score average
- Outlet popularity per customer
- Customer lifetime value (future)

---

# 14. CRM Dashboard

Widgets:

- Total Customers
- New Customers This Month
- Active Customers
- VIP Customers
- Average Rating
- Top Feedback Categories
- At-Risk Customers

---

# 15. Feedback Management Workflow

```text
Customer Feedback Submitted

↓

Classification

↓

Assignment (Outlet Manager)

↓

Investigation

↓

Resolution

↓

Follow-up

↓

Closure
```

---

# 16. Task Engine Integration

Auto-generated tasks:

- Respond to complaint
- Follow up negative feedback
- VIP customer handling
- Customer recovery actions
- Survey follow-ups

---

# 17. Notification Integration

Triggers:

- Feedback received
- Complaint escalated
- VIP customer visit
- Campaign message sent
- Customer inactivity alert

---

# 18. File Storage Integration

Used for:

- Complaint images
- Feedback attachments
- Customer ID verification (future)
- Campaign media assets

---

# 19. Audit Logging

Tracks:

- Customer creation
- Profile updates
- Feedback submission
- Segmentation changes
- Complaint resolution actions

Ensures accountability for all customer-related actions.

---

# 20. Search Integration

Searchable fields:

- Customer name
- Phone number
- Email
- Segment
- Outlet
- Feedback content
- Interaction history

---

# 21. Firestore Collections

```text
customers

customerProfiles

customerInteractions

customerFeedback

customerSegments

customerNotes

crmCampaigns (Future)

loyaltyAccounts (Future)
```

---

# 22. Cloud Functions

```text
createCustomer()

updateCustomerProfile()

logInteraction()

submitFeedback()

segmentCustomers()

assignCustomerSegment()

resolveFeedback()

calculateCustomerMetrics()
```

---

# 23. RBAC

| Role             | View Customers | Edit Profile | View Feedback | Manage Segments | Full Control |
| ---------------- | :------------: | :----------: | :-----------: | :-------------: | :----------: |
| Staff            |    Limited     |      ❌      |    Limited    |       ❌        |      ❌      |
| Outlet Manager   |      Full      |   Limited    |     Full      |       ❌        |      ❌      |
| Marketing Team   |      Full      |      ❌      |     Full      |      Full       |      ❌      |
| Customer Service |      Full      |   Limited    |     Full      |     Limited     |      ❌      |
| GM               |      Full      |     Full     |     Full      |      Full       |   Limited    |
| Director         |      Full      |     Full     |     Full      |      Full       |     Full     |
| Super Admin      |      Full      |     Full     |     Full      |      Full       |     Full     |

---

# 24. Security

- Firebase Authentication required
- RBAC enforced on all customer data
- Sensitive data masking (phone/email where needed)
- Audit logging for all updates
- Access restrictions by outlet and department

---

# 25. Performance Targets

- Customer lookup ≤ 1 second
- Feedback submission ≤ 500 ms
- Segmentation refresh async
- Dashboard updates near real-time
- Analytics queries ≤ 3 seconds

---

# 26. Future Enhancements

## AI CRM

- Customer behavior prediction
- Churn risk detection
- Personalized recommendations
- Smart segmentation

## Marketing Automation

- Automated campaigns
- SMS / WhatsApp integration
- Email marketing flows
- Push notification targeting

## Loyalty System

- Points accumulation
- Tier progression
- Reward redemption system
- Referral tracking

---

# 27. Acceptance Criteria

The CRM Module is complete when:

- Customer profiles are centralized and searchable.
- Feedback is captured and managed through workflows.
- Customer segmentation works dynamically.
- CRM integrates with Communications, Task Engine, and Notifications.
- Audit logs track all customer data changes.
- RBAC restricts access appropriately.
- Dashboard shows actionable customer insights.
- The system supports future loyalty and AI enhancements.
