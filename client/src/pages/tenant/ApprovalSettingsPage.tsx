import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";
import { useAppSelector } from "../../app/hooks";

type TenantSettings = {
  approvalDigestFrequencyMinutes?: number | null;
  defaultLeadOwnerUserId?: string | null;
  openaiEncryptedApiKey?: string | null;
  timezone?: string | null;
};

type StaffMember = {
  id: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
};

type StaffOption = {
  id: string;
  label: string;
};

const digestOptions = [
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every 60 minutes" },
  { value: 120, label: "Every 2 hours" },
  { value: 240, label: "Every 4 hours" },
  { value: 480, label: "Every 8 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Daily" },
];

export default function ApprovalSettingsPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [frequency, setFrequency] = useState("60");
  const [defaultOwnerId, setDefaultOwnerId] = useState("");
  const [defaultOwnerInput, setDefaultOwnerInput] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [settingsData, setSettingsData] = useState<TenantSettings | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const timezoneOptions = useMemo(() => {
    const supported = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
    if (supported?.length) {
      return supported;
    }
    return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"];
  }, []);

  const staffOptions = useMemo(
    () =>
      staff
        .filter((member) => member.isActive && member.user.isActive)
        .map((member) => ({
          id: member.user.id,
          label: `${member.user.name} (${member.user.email})`,
        })),
    [staff]
  );

  const activeDigestOptions = useMemo(() => {
    const numericFrequency = Number(frequency);
    const hasCustom = !Number.isNaN(numericFrequency) && !digestOptions.some((opt) => opt.value === numericFrequency);
    if (!hasCustom) return digestOptions;
    return [{ value: numericFrequency, label: `Every ${numericFrequency} minutes` }, ...digestOptions];
  }, [frequency]);

  const selectedOwnerOption = useMemo(
    () => staffOptions.find((option) => option.id === defaultOwnerId) ?? null,
    [defaultOwnerId, staffOptions]
  );

  useEffect(() => {
    if (!tenantId) return;
    let isMounted = true;
    setSettingsLoading(true);
    setStaffLoading(true);

    const settingsPromise = api
      .get(`/api/tenants/${tenantId}/settings`)
      .then((response) => {
        if (!isMounted) return;
        const settings = response.data.settings as TenantSettings | undefined;
        setSettingsData(settings ?? null);
        if (settings) {
          setFrequency(String(settings.approvalDigestFrequencyMinutes ?? 60));
          const ownerId = settings.defaultLeadOwnerUserId ?? "";
          setDefaultOwnerId(ownerId);
          setDefaultOwnerInput(ownerId);
          setTimezone(settings.timezone ?? "UTC");
        }
      })
      .catch(() => {
        if (isMounted) setError("Unable to load settings.");
      })
      .finally(() => {
        if (isMounted) setSettingsLoading(false);
      });

    const staffPromise = api
      .get("/api/staff")
      .then((response) => {
        if (!isMounted) return;
        setStaff(response.data.staff ?? []);
      })
      .catch(() => {
        if (isMounted) setError("Unable to load staff members for assignment.");
      })
      .finally(() => {
        if (isMounted) setStaffLoading(false);
      });

    Promise.all([settingsPromise, staffPromise]).catch(() => null);

    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!defaultOwnerId) return;
    if (defaultOwnerInput !== defaultOwnerId) return;
    const option = staffOptions.find((member) => member.id === defaultOwnerId);
    if (option) {
      setDefaultOwnerInput(option.label);
    }
  }, [defaultOwnerId, defaultOwnerInput, staffOptions]);

  const handleSave = async () => {
    if (!tenantId) return;
    setStatus(null);
    setError(null);
    try {
      await api.patch(`/api/tenants/${tenantId}/settings`, {
        approvalDigestFrequencyMinutes: Number(frequency),
        defaultLeadOwnerUserId: defaultOwnerId || null,
        openaiApiKey: openaiKey || undefined,
        timezone,
      });
      setOpenaiKey("");
      setStatus("Settings saved.");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save settings.");
    }
  };

  const openAiConfigured = Boolean(settingsData?.openaiEncryptedApiKey);
  const saveDisabled = settingsLoading || staffLoading;

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Approval Settings
        </Typography>
        <Typography color="text.secondary">
          Configure approval digest cadence, default lead routing, and the OpenAI key used to structure lead inbox
          data.
        </Typography>
      </Box>

      {status ? <Alert severity="success">{status}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Digest frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            helperText="Choose how often approval digests are sent."
          >
            {activeDigestOptions.map((option) => (
              <MenuItem key={option.value} value={String(option.value)}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={staffOptions}
            value={selectedOwnerOption}
            inputValue={defaultOwnerInput}
            onChange={(_event, option) => {
              const nextId = option?.id ?? "";
              setDefaultOwnerId(nextId);
              setDefaultOwnerInput(option?.label ?? "");
            }}
            onInputChange={(_event, value, reason) => {
              setDefaultOwnerInput(value);
              if (reason === "input") {
                setDefaultOwnerId(value);
              }
              if (reason === "clear") {
                setDefaultOwnerId("");
              }
            }}
            loading={staffLoading}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Default lead owner"
                helperText="Select a staff member or paste a user ID for fallback ownership."
              />
            )}
          />
          <TextField
            label="OpenAI API key"
            type="password"
            value={openaiKey}
            onChange={(event) => setOpenaiKey(event.target.value)}
            helperText="Key is stored encrypted. Leave blank to keep existing."
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              OpenAI key status:
            </Typography>
            <Chip
              label={openAiConfigured ? "Configured" : "Not configured"}
              color={openAiConfigured ? "success" : "default"}
              size="small"
              variant={openAiConfigured ? "filled" : "outlined"}
            />
          </Stack>
          <TextField
            select
            label="Timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {timezoneOptions.map((zone) => (
              <MenuItem key={zone} value={zone}>
                {zone}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleSave} disabled={saveDisabled}>
            {saveDisabled ? "Loading..." : "Save settings"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
