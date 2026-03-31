/**
 * Admin-domain mutation error handler factory.
 *
 * All admin mutations share the same `onError` shape:
 *   1. `console.error` for debugging
 *   2. `toast.error` for the user, with the actual error message when available
 *
 * Using a single factory eliminates the 10+ copy-pasted `onError` blocks and
 * makes the presentation behaviour consistent (previously some mutations showed
 * a static string while others surfaced `error.message`).
 *
 * @param label  Short French action label used in the toast, e.g. "la sauvegarde"
 *               → "Erreur lors de la sauvegarde".
 *               When the caught error carries a message, that message is shown
 *               instead so the user gets actionable feedback.
 */
import { toast } from "sonner";

export function makeMutationErrorHandler(label: string) {
  return (error: unknown): void => {
    console.error(`Erreur ${label}:`, error);
    const msg =
      error instanceof Error && error.message
        ? error.message
        : `Erreur lors de ${label}`;
    toast.error(msg);
  };
}
