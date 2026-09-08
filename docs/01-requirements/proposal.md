# Naive Innova Enterprise ERP Proposal

| | |
|---|---|
| **Project Title** | ERP Naive Innova |
| **Prepared By** | Napus Samuanpho, Watana Suwanapho, Korakit Lhakdee, Wasan Nachai, Hataichanok Yamjan |
| **Target Stakeholders** | Executive Leadership, Operations Director, Information Security Committee |
| **Date of Submission** | Sep 8, 2026 |

---

## 1. Executive Summary

Naive Innova operates a robust, multi-department Enterprise Resource Planning (ERP) platform managing Sales, R&D, Production, Packaging, and Quality Control (QC). While internal operations are highly optimized, external client visibility remains restricted due to strict API authentication boundaries. Consequently, clients currently rely on manual inquiries through Sales account managers to obtain real-time order status, introducing communication overhead and operational latency.

To address this operational gap, ERP Naive Innova introduces a token-gated, zero-trust external tracking architecture. Upon customer onboarding, the system dynamically provisions a unique, cryptographically secure public endpoint at `/track/[token]`. Clients gain instant, read-only access to live production updates, historical execution records, verified QC media, and logistics telemetry without requiring account creation or authentication credentials.

Core security and governance mechanisms ensuring system integrity include:

- **Token-Gated Architectural Isolation:** 256-bit cryptographically random tokens persisted exclusively as SHA-256 digest hashes, facilitating instantaneous revocation or rotation.
- **Immutable Data Read Model:** Implementation of `PublicOrderSnapshot` records to guarantee historic execution data is decoupled and preserved against modern workflow updates.
- **Governed Media Distribution:** A explicit allowlist schema (`PublicMediaApproval`) serving verified operational imagery through protected, token-validated endpoints rather than static asset URLs.

Built upon the existing Next.js, Express, and MongoDB technical ecosystem, Phase 6 provides seamless stage normalization across all order workflows while strictly safeguarding proprietary IP, pricing, internal communications, and employee metadata.

## 2. Problem Statement & Business Context

While the internal ERP successfully synchronizes the multi-departmental lifecycle across Sales → R&D → Production → Packaging → QC, the absence of a secure client-facing interface introduces critical operational friction:

- **Operational Overhead:** Sales account managers allocate significant resources to handling repetitive, manual status inquiries regarding batch processing, formulation development, and dispatch timelines.
- **Information Exposure Vulnerabilities:** Exposing raw internal API endpoints risks inadvertent leakage of sensitive IP, including Bill of Materials (BOM), proprietary formulas, commercial margins, internal audit checklists, and staff records.
- **Historical Data Mutation Risks:** Lacking an isolated read snapshot model, initiating new customer jobs introduces the risk of overwriting or polluting historical order state records.
- **Uncontrolled Visual Asset Distribution:** Operational teams generate extensive media across stages (R&D, packaging, lot coding, sealing, final QC) without a programmatic framework to filter client-appropriate visual assets from internal compliance records.

Phase 6 resolves these challenges by deploying an architecturally isolated, token-authenticated public progress gateway that provides total client transparency while ensuring institutional data privacy and security.

## 3. Strategic Goals & Project Objectives

### 3.1 Primary Objective

Architect and deploy a high-availability, responsive public portal enabling clients to track live manufacturing and fulfillment progress via `/track/[token]` without requiring account provisioning, while maintaining air-gapped protection over internal ERP core systems.

### 3.2 Key Functional Objectives

- **Automated Credential Generation (FR-SAL-001):** Automatically initialize a dedicated `CustomerPortalAccess` record and secure tracking token upon customer registration in Sales.
- **Administrative Link Governance (FR-SAL-002, FR-SAL-003):** Provide Sales personnel with lifecycle controls to copy, rotate, or immediately revoke access links without compromising order histories.
- **Responsive Read-Only Portal (FR-PRT-001, FR-PRT-002):** Deliver an optimal presentation layer across mobile (360px), tablet (768px), and desktop (1280px) viewports with strict zero-write execution enforcement.
- **Snapshot-Driven Order History (FR-ORD-001..003):** Decouple active operations from completed historic batches utilizing immutable snapshot projections.
- **Vetted Asset Streaming (FR-MED-001, FR-MED-002):** Restrict media rendering strictly to approved items filtered through authorization endpoints.
- **Logistics Telemetry Presentation (FR-SHP-001, FR-SHP-002):** Display carrier assignments, dispatch timestamps, and tracking identifiers in a standardized dashboard.
- **Workflow Stage Normalization:** Standardize pipeline progress states across diverse product order classifications (develop, formula adjustment, factory standard, sample).
- **Zero-Trust Hardening:** Enforce SHA-256 token hashing, security headers, generic error responses, rate-limiting, and comprehensive PII masking.

## 4. Scope of Work

The engineering scope encompasses two major functional domains: the Customer Portal Interface (Public Domain) and the Administrative Link Governance System (Internal Domain).

### 4.1 Public Customer Portal Domain

The client portal interface delivers a read-only progress tracking display tailored to the following functional specification:

| Capability Module | Technical & Functional Specification |
|---|---|
| Active Work Telemetry | Displays active production jobs including brand name, product line, batch quantities, order identifiers, last updated timestamp, and projected completion date (defaults to "Unspecified" when unassigned). |
| Historical Order Records | Queries immutable `PublicOrderSnapshot` entries to render past completed orders without risk of data pollution. |
| Approved Media Gallery | Streams stage-specific visual media marked explicitly with `approvedForPortal = true` across R&D, bulk manufacturing, labeling, lot coding, sealing, and final QC verification. |
| Fulfillment Tracking | Displays assigned logistics carrier, tracking serial numbers, and dispatch timestamps. |
| Read-Only Execution | Strict enforcement of zero-write architecture—no administrative inputs, account creation, messaging controls, or state mutations. |
| Multi-Viewport Parity | Fully responsive rendering at 360px, 768px, and 1280px breakpoints complying with visual accessibility standards. |

### 4.2 Enterprise Stakeholder Role Matrix

| Organizational Role | System Interaction & Access Authorization |
|---|---|
| Sales Management | Provisions customer profiles; generates, rotates, copies, and revokes public tracking credentials; updates projected completion milestones. |
| External Client | Authenticated read-only access via tokenized URL; views live progress, historic snapshots, approved visual verification, and logistics dispatch metadata. |
| R&D Operations | Logs formula development progress, records technical specifications, and approves R&D trial media for public release. Internal access only. |
| Inventory & Logistics | Maintains product, batch, and lot data feeding client summaries; populates tracking identifiers and shipping dates. Internal access only. |
| Production & Packaging | Updates manufacturing execution stages, logs packaging milestones, and flags production imagery for portal publication. Internal access only. |
| Quality Assurance (QC) | Validates final QC compliance, approves release imagery, and executes batch closure triggers driving snapshot generation. Internal access only. |

### 4.3 Administrative Core Domain & Governance

**Internal API & Infrastructure Scope:**

- **Administrative Endpoints:** Implementation of secure internal routes for customer access provisioning (`POST /api/sales`), status auditing (`GET /api/sales/:id/portal-access`), token rotation (`POST /api/sales/:id/portal-access/rotate`), and instant credential revocation (`POST /api/sales/:id/portal-access/revoke`).
- **Public Data Gateway:** Deployment of isolated public endpoints (`GET /api/public/customer-portal/:token` and `GET /api/public/customer-portal/:token/media/:mediaId`) enforcing schema projection and allowlist streaming.
- **Data Schema & Storage:** Database collections including `CustomerPortalAccess`, `PublicOrderSnapshot`, `PublicPortalResponse`, and `PublicMediaApproval`, alongside automated standardized order indexing (`NVI-P6-YYYYMMDD-XXXX`).
- **Security Policy Infrastructure:** Implementation of SHA-256 token hashing, strict `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: nonindex, nonfollow`, rate limiting, and log redaction.

### 4.4 Scope Exclusions (Out of Scope)

- Development of standalone mobile applications or secondary web portals outside the primary ERP infrastructure.
- Customer account creation, password management, or Multi-Factor Authentication (MFA) systems.
- Interactive customer input capabilities (editing order data, batch approvals, rejections, or direct messaging).
- Automated SMS, Email, or LINE messaging integrations for direct token dispatch.
- Third-party courier API integrations or real-time GPS tracking connections.
- Public exposure of proprietary IP including BOMs, technical chemical formulations, commercial pricing, internal notes, staff communications, or database object identifiers.

## 5. Methodology & Technical Execution Plan

### 5.1 Engineering Methodology

The engineering team utilizes an Agile-Scrum framework integrated with rigorous phase-gated quality control. Deliverables are decomposed into actionable epics and user stories managed within the enterprise product backlog (`docs/01-requirements/backlog.md`) with full traceability to technical TOR specifications.

### 5.2 Phased Lifecycle Execution

- **Phase 1: Architecture & Baseline Analysis:** Complete requirements analysis against internal specification NVI-ERP-TOR-P6, establish user journey matrices, and finalize requirement-to-test traceability documentation.
- **Phase 2: System Architecture & Schema Design:** Define data model specifications for portal access, snapshot entities, and media approval allowlists; formulate stage mapping protocols; design responsive UI layouts and API interfaces.
- **Phase 3: Core Engineering & System Integration:** Construct Express/MongoDB backend APIs, Next.js frontend tracking interfaces, cryptographic token management pipelines, and snapshot generation events.
- **Phase 4: Security Hardening & Quality Assurance:** Execute rigorous test suites covering token lifecycle, tenant isolation, media approval compliance, security header verification, PII leak scans, and responsive cross-browser testing.
- **Phase 5: Production Deployment & Handover:** Deploy verified artifacts into production environments, perform database migrations, run privacy compliance audits, and distribute user documentation across functional departments.

### 5.3 Architectural & Technical Advantages

- **Frictionless Client Onboarding:** Zero credential management or registration overhead for end users.
- **Cryptographic Access Control:** One-way hash storage protects token integrity and enables real-time access revocation.
- **Strict Data Isolation:** Allowlist-driven response projections isolate internal data from external streams.
- **Data Immutability Guarantee:** Snapshot architecture ensures historic order verification remains untampered.
- **Infrastructure Synergy:** Direct reuse of existing enterprise stack components (Next.js, Express, MongoDB, Tailwind CSS) minimizes overhead and accelerates time-to-market.

## 6. Risk Management & Mitigation Strategy

| Identified Risk | Impact | Likelihood | Mitigation Strategy & Governance Control |
|---|---|---|---|
| Token Interception / Unauthorized Link Access | High | Medium | Persist tokens as SHA-256 hashes only; enforce instant rotation/revocation capabilities; set no-referrer and no-store headers; apply IP rate-limiting; exclude tokens from system log streams. |
| Inadvertent Exposure of Proprietary Visuals | High | Medium | Enforce strict `PublicMediaApproval` allowlisting; serve imagery via token-authenticated media proxy endpoints; prohibit direct cloud storage URL exposures. |
| Order History Data Overwrite / Mutation | High | Low | Decouple active state from completed orders via immutable `PublicOrderSnapshot` entities generated exclusively upon verified QC batch completion. |
| Cross-Tenant Data Exposure / ID Enumeration | High | Low | Bind all public queries to token-validated tenant scopes; enforce generic HTTP 401/404 responses to eliminate endpoint enumeration vectors. |
| Project Scope Creep | Medium | Medium | Enforce formal Change Control Management (TOR §13.1); prioritize features using MoSCoW methodology against established baseline matrices. |

## 7. Project Timeline & Milestone Roadmap

> **Note:** Implementation schedules reflect phased milestone completion. Target dates are established upon formal proposal approval.

| Milestone | Phase Focus | Key Deliverables | Status |
|---|---|---|---|
| M1 | Requirements & Baseline | Traceability matrix, UAT acceptance criteria validation. | Planned |
| M2 | System Architecture | Data model specs, API contracts, UI component wireframes. | Planned |
| M3 | Backend Engineering | Portal access APIs, snapshot generator, public data routes. | Planned |
| M4 | Frontend Development | Responsive Tracking Portal UI, Sales management interface. | Planned |
| M5 | Security Hardening | Rate-limiting, security header implementation, PII audit. | Planned |
| M6 | UAT & System Sign-Off | UAT execution evidence, operational manuals, release deployment. | Planned |

## 8. Data Ethics, Privacy & Regulatory Compliance

- **Data Privacy Compliance (PDPA):** Public endpoints exclude personal identifiable information (PII) such as personal contact details, email addresses, phone numbers, and physical addresses. Access tokens are hashed and strictly excluded from system logging.
- **Manufacturing Verification Integrity (GMP Alignment):** Visual proof assets are published only after formal approval, logged with cryptographic timestamps and SHA-256 verification hashes to guarantee auditability.
- **Right to Erasure & Anonymization:** Customer record deletion requests are satisfied via complete PII anonymization while preserving non-identifiable historic manufacturing metrics for enterprise reporting.
- **Digital Accessibility Standards:** The portal interface strictly complies with visual accessibility standards, ensuring multi-language support, high-contrast readability, and non-color-dependent status indicators.

## 9. Conclusion & Next Steps

ERP Naive Innova Phase 6 optimizes client communications by replacing manual inquiry channels with an automated, secure, public progress tracking ecosystem. By unifying zero-trust access control, immutable snapshot data modeling, approved media allowlisting, and responsive frontend architecture, Naive Innova delivers superior service transparency to clients while upholding rigorous enterprise security and IP protection standards.

**Immediate Execution Actions:**

1. Formalize and lock the technical traceability baseline against UAT testing matrices.
2. Execute database schema migrations for portal access, snapshot entities, and media approval collections.
3. Commence sprint development for internal administrative link governance APIs and Sales interface components.
4. Construct public-facing tracking views (`/track/[token]`) and media streaming handlers.
5. Perform security audits, penetration testing, and responsive cross-browser verification prior to production sign-off.

## 10. Architectural References

- Naive Innova — TOR ERP Naive Innova Phase 6 (NVI-ERP-TOR-P6), Technical Statement of Work, Rev 1.0.
- Naive Innova — Enterprise System Architecture Specification (`system.md`).
- Naive Innova — UI/UX Enterprise Design System Guidelines (`design.md`).
- Naive Innova — Data Governance, PDPA Compliance & Regulatory Rules (`rule.md`).
- Naive Innova — Enterprise Product Backlog (`docs/01-requirements/backlog.md`).
