import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SAPSystem, SystemType } from "./types";
import {
  createAndOpenSAPCFile,
  deleteSAPSystem,
  getSAPSystems,
  groupSystemsByCustomer,
  LANGUAGES,
  SYSTEM_TYPE_LABELS,
} from "./utils";
import EditSystemForm from "./edit-system";

const SYSTEM_TYPE_COLORS: Record<SystemType, Color> = {
  E: Color.Green,
  Q: Color.Yellow,
  P: Color.Red,
  S: Color.Blue,
};

export default function Command() {
  const [systems, setSystems] = useState<SAPSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadSystems() {
    setIsLoading(true);
    const loadedSystems = await getSAPSystems();
    setSystems(loadedSystems);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSystems();
  }, []);

  async function handleConnect(system: SAPSystem, language?: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting...",
        message: `Opening ${system.systemId}`,
      });

      const filePath = await createAndOpenSAPCFile(system, language);
      await open(filePath);

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: `Opened SAP connection to ${system.systemId}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(system: SAPSystem) {
    const confirmed = await confirmAlert({
      title: "Delete SAP System",
      message: `Are you sure you want to delete "${system.systemId}" (Client ${system.client})?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteSAPSystem(system.id);
      await loadSystems();
      await showToast({
        style: Toast.Style.Success,
        title: "System Deleted",
        message: `${system.systemId} has been removed`,
      });
    }
  }

  function handleEdit(system: SAPSystem) {
    push(<EditSystemForm system={system} onSave={loadSystems} />);
  }

  const groups = groupSystemsByCustomer(systems);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by customer, system ID or type...">
      {systems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No SAP Systems Configured"
          description="Add your first SAP system using the 'Add SAP System' command"
        />
      ) : (
        groups.map(({ customerName, systems: customerSystems }) => (
          <List.Section key={customerName} title={customerName} subtitle={`${customerSystems.length} system(s)`}>
            {customerSystems.map((system) => (
              <List.Item
                key={system.id}
                icon={{ source: Icon.Globe, tintColor: SYSTEM_TYPE_COLORS[system.systemType] }}
                title={system.systemId}
                subtitle={`Client ${system.client}`}
                keywords={[
                  system.customerName,
                  system.systemType,
                  SYSTEM_TYPE_LABELS[system.systemType],
                  system.client,
                  system.applicationServer,
                ]}
                accessories={[
                  {
                    tag: {
                      value: `${system.systemType} – ${SYSTEM_TYPE_LABELS[system.systemType]}`,
                      color: SYSTEM_TYPE_COLORS[system.systemType],
                    },
                  },
                  { text: system.applicationServer },
                  { text: system.username, icon: Icon.Person },
                  system.language
                    ? { tag: { value: system.language.toUpperCase(), color: Color.Green } }
                    : { tag: { value: "Ask", color: Color.Orange }, icon: Icon.QuestionMark },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Connection">
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
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Edit System"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => handleEdit(system)}
                      />
                      <Action
                        title="Delete System"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => handleDelete(system)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Info">
                      <Action.CopyToClipboard
                        title="Copy System ID"
                        content={system.systemId}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Application Server"
                        content={system.applicationServer}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
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
