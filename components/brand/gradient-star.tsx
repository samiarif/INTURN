import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const sizeClasses: Record<Size, string> = {
  sm: 'w-4 h-4 rounded-sm',
  md: 'w-[22px] h-[22px] rounded-[5px]',
  lg: 'w-8 h-8 rounded-md',
};

export function GradientStar({ size = 'md', className }: { size?: Size; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        sizeClasses[size],
        'inline-block shadow-[0_2px_8px_-2px_rgba(143,31,254,0.55)]',
        className,
      )}
      style={{
        background:
          'linear-gradient(135deg, #2BD9C8 0%, #8F70FE 30%, #8F1FFE 60%, #E467FE 100%)',
      }}
    />
  );
}
