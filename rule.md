# rule.md — Legal Requirements and Regulations for AI Coding Agents

> **Product**: Naive MES / Naive Ops (Integrated Production Line Management and ERP System)
> **Organization**: Naive Innova Co., Ltd.
> **Target Audience**: AI Coding Agents (Codex, Antigravity, Claude) and Software Development Teams
> **Environment Status**: **Development Stage** (Local Workspace)
> **Architectural Reference Documents**: [`system.md`](file:///c:/Users/asus/Desktop/naive/MES/system.md), [`AGENTS.md`](file:///c:/Users/asus/Desktop/naive/MES/AGENTS.md)

---

## Executive Overview
This document compiles the digital legal rules and regulations that all AI Coding Agents must strictly adhere to without exception. When reading, writing, verifying, or refactoring the code in any Naive MES module, the entire rule structure is written in the form of **"Direct Commands"**.

---

## 1. Personal Data Protection Act B.E. 2562 (PDPA)

### 1.1 Summary of Key Provisions of the Law
The Personal Data Protection Act (PDPA) governs the collection, use, disclosure, and transfer of personal data of identifiable individuals. It requires data controllers and processors to have a legitimate legal basis or obtain explicit consent, to implement technical and administrative security measures, to restrict access as necessary, and to uphold the rights of data subjects. (Rights to access, modify, delete, destroy, and transfer data)

### 1.2 Direct Command Operating Rules for AI Agents

- **Rule 1.1 (CRM Personal Data Encryption at Point of Storage)**: If the system records or stores customer/clinic contact information (`name`, `phone`, `contactPerson`, `province` in `SalesLeadSchema`), the system must always encrypt the phone number and identifiable contact information using the AES-256-GCM algorithm before saving it to the database.
- **Rule 1.2 (Enforcement of Row-Level Access Isolation)**: If the backend system searches for or retrieves customer leads, sales negotiation data (`s1` to `s11`), or production order history. - **Rule 1.3 (Masking Phone Numbers on the Display):** If the front-end system displays customer lists in a table or Kanban board, the phone numbers must be masked (e.g., displayed as 081-xxx-5678) for general users, unless the user has the 'Admin' role or is the deal owner.
- **Rule 1.4 (Security Control of Proof Images and Payment Slips):** If the system stores screenshots of customer confirmation chats ('chatScreenshotProof' in step 6) or deposit payment slips, the files must be stored in a verified storage location (not a public URL accessible to anyone) and a middleware must verify the session before allowing downloads.
- **Rule 1.5 (Concealing Third-Party Personal Information in Proof Files):** If the system accepts uploads of chat screenshots or delivery photos containing third-party bank account numbers. - **Rule 1.6 (Google OAuth Data Storage Reduction)**: If the system stores employee profile data via Google OAuth (`googleId`, `email`, `name`, `avatarUrl`), it must only store fields necessary for identity verification and authorization (`role`) and must never record Google Refresh Tokens or passwords in logs or plaintext database fields.
- **Rule 1.7 (Data Deletion Process under GMP Standard Integration Rights)**: If the system receives a request for data deletion (Right to Erasure) from a customer or a resigning employee, the system must delete or anonymize the personally identifiable data. (Anonymization) In the CRM section, however, it is necessary to maintain anonymized production lot history and QA inspection data to comply with GMP and FDA requirements.
- **Rule 1.8 (Temporary Report File Lifecycle and Deletion)**: If the system processes and exports Excel or CSV files (`fast-csv`, `exceljs`) containing customer or employee lists. The system must send the file stream to the user and immediately delete temporary files from the server disk after the data transmission is complete.
- **Rule 1.9 (Prohibition of Unencrypted Personal Data Backup Storage)**: If the AI ​​Agent creates a backup script or seed data, the system must never dump the actual customer data into a public cloud bucket, an unprotected temporary folder, or commit to a Git repository.

---

## 2. Computer Crime Act B.E. 2550 (2007) and Amendments (No. 2) B.E. 2560 (2017), Section 26

### 2.1 Summary of the Law's Key Points
Section 26 of the Computer Crime Act requires service providers and system administrators within an organization to retain computer traffic data and user access logs for at least 90 days from the date the data enters the system (and extendable to 2 years by specific order of the authorized officer). The retained log data must be accurate, complete, and not altered or modified. And it must be synchronized with a reliable standard time source (NTP).

### 2.2 Direct Command Operating Rules for AI Agents

- **Rule 2.1 (Minimum 90-Day Log Retention Policy)**: If the system creates...
