import { Action, ActionPanel, Color, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SAPSystem, SystemType } from "./types";
import { createAndOpenSAPCFile, getSAPSystems, groupSystemsByCustomer, LANGUAGES, SYSTEM_TYPE_LABELS } from "./utils";

const SYSTEM_TYPE_COLORS: Record<SystemType, Color> = {
  E: Color.Green,
  Q: Color.Yellow,
  P: Color.Red,
  S: Color.Blue,
};

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
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting...",
        message: `${system.customerName} – ${system.systemId} (${system.systemType})`,
      });

      const filePath = await createAndOpenSAPCFile(system, language);
      await open(filePath);

      await showHUD(`🔗 ${system.customerName} – ${system.systemId} (Client ${system.client})`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const groups = groupSystemsByCustomer(systems);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a customer or system...">
      {systems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No SAP Systems Configured"
          description="Add a system first using the 'Add New SAP System' command"
        />
      ) : (
        groups.map(({ customerName, systems: customerSystems }) => (
          <List.Section key={customerName} title={customerName}>
            {customerSystems.map((system) => (
              <List.Item
                key={system.id}
                icon={{ source: Icon.Link, tintColor: SYSTEM_TYPE_COLORS[system.systemType] }}
                title={system.customerName || system.systemId}
                subtitle={`${system.systemId} · Client ${system.client}`}
                keywords={[
                  system.systemId,
                  system.systemType,
                  SYSTEM_TYPE_LABELS[system.systemType],
                  system.client,
                  system.username,
                ]}
                accessories={[
                  ...(system.language
                    ? [{ tag: { value: system.language.toUpperCase(), color: Color.Green } }]
                    : [{ tag: { value: "Ask", color: Color.Orange }, icon: Icon.QuestionMark }]),
                  {
                    tag: {
                      value: `${system.systemType} – ${SYSTEM_TYPE_LABELS[system.systemType]}`,
                      color: SYSTEM_TYPE_COLORS[system.systemType],
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    {system.language ? (
                      <Action title="Connect to SAP" icon={Icon.Link} onAction={() => handleConnect(system)} />
                    ) : (
                      <ActionPanel.Submenu title="Connect to SAP" icon={Icon.Link}>
                        {LANGUAGES.map((lang) => (
                          <Action
                            key={lang.value}
                            title={lang.title}
                            onAction={() => handleConnect(system, lang.value)}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
