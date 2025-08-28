# Pixelshop Backend & Database Design Plan

This document contains a comprehensive prompt for a generative AI model to design an extensive database schema for the future server-side version of Pixelshop.

---

### Prompt for Generating an Extensive Database Design

Act as a world-class database architect with deep expertise in designing scalable, secure, and maintainable schemas for creative SaaS applications.

I am building a multi-user, web-based version of my AI photo editor, "Pixelshop". The current version is client-side only, but I need a comprehensive database design to support a full-featured, server-side application that can scale to millions of users.

**Application Core Functionality:**
Pixelshop allows users to upload images and perform edits using AI. Edits include:
1.  **Precise Retouching:** Localized edits based on a user's click and a text prompt (e.g., "change shirt color to blue").
2.  **Creative Filters:** Applying global stylistic filters based on text prompts (e.g., "apply a synthwave aesthetic").
3.  **Professional Adjustments:** Global image adjustments like background blur or lighting changes.
4.  **Cropping:** Standard image cropping with aspect ratio controls.

**Database Design Requirements:**
Please provide an extensive and scalable database schema for Pixelshop. The design must support the following features:

1.  **User Authentication & Management:**
    *   Users must be able to sign up, log in, and manage their profiles (email, password, username).
    *   Support for different subscription tiers (e.g., Free, Pro) with varying feature access and usage limits.

2.  **Project-Based Workflow & Management:**
    *   Design a `Projects` table to store user editing sessions. This table will be the central hub for a user's work.
    *   Each project must be linked to a `user_id`.
    *   The table should store project metadata, including a `project_name`, `created_at`, and `updated_at`.
    *   Each project should reference the initial `asset_id` of the originally uploaded image.
    *   This structure will allow users to save their work, close the editor, and resume their session later.

3.  **Non-Destructive Editing & History:**
    *   The database must store a complete, ordered history of every edit action performed within a project.
    *   This history should include the type of action (retouch, filter, crop, adjust), the specific parameters used (e.g., the text prompt, coordinates, crop dimensions), and a reference to the resulting image asset.
    *   This is the most critical feature, as it allows users to undo/redo actions, view the project's evolution, and potentially re-apply edits in the future.

4.  **Asset Management:**
    *   Secure storage for user-uploaded images (assets). Assume these files will be stored in a cloud service like Amazon S3 or Google Cloud Storage, so the database should only store references (URLs/keys) to them.
    *   Track metadata for each asset (file name, MIME type, file size, dimensions, upload date).

5.  **Community & Sharing (Future Feature):**
    *   Design for a future ability for users to save and share their custom filters or adjustment "presets".
    *   Other users should be able to browse, use, and "like" these shared presets.

6.  **Billing & Subscriptions:**
    *   A system to manage user subscriptions, linking them to a payment provider like Stripe (store customer IDs, not credit card info).
    *   Track API and storage usage against subscription limits.

7.  **Predefined Presets:**
    *   Create a table to store predefined, system-level filters and adjustments that users can apply.
    *   This table should include fields for the preset's name (e.g., "Synthwave"), its descriptive prompt (the actual text sent to the AI), and a category to distinguish between "filter" and "adjustment" types.
    *   This table should also be designed to accommodate user-created presets in the future, as described in the "Community & Sharing" requirement.

**Requested Output:**
Please provide the following:

1.  **A list of all proposed database tables.**
2.  **For each table, provide the SQL DDL (e.g., `CREATE TABLE ...`) for a PostgreSQL database.** Include:
    *   Column names with appropriate data types (e.g., `VARCHAR`, `INT`, `TIMESTAMP WITH TIME ZONE`, `UUID`, `JSONB`).
    *   Primary keys (`PRIMARY KEY`), foreign keys (`FOREIGN KEY`) with `ON DELETE` constraints, and indexes for performance.
    *   `NOT NULL` constraints and default values where applicable.
3.  **A detailed explanation in Markdown for your design choices.** Describe the purpose of each table, the relationships between them (one-to-many, many-to-many), and why you chose specific data types (especially the use of `JSONB` for storing flexible parameter data).
4.  **(Optional) A text-based representation of an Entity-Relationship Diagram (ERD) showing the table relationships.**

Your design should prioritize data integrity, security, and scalability for a growing user base.