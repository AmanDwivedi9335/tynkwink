import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";
import { useAppSelector } from "../../app/hooks";

type LeadInboxItem = {
  id: string;
  from: string;
  subject?: string | null;
  snippet?: string | null;
  receivedAt: string;
  status: string;
};

export default function LeadInboxPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [items, setItems] = useState<LeadInboxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadInbox = async () => {
    if (!tenantId) return;
    try {
      const response = await api.get(`/api/tenants/${tenantId}/lead-inbox?status=PENDING`);
      setItems(response.data.inbox ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to load inbox.");
    }
  };

  useEffect(() => {
    loadInbox();
  }, [tenantId]);

  const handleAction = async (leadInboxId: string, action: "approve" | "reject") => {
    if (!tenantId) return;
    setStatusMessage(null);
    setError(null);
    try {
      await api.post(`/api/tenants/${tenantId}/lead-inbox/${leadInboxId}/${action}`);
      setStatusMessage(`Lead ${action}d.`);
      await loadInbox();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Unable to ${action} lead.`);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Lead Inbox
        </Typography>
        <Typography color="text.secondary">Review candidates detected from Gmail before import.</Typography>
      </Box>

      {statusMessage ? <Alert severity="success">{statusMessage}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>From</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Snippet</TableCell>
              <TableCell>Received</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.from}</TableCell>
                <TableCell>{item.subject ?? "-"}</TableCell>
                <TableCell>{item.snippet ?? "-"}</TableCell>
                <TableCell>{new Date(item.receivedAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip label={item.status} size="small" />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={() => handleAction(item.id, "approve")}>
                      Approve
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => handleAction(item.id, "reject")}>
                      Reject
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No pending leads.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
