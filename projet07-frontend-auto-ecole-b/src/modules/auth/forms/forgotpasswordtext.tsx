import { Box, Link, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordLink() {
    const navigate = useNavigate();
  return (
    <Box textAlign="right" mt={1}>
      <Link
      component="button"
        variant="body2"
        onClick={() => navigate("/forgot-password")}
        underline="hover"
        sx={{
          fontSize: "0.85rem",
          color: "text.secondary",
          "&:hover": { color: "primary.main" },
        }}
      >
        Mot de passe oublié 
      </Link>
    </Box>
  );
}
