import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';

interface SubmitButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  isPending: boolean;
  pendingLabel: string;
}

/**
 * A submit button that shows a spinner and swaps to pendingLabel while isPending is true.
 * Wraps <Button loading> so the spinner is rendered by the shared Button component.
 */
export function SubmitButton({
  isPending,
  pendingLabel,
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      loading={isPending}
      disabled={isPending || disabled}
      {...props}
    >
      {isPending ? pendingLabel : children}
    </Button>
  );
}
