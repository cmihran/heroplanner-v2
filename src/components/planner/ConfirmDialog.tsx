import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  resolve: (confirmed: boolean) => void;
}

let pendingRequest: ((req: ConfirmRequest) => void) | null = null;

// eslint-disable-next-line react-refresh/only-export-components -- co-located imperative API for ConfirmDialog
export function confirm(title: string, description: string, confirmLabel?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (pendingRequest) {
      pendingRequest({ title, description, confirmLabel, resolve });
    } else {
      resolve(true); // No dialog mounted, proceed
    }
  });
}

export function ConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    pendingRequest = setRequest;
    return () => { pendingRequest = null; };
  }, []);

  const handleAction = (confirmed: boolean) => {
    request?.resolve(confirmed);
    setRequest(null);
  };

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => { if (!open) handleAction(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>{request?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleAction(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleAction(true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {request?.confirmLabel ?? 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
