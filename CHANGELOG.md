# SAP GUI Connector

## [Customer Grouping, System Types & Language Prompt] - {PR_MERGE_DATE}

- Added a **customer name** and **system type** (E – development, Q – quality,
  P – production, S – other) to each system, so several customers can share the
  same System ID without clashing.
- Systems are now **grouped by customer** in the list, menu bar, and quick
  connect, with a colored system-type tag.
- "Connect to SAP System" is now a **searchable list** — type a customer name to
  filter live and connect.
- Systems can be saved **without a language**; in that case the language is
  **asked for at connect time** via a submenu (list, menu bar, and quick connect).
- The **password is now optional when editing** — leave it empty to keep the
  current one (fixes a bug where the field could not be prefilled).
- Custom SAP menu bar icon with light/dark variants.
- Existing systems are **migrated automatically** (defaulting to type P, no
  customer) and can be assigned a customer/type afterwards via Edit System.

## [Initial Version] - {PR_MERGE_DATE}