import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { SAPSystemFormValues } from "./types";
import {
  addSAPSystem,
  LANGUAGES,
  SYSTEM_TYPE_LABELS,
  SYSTEM_TYPES,
  validateClient,
  validateInstanceNumber,
} from "./utils";

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const [customerNameError, setCustomerNameError] = useState<string | undefined>();
  const [systemIdError, setSystemIdError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();
  const [instanceError, setInstanceError] = useState<string | undefined>();
  const [clientError, setClientError] = useState<string | undefined>();
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  async function handleSubmit(values: SAPSystemFormValues) {
    // Validate required fields
    let hasError = false;

    if (!values.customerName.trim()) {
      setCustomerNameError("Customer name is required");
      hasError = true;
    }
    if (!values.systemId.trim()) {
      setSystemIdError("System ID is required");
      hasError = true;
    }
    if (!values.applicationServer.trim()) {
      setServerError("Application server is required");
      hasError = true;
    }
    if (!values.instanceNumber.trim()) {
      setInstanceError("Instance number is required");
      hasError = true;
    } else {
      const instanceValidation = validateInstanceNumber(values.instanceNumber);
      if (instanceValidation) {
        setInstanceError(instanceValidation);
        hasError = true;
      }
    }
    if (!values.client.trim()) {
      setClientError("Client is required");
      hasError = true;
    } else {
      const clientValidation = validateClient(values.client);
      if (clientValidation) {
        setClientError(clientValidation);
        hasError = true;
      }
    }
    if (!values.username.trim()) {
      setUsernameError("Username is required");
      hasError = true;
    }
    if (!values.password.trim()) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      await addSAPSystem(
        {
          customerName: values.customerName.trim(),
          systemId: values.systemId.trim().toUpperCase(),
          systemType: values.systemType,
          applicationServer: values.applicationServer.trim(),
          instanceNumber: values.instanceNumber.trim(),
          client: values.client.trim(),
          username: values.username.trim(),
          language: values.language,
        },
        values.password,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "System Added",
        message: `${values.systemId} has been saved`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add System",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add SAP System"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add System" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="New SAP System"
        text="Enter the connection details for your SAP system. The password will be stored encrypted."
      />

      <Form.TextField
        id="customerName"
        title="Customer"
        placeholder="Acme Corp, Müller GmbH..."
        error={customerNameError}
        onChange={() => setCustomerNameError(undefined)}
        info="The customer this system belongs to. Used to group and search systems."
      />

      <Form.TextField
        id="systemId"
        title="System ID"
        placeholder="PRD, DEV, QAS..."
        error={systemIdError}
        onChange={() => setSystemIdError(undefined)}
        info="The SAP System ID (SID), typically 3 characters"
      />

      <Form.Dropdown id="systemType" title="System Type" defaultValue="E">
        {SYSTEM_TYPES.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={`${type} – ${SYSTEM_TYPE_LABELS[type]}`} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="applicationServer"
        title="Application Server"
        placeholder="sap-server.company.com"
        error={serverError}
        onChange={() => setServerError(undefined)}
        info="Hostname or IP address of the SAP application server"
      />

      <Form.TextField
        id="instanceNumber"
        title="Instance Number"
        placeholder="00"
        error={instanceError}
        onChange={() => setInstanceError(undefined)}
        info="2-digit instance number (e.g., 00, 01)"
      />

      <Form.TextField
        id="client"
        title="Client"
        placeholder="100"
        error={clientError}
        onChange={() => setClientError(undefined)}
        info="3-digit client number (e.g., 100, 800)"
      />

      <Form.Separator />

      <Form.TextField
        id="username"
        title="Username"
        placeholder="Your SAP username"
        error={usernameError}
        onChange={() => setUsernameError(undefined)}
      />

      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Your SAP password"
        error={passwordError}
        onChange={() => setPasswordError(undefined)}
        info="Password is stored encrypted locally"
      />

      <Form.Separator />

      <Form.Dropdown
        id="language"
        title="Language"
        defaultValue="EN"
        info="Choose 'Ask on connect' to be prompted for the language each time you connect."
      >
        <Form.Dropdown.Item value="" title="Ask on connect (no default)" />
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
