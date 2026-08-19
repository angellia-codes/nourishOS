# NourishOS – Opening & Closing Shift Report Template

## 1. Report Information

**Report Type:** Opening Shift / Closing Shift  
**Outlet:** ______________________________  
**Day:** ______________________________  
**Date:** ____ / ____ / ______  
**Shift:** ______________________________  
**Manager / PIC:** ______________________________  

---

# A. OPENING SHIFT REPORT

## 2. Sales & Promotion

**Food Promo:**  
____________________________________________

**Beverage Promo:**  
____________________________________________

**Special Menu:**  
____________________________________________

---

## 3. Product Availability

### N/A Food
| Product | Reason / Status | Action Required |
|---|---|---|
| | | |
| | | |

### N/A Cake / Gelato
| Product | Reason / Status | Action Required |
|---|---|---|
| | | |
| | | |

### N/A Beverage
| Product | Reason / Status | Action Required |
|---|---|---|
| | | |
| | | |

### Limited Availability
| Product | Remaining Qty | Action Required |
|---|---:|---|
| | | |
| | | |

---

## 4. Customer Feedback

**Complaints:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Customer Feedback:**  
- [ ] None  
Details: _________________________________________________

**Online Reviews:**  
**Rating:** ______ ⭐  
**No. of Reviews:** ______  
**Key Feedback / Mention:** _________________________________

---

## 5. Staffing & Attendance

### Floor
**PIC / IC:** __________________  
**Regular Staff:** ______  
**Daily Worker:** ______

### Bar
**PIC / IC:** __________________  
**Barista / Bartender:** ______  
**Daily Worker:** ______

### Kitchen
**PIC / IC:** __________________  
**Regular Staff:** ______  
**Daily Worker:** ______

### Other Positions
**Steward:** ______  
**Cashier:** ______  
**Other:** __________________

### Attendance
**Absent:**  
- [ ] None  
Details: _________________________________________________

**Sick Leave:**  
- [ ] None  
Employee(s): ______________________________________________

**Permission:**  
- [ ] None  
Employee(s): ______________________________________________

---

## 6. Operational Issues

**Maintenance:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Equipment / Facility Issues:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Other Important Information:**  
___________________________________________________________  
___________________________________________________________

---

## 7. Opening Shift Handover

**Priority for Next Shift:**  
1. _________________________________________________  
2. _________________________________________________  
3. _________________________________________________  

**Prepared by:** __________________  
**Time Submitted:** _______________

# B. CLOSING SHIFT REPORT

## 2. Sales & Promotion

**Food Promo:**  
____________________________________________

**Beverage Promo:**  
____________________________________________

**Special Menu:**  
____________________________________________

---

## 3. Product Availability

### N/A Food
| Product | Reason / Status | Action Required for Next Shift |
|---|---|---|
| | | |
| | | |
| | | |

### N/A Cake / Gelato
| Product | Reason / Status | Action Required for Next Shift |
|---|---|---|
| | | |
| | | |
| | | |

### N/A Beverage
| Product | Reason / Status | Action Required for Next Shift |
|---|---|---|
| | | |
| | | |
| | | |

### Limited Availability
| Product | Remaining Qty | Action Required for Next Shift |
|---|---:|---|
| | | |
| | | |
| | | |

---

## 4. Customer Experience

**Complaints:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Customer Feedback:**  
- [ ] None  
Details: _________________________________________________

**Online Reviews:**  
**Rating:** ______ ⭐  
**No. of Reviews:** ______  
**Key Feedback / Mention:** _________________________________

---

## 5. Staffing & Attendance

### Manager / Supervisor
**Manager IC:** __________________  
**Supervisor IC:** __________________

### Floor
**PIC / IC:** __________________  
**Regular Staff:** ______  
**Daily Worker:** ______  
**Mid Shift:** ______

### Bar
**PIC / IC:** __________________  
**Barista:** __________________  
**Bar Staff:** ______  
**Daily Worker:** ______  
**Mid Shift:** ______

### Kitchen
**PIC / IC:** __________________  
**Kitchen Staff:** ______  
**Daily Worker:** ______  
**Mid Shift:** ______

### Other Positions
**Steward:** ______  
**Cashier:** __________________

### Attendance
**Absent:**  
- [ ] None  
Details: _________________________________________________

**Sick Leave:**  
- [ ] None  
Employee(s): ______________________________________________

**Permission:**  
- [ ] None  
Employee(s): ______________________________________________

---

## 6. Operational & Maintenance Issues

**Maintenance:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Equipment Issue:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Cleaning / Hygiene Issue:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Stock / Inventory Issue:**  
- [ ] None  
- [ ] Yes — Details: ____________________________________________

**Other:**  
___________________________________________________________

---

## 7. Closing Checklist

- [ ] Outlet cleaned and organized
- [ ] Kitchen cleaned and secured
- [ ] Bar cleaned and secured
- [ ] Equipment switched off / secured
- [ ] Chiller / freezer checked
- [ ] Stock / N/A items updated
- [ ] Cashier closing completed
- [ ] Maintenance issues reported
- [ ] Important information handed over to next shift
- [ ] Outlet secured

---

## 8. Handover to Next Shift

**Critical Items for Next Shift:**  
1. _________________________________________________  
2. _________________________________________________  
3. _________________________________________________  

**Follow-Up Required:**  
___________________________________________________________

**Prepared by:** __________________  
**Time Submitted:** _______________  
**PIC Acknowledgement:** __________________

# NourishOS Data Structure Recommendation

The digital NourishOS form should use standardized fields rather than allowing everything as free text.

### Report Header
- Report Type
- Outlet
- Date
- Shift
- PIC / Manager
- Submission Time

### Operations
- Food Promo
- Beverage Promo
- Special Menu
- N/A Food
- N/A Cake / Gelato
- N/A Beverage
- Limited Items
- Complaints
- Customer Feedback
- Review Rating
- Review Count

### Manpower
- Floor PIC
- Floor Regular Staff
- Floor Daily Worker
- Bar PIC
- Bar Staff
- Kitchen PIC
- Kitchen Staff
- Daily Worker per Department
- Steward
- Cashier
- Absence
- Sick Leave
- Permission

### Issues
- Maintenance
- Equipment
- Hygiene
- Stock
- Other Issues
- Required Follow-Up

### Closing / Handover
- Closing Checklist
- Priority for Next Shift
- Handover Notes
- PIC Acknowledgement

**Recommended NourishOS behavior:** Opening reports should automatically populate the expected staffing and outlet information from the employee database, while Closing Reports should highlight unresolved N/A items, maintenance issues, attendance issues, and handover actions for the next shift.
