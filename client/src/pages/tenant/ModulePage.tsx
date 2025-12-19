import { Box, Button, Paper, Stack, Typography } from "@mui/material";

interface ModulePageProps {
  title: string;
  subtitle: string;
  primaryAction?: string;
  secondaryAction?: string;
  helperItems?: string[];
}

export default function ModulePage({
  title,
  subtitle,
  primaryAction = "Create new",
  secondaryAction = "View settings",
  helperItems = [],
}: ModulePageProps) {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" sx={{ borderRadius: 2 }}>
            {secondaryAction}
          </Button>
          <Button variant="contained" sx={{ borderRadius: 2, fontWeight: 700 }}>
            {primaryAction}
          </Button>
        </Stack>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 3,
          display: "grid",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Quick overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This module is ready to be configured. Add your data sources, invite teammates, and start tracking
          results from the dashboard.
        </Typography>
        {helperItems.length ? (
          <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary" }}>
            {helperItems.map((item) => (
              <Box component="li" key={item} sx={{ mb: 0.5 }}>
                {item}
              </Box>
            ))}
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
}
