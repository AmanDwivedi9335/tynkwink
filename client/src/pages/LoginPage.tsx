import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import EmailIcon from "@mui/icons-material/Email";
import BusinessIcon from "@mui/icons-material/Business";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginThunk } from "../features/auth/authThunks";
import { selectAuthError, selectAuthStatus, selectIsAuthenticated } from "../features/auth/authSelectors";
import { useNavigate } from "react-router-dom";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tenantId: z.string().optional().or(z.literal("")),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = useAppSelector((state) => state.auth.role);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "", tenantId: "" },
  });

  React.useEffect(() => {
    if (!isAuthenticated) return;
    if (role === "SUPERADMIN") {
      navigate("/superamanpanel", { replace: true });
    } else {
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  const onSubmit = async (values: LoginForm) => {
    const payload = {
      email: values.email.trim(),
      password: values.password,
      tenantId: values.tenantId?.trim() ? values.tenantId.trim() : undefined,
    };

    const res = await dispatch(loginThunk(payload));
    if (loginThunk.fulfilled.match(res)) {
      const redirectTo = res.payload.redirectTo ?? (res.payload.role === "SUPERADMIN" ? "/superamanpanel" : "/app");
      navigate(redirectTo, { replace: true });
    }
  };

  const loading = status === "loading";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        bgcolor: (t) => t.palette.grey[50],
      }}
    >
      <Container maxWidth="sm" sx={{ display: "grid", gap: 2 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <LockIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Access your workspace
              </Typography>
            </Box>
          </Box>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Email"
              fullWidth
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Password"
              type="password"
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register("password")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Tenant ID (optional)"
              fullWidth
              autoComplete="off"
              error={!!errors.tenantId}
              helperText={errors.tenantId?.message || "Leave blank if your account belongs to a single workspace."}
              {...register("tenantId")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Typography component="a" href="/forgot-password" variant="body2" sx={{ textDecoration: "none" }}>
                Forgot password?
              </Typography>
              <Typography component="a" href="/register" variant="body2" sx={{ textDecoration: "none" }}>
                Create account
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
              By continuing, you agree to the Terms and Privacy Policy.
            </Typography>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Tenant login guide
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Use these steps when a tenant workspace is created for you.
          </Typography>
          <Box component="ol" sx={{ pl: 3, m: 0, color: "text.secondary" }}>
            <li>Enter the admin email shared by your super admin.</li>
            <li>Use the temporary password from the tenant creation email.</li>
            <li>Add the Tenant ID (workspace slug) if you have multiple workspaces.</li>
            <li>Reset your password after signing in.</li>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
