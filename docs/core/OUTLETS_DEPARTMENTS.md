# NOURISH GROUP INDONESIA - SYSTEM LOCATION & DEPARTMENT REGISTER

This document registers the official operational locations (outlets) and business departments/sections for PT Nourish Group Indonesia. These identifiers serve as the configuration keys for data isolation, employee scoping, and localized reporting in NourishOS.

---

## 📍 1. Outlet Registries

Every operational node is assigned a unique `outletId` and categorized by store type to handle menu configurations, inventory routing, and localized access controls.

### 🍽️ Café & Restaurant Concept

- **Nourish Ungasan**
  - _System Key:_ `nourish_ungasan`
  - _Type:_ Restaurant / Café
- **Nourish Uluwatu**
  - _System Key:_ `nourish_uluwatu`
  - _Type:_ Restaurant / Café
- **Nourish Berawa**
  - _System Key:_ `nourish_berawa`
  - _Type:_ Restaurant / Café

### 🥐 Bakery Concept

- **The Bakery Uluwatu**
  - _System Key:_ `the_bakery_uluwatu`
  - _Type:_ Bakery Retail
- **The Bakery Kitchen**
  - _System Key:_ `the_bakery_kitchen`
  - _Type:_ Bakery Production / Kitchen

### 🛒 Wholefood & Retail Concept

- **Wholefood Ungasan**
  - _System Key:_ `wholefood_ungasan`
  - _Type:_ Retail / Grocery
- **Wholefood Uluwatu**
  - _System Key:_ `wholefood_uluwatu`
  - _Type:_ Retail / Grocery
- **Wholefood Berawa**
  - _System Key:_ `wholefood_berawa`
  - _Type:_ Retail / Grocery

### 🏢 Head Office & Production Hub

- **BOH Nourish Group**
  - _System Key:_ `boh_nourish_group`
  - _Type:_ Headquarters / Back of House Administration

---

## 🗂️ 2. Department & Section Registries

Departments control user routing within the app's business modules (e.g., Purchasing, Finance, HR) and define approval scopes.

| ID     | Department Name      | System Key           | Primary Operational Scope        |
| :----- | :------------------- | :------------------- | :------------------------------- |
| **01** | Admin & General      | `admin_general`      | HQ / Outlet Management           |
| **02** | Cashier              | `cashier`            | Outlet POS / Front of House      |
| **03** | F&B Service          | `fb_service`         | Outlet Front of House            |
| **04** | Bar                  | `bar`                | Outlet Front of House / Beverage |
| **05** | Kitchen              | `kitchen`            | Outlet Back of House / Culinary  |
| **06** | Central Kitchen      | `central_kitchen`    | Production Hub                   |
| **07** | Sales & Marketing    | `sales_marketing`    | Headquarters (HQ)                |
| **08** | Security             | `security`           | Shared / Outlet Safety           |
| **09** | Engineering/POMEC    | `engineering_pomec`  | Shared / Facility Maintenance    |
| **10** | Human Resources      | `human_resources`    | Headquarters (HQ)                |
| **11** | Finance & Accounting | `finance_accounting` | Headquarters (HQ)                |
| **12** | Driver               | `driver`             | Logistics / Supply Chain         |
| **13** | Housekeeping         | `housekeeping`       | Shared / Public Area Maintenance |
| **14** | Wholefood/Retail     | `wholefood_retail`   | Outlet Retail Management         |
