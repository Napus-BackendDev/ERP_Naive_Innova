# Naive Ops ERP — UI/UX Design System Specification (design.md)

This document specifies the UI/UX design requirements of the **Naive Ops ERP Suite** to ensure a consistent look and feel across all devices and modules.

---

## 1. Color Palette & Theme

The system uses a premium dark theme (**Premium Dark Theme**) to prevent eye strain during long working hours in factory and office environments:

| Component | Color Code (HEX) | Description |
| :--- | :--- | :--- |
| **Deep Space Dark (Main BG)** | `#090D16` | Main background color of the entire web application |
| **Dark Slate (Cards & Panels)** | `#111827/70` | Backdrop color for Modals, Cards, and Sidebars (using semi-transparent Glassmorphism) |
| **Brand Emerald (Brand Color)** | `#10B981` | Accent color for primary actions, active navigation states, and positive health indicators |
| **Pure White** | `#FFFFFF` | Primary text color, table headers, and emphasized textual data |
| **Cool Gray** | `#9CA3AF` | Secondary text color, form field labels, and generic utility icons |
| **Pastel Success** | `#059669` | Badge status for "Normal", "Fully Deposited", "QC Passed" |
| **Pastel Warning** | `#D97706` | Badge status for "Low Stock", "Near Expiry (≤90 days)" |
| **Pastel Danger** | `#DC2626` | Badge status for "Out of Stock", "Shortage", "Expired" |

---

## 2. Typography

* **Primary Font (Sans-Serif):** Uses **"Inter"** or **"Outfit"** (loaded from Google Fonts) for clean, modern, and readable text in dashboards.
* **Monospace Font (Data):** Uses **"JetBrains Mono"** or **"SF Mono"** to display stock quantities (g/pcs), monetary amounts (THB), expiration dates (MFG/EXP), and Product SKUs to ensure perfect vertical column alignment.

---

## 3. Responsiveness & Layout

The system is fully responsive, adapting seamlessly to various screen sizes:

### A. Desktop View (1025px and above)
* **Structure:** Sticky left sidebar with a fixed width of `256px` + fluid right content pane.
* **Display:** The CRM pipeline displays a full 5-column Kanban board layout without text wrapping.

### B. Tablet View (768px - 1024px)
* **Structure:** Left sidebar collapses to a rail (`80px`) displaying only utility icons to save screen space.
* **Display:** Finished Goods stock and BOM tables gain horizontal scrolling to prevent content overlapping.

### C. Mobile View (320px - 767px)
* **Structure:** Left sidebar is completely hidden, accessible via a **Hamburger Menu** or a persistent Bottom Navigation Bar.
* **Display:** Dense data tables (such as Packaging Stock) transform into vertical card items (Card Cards) for a smoother scrolling experience.

---

## 4. Page-by-Page Breakdown

### Page 1: Google OAuth Login Screen
* **Visuals:** Immersive deep blue radial gradient center screen with a translucent glass card (`w-full max-w-md`) floating in the middle.
* **Content & Actions:**
  - Bright neon-green "N" logo representing Naive Ops.
  - "Log in with Google Account" primary button in a clean white container with black text to draw attention.
  - Small security notice about Row Isolation policy at the bottom.

### Page 2: Executive Cockpit Dashboard
* **Layout:** Top row features 4 summary KPI cards (Sales Revenue, Low Chemical Ingredients, Out of Box/Cap Packaging, and Near Expiry Lots).
* **Action Center:**
  - The left section highlights critical alerts (e.g. chemicals below 1,000 grams) with one-click actions to place reorders.
  - The right section displays a chronological log of recent system activities.

### Page 3: Sales CRM Kanban
* **Visuals:**
  - Column headers display the number of active cases (e.g. Closed Won: 54 cases).
  - Customer cards show clinic name, province, phone number, and deposit payment status.
  - Clicking a card triggers a **Slide-over Drawer** from the right side of the screen to edit deposit percentages, log discussion notes, and set lead sources.

### Page 4: BOM & Calculator
* **Visuals:**
  - Left Column: List of all 10 product formulas with input fields for target production weight (kg).
  - Right Column: Chemical requirement summary table showing required amount, available stock, and dynamic sufficient (green) / insufficient (red) badges.
  - Bottom section features a prominent purple button: "🖨️ Print Production Order (F-PR)".

### Page 5: Packaging Stock
* **Visuals:**
  - Table summarizing caps, bottles, boxes, and foil bags grouped by client name and brand.
  - Available stock counts are color-coded (yellow warnings highlight items below 500 units).
  - Fast receipt (restock) and issue (dispatch) buttons in the action column of each row.

### Page 6: Finished Goods Expiry (FEFO)
* **Visuals:**
  - Inventory table summarizing 10 main SKUs linked to the production schedule.
  - Expandable rows (accordion) to reveal individual lot details (MFG, EXP, and remaining stock).
  - Sorted automatically to place near-expiry lots at the top, facilitating FEFO dispatch procedures.

### Page 7: User Management Page
* **Visuals:**
  - Staff directory table showing name, avatar profile image, email address, role (with associated utility permission icons), and last active timestamp.
  - "Add New User" primary button that triggers a pop-up Modal dialog in the center of the screen to input name, email, and assign department roles.

### Page 8: Support & Helpdesk Form Page
* **Visuals:**
  - Sleek Alabaster Light form container to report technical bugs or system failures.
  - Form fields include: issue subject, system category, severity level selection (Low, Medium, High, Critical), detailed text area description, and contact email.
  - Displays a clean green success animation card upon submission.

---

## 5. Micro-interactions

1. **Hover States:** All buttons and interactive cards feature a brightness highlight and a subtle 1.5% scale increase (`scale-101`) to feel tactile and responsive.
2. **Kanban Dragging:** Dragging customer cards triggers a glowing emerald green border and a dotted ghost placeholder on target columns.
3. **Calculating Transition:** Updating BOM formula inputs recalculates aggregate requirements with smooth visual transitions and no flickering.
