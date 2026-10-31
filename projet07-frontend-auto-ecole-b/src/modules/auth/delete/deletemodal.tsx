import React from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Fade,
  Backdrop,
  Stack,
} from "@mui/material";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute" as const,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 3,
            width: 400,
            textAlign: "center",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Confirmation de suppression
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Es-tu sûr de vouloir supprimer{" "}
            <strong>{itemName || "cet élément"}</strong> ?
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="error"
              onClick={onConfirm}
            >
              Supprimer
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onClose}
            >
              Annuler
            </Button>
          </Stack>
        </Box>
      </Fade>
    </Modal>
  );
};

export default DeleteConfirmModal;
