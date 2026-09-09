# Product Backlog Prioritization Specification — ERP Naive Innova System

## Project Team & Key Personnel

- **Napus Samuanpho** — Product Owner
- **Watana Suwanapho** — Lead Developer
- **Korakit Lhakdee** — Software Engineer
- **Wasan Nachai** — Quality Assurance Engineer
- **Hataichanok Yamjan** — UI/UX Designer

## User Module — Stakeholder Profiles & Responsibilities

- **Sales Operations:** Provisioning customer profiles and managing public access links, including link generation, rotation, copying, and revocation.
- **External Customers:** Unauthenticated read-only access via tokenized endpoint (`/track/[token]`) to review real-time job progress, historical orders, authorized media, and dispatch status.
- **Research & Development (R&D):** Logging technical development milestones and explicitly authorizing R&D media for customer portal visibility.
- **Inventory & Stock Management:** Maintaining component, ingredient, and lot-level data feeds integrated with order summaries and shipment records.
- **Manufacturing & Production:** Updating operational execution status, packaging metrics, product labelling, lot identification codes, and production media.
- **Finance & Accounting:** Reconciling sales orders, shipment tracking, and batch/lot audit records for operational invoicing and financial oversight.

## Product Backlog Items (PBI)

### 1. Public Link Generation and Management (Sales)

- Automated instantiation of a unique Public Access Link upon customer record creation via the `POST /api/sales` REST endpoint.
- Provision of administrative UI controls within Sales Operations, including dynamic link copying and real-time status indicators (Active/Revoked).
- Security management functions allowing key rotation and link revocation without compromising underlying customer profile records or historical transactional data.

### 2. Read-Only Responsive Customer Portal

- Delivery of a non-interactive, read-only interface at `/track/[token]`, strictly devoid of state-modifying controls (e.g., edit, approve, reject, or message interfaces).
- Cross-device responsive design optimization across standard viewports (360px, 768px, and 1280px) to prevent layout distortion, truncation, or element overlapping.

### 3. Current Work and Order History (Snapshot Read Model)

- Architectural separation of active operational tasks and archived orders to maintain clear domain distinction between in-flight and fulfilled work.
- Display of standardized metadata attributes including Client/Brand Title, Product Specification, Order Quantity, System Identifier, Timestamp of Last Modification, and Target Completion Date (defaulting to "ยังไม่ระบุ" where unassigned).
- Immutable snapshot modeling (`PublicOrderSnapshot`) guaranteeing that new order creation operations do not mutate historical fulfillment data.
- Generation of unique order tracking identifiers adhering to the `NVI-P6-YYYYMMDD-XXXX` schema with collision validation prior to persistence.

### 4. Approved Media Display

- Restricted media exposure filtering exclusively for items explicitly flagged as public (`approvedForPortal = true`).
- Secure media delivery architecture routing all binary assets through token-validated endpoints utilizing strict URL allowlisting, prohibiting direct static asset exposure.

### 5. Shipping Information Display

- Presentation of essential dispatch details including Logistics Carrier, Tracking Reference Identifier, and Fulfillment Date.
- Explicit exclusion of external carrier hyperlinks, third-party redirects, or real-time logistics API integrations.

### 6. Workflow Stage Mapping per Order Type

- **develop Lifecycle:** R&D Stage → Fulfillment; systematically encapsulating manufacturing timelines, Bill of Materials (BOM), and proprietary formulation data.
- **lot / ปรับสูตร Lifecycle:** R&D → Production → Packaging → Quality Control (QC) → Fulfillment; suppressing internal verification checklists and staff identifiers.
- **lot / สูตรโรงงาน Lifecycle:** R&D → Production → Packaging → Quality Control (QC) → Fulfillment; suppressing proprietary formula parameters and cost accounting figures.
- **sample Lifecycle:** Logistics/Shipping → Fulfillment; bypassing production phase tracking displays.

### 7. Security and Privacy Hardening

- Cryptographic token security using 256-bit entropy pseudo-random strings persisted exclusively as SHA-256 digests; strict prohibition against raw token logging, error disclosure, or plain-text database persistence.
- Near-real-time token invalidation and key rotation capabilities ensuring immediate access revocation upon administrative execution.
- Implementation of uniform error responses for invalid, expired, or non-existent tokens to prevent account enumeration vulnerabilities.
- Strict authorization binding tying public API queries to corresponding `CustomerPortalAccess` entities to enforce tenant boundary isolation.
- Protocol-level security enforcement including `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: nonindex, nonfollow`, and rate-limiting policies on public endpoints.
- Strict data loss prevention (DLP) controls prohibit public egress of Sensitive Personally Identifiable Information (PII), pricing structures, financial metrics, formulas, internal logs, personnel data, or database ObjectIDs.

### 8. Non-Functional Quality and Accessibility

- Cross-browser baseline compatibility across modern engines (Chromium/Edge, WebKit/Safari).
- Universal Design & Accessibility compliance featuring high-legibility Thai typography rendering, multi-cue visual indicators (non-color dependent), and standard `alt` attribute tagging.
- Performance optimization utilizing asynchronous lazy loading for binary assets and lightweight initial payload rendering, eliminating inline Base64 data transfers in collection responses.
- Standardized user-facing error routing preventing exception stack trace leakage or system infrastructure disclosure.

### 9. Documentation and Deployment Deliverables

- Technical API Contract Specifications detailing REST schemas, data structures, fault models, and Role-Based Access Control (RBAC) rules.
- Deployment and Infrastructure Manuals including database schema migration scripts, environment variables, security headers configuration, rate-limiting parameters, and media handling proxy settings.
- Standard Operating Procedure (SOP) documentation tailored for Sales Operations, R&D, Production Execution, and Quality Control departments.
- Quality Assurance Test Execution Reports and User Acceptance Testing (UAT) sign-off verification records corresponding to all target acceptance criteria.

## Product Backlog Prioritization Framework (MoSCoW Methodology)

### Must-Have (Priority Tier 1 — Critical Operational Requirements)

1. Public Link Provisioning & Lifecycle Management (Sales Module)
2. Non-Interactive Responsive External Customer Portal Interface
3. Real-Time Work Progress & Immutable Order History Read Models
4. Secure Authorized Media Subsystem
5. Static Logistics & Shipping Status Display
6. Lifecycle Stage Mapping Abstraction per Order Category
7. System Security Architecture & Data Privacy Hardening

### Should-Have (Priority Tier 2 — Essential System Attributes & Quality Metrics)

8. Non-Functional Quality Attributes & Accessibility Standards
9. Technical Documentation & Enterprise Deployment Deliverables

### Could-Have (Priority Tier 3 — Value-Add Functional Enhancements)

- Internal link access telemetry and usage analytics reporting (surfacing `lastAccessedAt` attributes from `CustomerPortalAccess`).
- Advanced portal UX utilities including outstanding order filtering/search interfaces and print-optimized summary layouts.

### Won't-Have (Priority Tier 4 — Out of Scope for Phase 6)

- Customer account authentication subsystems, user identity management, or OTP login mechanisms.
- Interactive customer input mechanisms within the portal (e.g., approval/rejection workflows, edit capabilities, or messaging interfaces).
- Automated link dispatch via Email or LINE Messaging API, as well as dynamic third-party carrier tracking integrations.
- Native mobile software development (iOS/Android applications).

## Strategic Prioritization Rationale

The prioritization strategy defined herein aligns directly with the mandatory requirements governing the Customer Public Progress Portal, as specified in the Phase 6 Terms of Reference (NVI-ERP-TOR-P6). Items classified under Priority Tier 1 (Must-Have) represent baseline functional capabilities critical to operational deployment: secure link generation, read-only responsive portal rendering, snapshot-based order history isolation, filtered media access, stage mapping abstraction, and cryptographic security hardening. Tier 2 (Should-Have) requirements ensure operational robustness, system maintainability, and cross-platform accessibility, which are required for enterprise delivery but secondary to core interface mechanics. Tier 3 (Could-Have) features provide incremental usability improvements suitable for deferred technical iterations. Tier 4 (Won't-Have) items—including authenticated customer accounts, bi-directional interactive capabilities, automated messaging channels, dynamic carrier integrations, and native mobile apps—are strictly excluded in accordance with the TOR scope boundaries to maintain architectural simplicity and eliminate unauthorized exposure of internal ERP telemetry.
