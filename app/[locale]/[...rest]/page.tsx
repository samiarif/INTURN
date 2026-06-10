import { notFound } from 'next/navigation';

// Any URL inside [locale] that no real route matched lands here and renders
// app/[locale]/not-found.tsx (instead of Next's unstyled default 404).
export default function CatchAllNotFound() {
  notFound();
}
