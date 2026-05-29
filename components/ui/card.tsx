import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Card — the platform's surface primitive. Aligns with the bespoke
 * `.ws-card` / `.ph-card` family (surface bg, slate hairline border, layered
 * `--elev-*` shadow) so hand-rolled cards can migrate onto one component.
 *
 * Variants:
 *   default     — resting elevation, the everyday container
 *   elevated    — stronger lift (`--elev-pop`) for modals / featured panels
 *   ghost       — no chrome; groups content without a visible card
 *   interactive — resting → hover lift (brand-tinted), for clickable cards
 *
 * `padding` sets root padding for simple one-off cards. Leave it `none`
 * (the default) when composing with CardHeader / CardContent / CardFooter,
 * which bring their own spacing.
 */
const cardVariants = cva(
  'rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface)] text-[var(--ink)]',
  {
    variants: {
      variant: {
        default: 'shadow-[var(--elev-card)]',
        elevated: 'shadow-[var(--elev-pop)]',
        ghost: 'border-transparent bg-transparent shadow-none',
        interactive:
          'shadow-[var(--elev-card)] transition-[box-shadow,border-color] duration-200 [transition-timing-function:var(--ease-out)] hover:border-[var(--border-strong)] hover:shadow-[var(--elev-card-hover)]',
      },
      padding: {
        none: '',
        sm: 'p-3',
        default: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  },
);

function Card({
  className,
  variant,
  padding,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 p-5', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-heading font-[family-name:var(--font-display)] text-[var(--ink)]',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-caption text-[var(--ink-3)]', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('p-5 pt-0', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-5 pt-0', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
