# Product Requirements Document (PRD): AI Smart File Organizer
**Version:** 2.0  
**Status:** Draft  
**Date:** 2026-01-18  
**Project Code:** CleanGenius  

---

## 1. User Stories & Use Cases

### 1.1 Primary User Journeys
| ID | Actor | User Story | Acceptance Criteria |
|----|-------|------------|---------------------|
| **US-01** | **Casual User** | As a non-technical user, I want a "One-Click Clean" button so that I can free up space without worrying about technical details. | 1. System automatically scans safe-to-delete areas.<br>2. User sees a simple "Clean Now" button.<br>3. Space is freed without deleting personal files. |
| **US-02** | **Designer/Photographer** | As a creative professional, I want to group similar photos and keep only the best ones so that my storage isn't cluttered with duplicates and burst shots. | 1. AI identifies visual similarities (not just exact duplicates).<br>2. UI groups similar photos for side-by-side comparison.<br>3. "Best shot" is auto-suggested. |
| **US-03** | **Developer** | As a developer, I want to find and delete old `node_modules` and build artifacts from inactive projects to reclaim disk space. | 1. Tool identifies development folders based on `.git`, `package.json`.<br>2. Filters by "Last Modified Date" > X months.<br>3. Allows bulk deletion of specific folders. |
| **US-04** | **Office Worker** | As an office worker, I want my "Downloads" folder automatically organized into "Invoices", "Installers", and "Personal" folders based on file content. | 1. AI analyzes file content (not just extension).<br>2. Files are moved to categorized sub-folders.<br>3. Action is reversible. |

### 1.2 Edge Cases & Error Scenarios
*   **EC-01: Locked Files**: When a file is in use by another application, the tool should skip it and report it in the final log, rather than crashing or hanging.
*   **EC-02: AI Hallucination**: If AI suggests a category with low confidence (<60%), the file should be placed in an "Uncategorized" or "Needs Review" folder rather than being moved incorrectly.
*   **EC-03: Disk Full**: If the disk is completely full during operation (preventing log writing or temp file creation), the app should fail gracefully and notify the user to free up minimal space manually.
*   **EC-04: Network Offline**: If utilizing any cloud-based fallback (optional), the system must seamlessly switch to the local-only model without user interruption.

### 1.3 Accessibility Requirements
*   **AR-01**: Full keyboard navigation support for all interactive elements (Tab, Enter, Esc, Arrow keys).
*   **AR-02**: Screen reader compatibility (ARIA labels on all buttons, especially icon-only buttons).
*   **AR-03**: High contrast mode support and compliance with WCAG 2.1 AA standards.

---

## 2. Functional Requirements

### 2.1 Core Scanning Features
*   **FR-SCAN-01**: **Multi-Drive Support**: Ability to scan C:, D:, and network drives (optional).
*   **FR-SCAN-02**: **Junk Detection**: Identify 30+ types of junk files (Temp, Cache, Logs, Thumbnails, Old Updates).
*   **FR-SCAN-03**: **Privacy Sweep**: Detect and clear browser traces (History, Cookies) and application recent files lists.
*   **FR-SCAN-04**: **Large File Finder**: Visualize files >100MB, categorized by type (Video, ISO, Archives).

### 2.2 AI-Powered Analysis Features
*   **FR-AI-01**: **Semantic Categorization**: Use local LLM/NLP to classify files based on filename semantics and text content (e.g., "Invoice_2024.pdf" -> Finance).
*   **FR-AI-02**: **Smart Importance Scoring**: Assign a "Risk Score" (0-10) to files.
    *   *Score 10 (Safe)*: Temp files, Cache.
    *   *Score 0 (Critical)*: Work documents, unique photos.
*   **FR-AI-03**: **Visual Similarity**: Use local Computer Vision (e.g., CLIP/ResNet) to find duplicate or near-duplicate images.
*   **FR-AI-04**: **Natural Language Commands**: Support queries like "Delete all PDF invoices from last year".

### 2.3 Cleanup & Optimization
*   **FR-OPT-01**: **Safe Recycle**: Default action is "Move to Recycle Bin" or "Quarantine Folder", not permanent delete.
*   **FR-OPT-02**: **Undo System**: Ability to revert the last batch operation (File Move/Rename) within 24 hours.
*   **FR-OPT-03**: **Smart Rename**: Batch rename files using patterns detected by AI (e.g., "IMG_001.jpg" -> "Trip_Tokyo_01.jpg").

### 2.4 Settings & Preferences
*   **FR-SET-01**: **Whitelist/Blacklist**: User-defined paths that are *never* scanned or touched.
*   **FR-SET-02**: **Schedule**: Set automated scanning (Daily, Weekly) with "Silent Mode" (notification only).
*   **FR-SET-03**: **AI Model Config**: Toggle between "Performance Mode" (Tiny model) and "Intelligence Mode" (Larger model).

### 2.5 Reporting & Analytics
*   **FR-RPT-01**: **Space Viz**: Sunburst or Treemap visualization of disk usage.
*   **FR-RPT-02**: **Cleanup History**: Log of space released over time (Day/Week/Month).
*   **FR-RPT-03**: **Action Log**: Detailed text log of every file moved, renamed, or deleted for audit purposes.

---

## 3. Non-Functional Requirements

### 3.1 Performance
*   **NFR-PERF-01**: App launch time < 2 seconds (Cold start).
*   **NFR-PERF-02**: "Smart Scan" (Common locations) completion < 30 seconds on SSD.
*   **NFR-PERF-03**: Background memory usage < 150MB when idle.
*   **NFR-PERF-04**: AI Inference time < 200ms per file (for text classification).

### 3.2 Reliability & Availability
*   **NFR-REL-01**: Crash rate < 0.1% of sessions.
*   **NFR-REL-02**: Zero data corruption during file move operations (verify checksum before deleting source).

### 3.3 Scalability
*   **NFR-SCL-01**: Capable of handling directories with 100,000+ files without UI freezing.
*   **NFR-SCL-02**: Virtual scrolling for file lists to maintain 60fps rendering.

### 3.4 Compatibility
*   **NFR-COMP-01**: OS Support: Windows 10 (1903+), Windows 11, macOS 12+ (Apple Silicon & Intel).
*   **NFR-COMP-02**: Permissions: Gracefully handle "Access Denied" (UAC/System Integrity Protection) scenarios.

---

## 4. UI/UX Requirements

### 4.1 Key Screens
1.  **Dashboard**:
    *   "System Health" Guage (0-100%).
    *   Big primary button: "Smart Scan".
    *   Quick stats: "Trash", "Large Files", "Duplicates".
2.  **Scan Results (Review Mode)**:
    *   Grouped list by category (Junk, Privacy, Optimization).
    *   Collapsible sections.
    *   AI Explanation tooltip: "Why AI selected this?".
3.  **Chat Assistant**:
    *   Sidebar or floating panel for natural language queries.
4.  **File Organizer Workspace**:
    *   Before/After preview pane.
    *   Drag-and-drop zone.

### 4.2 Design Principles
*   **Trust First**: Every destructive action requires explicit confirmation or a visible "Undo" path.
*   **Transparency**: No "Black Box" magic. Explain *why* a file is marked for deletion.
*   **Modern Native**: Use Fluent Design (Windows) / Apple Human Interface Guidelines (macOS) aesthetics.

### 4.3 Onboarding
*   **Step 1**: Welcome & Privacy Pledge ("We do not upload your files").
*   **Step 2**: Permission Granting (Disk Access).
*   **Step 3**: Baseline Scan (Quick initial check to show value immediately).

---

## 5. Integration Requirements

### 5.1 System Integrations
*   **INT-SYS-01**: **Context Menu**: Right-click on a folder -> "Organize with AI CleanGenius".
*   **INT-SYS-02**: **Native Notifications**: Toast notifications for scan completion or high-disk-usage alerts.
*   **INT-SYS-03**: **Taskbar/Menu Bar**: Mini-agent for quick RAM release or cache clearing.

### 5.2 Third-Party Services
*   **INT-SRV-01**: **Local LLM**: Integration with Ollama or embedded ONNX runtime for offline AI.
*   **INT-SRV-02**: **Cloud LLM (Optional)**: Optional API keys for OpenAI/Claude for users requiring advanced reasoning (User-provided keys only).

### 5.3 API Requirements
*   **INT-API-01**: Internal REST/IPC API between GUI (Renderer) and Core Logic (Main Process) to ensure UI responsiveness.

---

## 6. Acceptance Criteria

### 6.1 Feature Completion
*   [ ] **Scan**: Successfully identifies 95% of standard Windows temp files compared to reference tools (e.g., BleachBit).
*   [ ] **AI Categorize**: Correctly categorizes >80% of files in a test set of 100 mixed documents (Invoices, Resumes, Code).
*   [ ] **Clean**: "Undo" functionality successfully restores 100% of deleted files in a test run.

### 6.2 Quality Standards
*   **Code Coverage**: Unit test coverage > 80%.
*   **Linting**: Pass standard ESLint/Prettier configurations with zero errors.
*   **Security Audit**: No High/Critical vulnerabilities in dependencies (`npm audit`).

### 6.3 Testing Requirements
*   **Unit Tests**: For all file utility functions (size formatter, risk scorer).
*   **Integration Tests**: Mock file system tests for Move/Delete operations.
*   **E2E Tests**: Playwright tests for the "Scan -> Review -> Clean" flow.
