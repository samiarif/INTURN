import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Table primitive — wraps the repeated admin/list markup in one set of
 * tokenized parts. Header row reads as an eyebrow (mono, uppercase, muted
 * surface); body rows hover-tint and support a selected state via
 * `data-state="selected"`.
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom border-collapse text-body', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        '[&_tr]:border-b [&_tr]:border-[var(--border-color)] [&_tr]:bg-[var(--surface-muted)]',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-[var(--border-color)] transition-colors hover:bg-[var(--surface-muted)] data-[state=selected]:bg-[var(--surface-brand-tint)]',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-9 px-3 text-left align-middle text-eyebrow uppercase text-[var(--ink-3)] font-[family-name:var(--font-mono)] whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-3 py-2.5 align-middle text-[var(--ink-2)]', className)}
      {...props}
    />
  );
}

function TableEmpty({
  className,
  colSpan = 100,
  children,
  ...props
}: React.ComponentProps<'td'> & { colSpan?: number }) {
  return (
    <tr data-slot="table-empty">
      <td
        colSpan={colSpan}
        className={cn(
          'px-3 py-12 text-center text-caption text-[var(--ink-3)]',
          className,
        )}
        {...props}
      >
        {children}
      </td>
    </tr>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
};
