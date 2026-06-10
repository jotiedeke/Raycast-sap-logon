# SAP GUI Connector

Quickly connect to SAP systems with your saved credentials.

This extension requires an installed SAP GUI for Java installation.

## Organizing systems

Each system is stored with a **customer name** and a **system type**:

- **E** – Entwicklung (development)
- **Q** – Qualitätssicherung (quality / test)
- **P** – Produktiv (production)

This means several customers can share the same SAP System ID (e.g. multiple
`PRD` systems) without clashing, and you no longer have to memorize which SID
belongs to which customer.

## Commands

- **List SAP Systems** – manage systems, grouped by customer.
- **Add New SAP System** – store a new system (customer, SID, E/Q/P, server, …).
- **Connect to SAP System** – a searchable list: start typing a customer name,
  the list filters live, then narrow with `E`, `Q` or `P` and press `↵` to
  connect.
- **SAP Quick Connect** – menu bar access, grouped by customer.

![screnshot](./assets/add-new-system.png)
![screnshot](./assets/list-system.png)
