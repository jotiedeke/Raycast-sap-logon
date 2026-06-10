import { Icon, MenuBarExtra, open, showHUD, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { SAPSystem } from "./types";
import { createAndOpenSAPCFile, getSAPSystems, groupSystemsByCustomer, LANGUAGES, SYSTEM_TYPE_LABELS } from "./utils";

export default function Command() {
  const [systems, setSystems] = useState<SAPSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSystems() {
      const loadedSystems = await getSAPSystems();
      setSystems(loadedSystems);
      setIsLoading(false);
    }
    loadSystems();
  }, []);

  async function handleConnect(system: SAPSystem, language?: string) {
    try {
      const filePath = await createAndOpenSAPCFile(system, language);
      await open(filePath);
      await showHUD(`🔗 Connecting to ${system.customerName} – ${system.systemId} (Client ${system.client})`);
    } catch (error) {
      await showHUD(`❌ Failed to connect to ${system.systemId}: ${error}`);
    }
  }

  async function openMainView() {
    try {
      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    } catch (error) {
      await showHUD(`❌ Failed to open main view: ${error}`);
    }
  }

  async function openAddSystem() {
    try {
      await launchCommand({ name: "add-system", type: LaunchType.UserInitiated });
    } catch (error) {
      await showHUD(`❌ Failed to open add system view: ${error}`);
    }
  }

  return (
    <MenuBarExtra
      icon={{ source: { light: "sap-bar.png", dark: "sap-bar@dark.png" } }}
      tooltip="SAP Quick Connect"
      isLoading={isLoading}
    >
      {systems.length === 0 ? (
        <MenuBarExtra.Item title="No SAP Systems Configured" icon={Icon.Warning} onAction={openAddSystem} />
      ) : (
        groupSystemsByCustomer(systems).map(({ customerName, systems: customerSystems }) => (
          <MenuBarExtra.Section key={customerName} title={customerName}>
            {customerSystems.map((system) =>
              system.language ? (
                <MenuBarExtra.Item
                  key={system.id}
                  icon={Icon.Link}
                  title={`${system.systemType} – ${system.systemId} (Client ${system.client})`}
                  subtitle={SYSTEM_TYPE_LABELS[system.systemType]}
                  onAction={() => handleConnect(system)}
                />
              ) : (
                <MenuBarExtra.Submenu
                  key={system.id}
                  icon={Icon.Link}
                  title={`${system.systemType} – ${system.systemId} (Client ${system.client})`}
                >
                  {LANGUAGES.map((lang) => (
                    <MenuBarExtra.Item
                      key={lang.value}
                      title={lang.title}
                      onAction={() => handleConnect(system, lang.value)}
                    />
                  ))}
                </MenuBarExtra.Submenu>
              ),
            )}
          </MenuBarExtra.Section>
        ))
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage SAP Systems..."
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openMainView}
        />
        <MenuBarExtra.Item
          title="Add New System..."
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={openAddSystem}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
