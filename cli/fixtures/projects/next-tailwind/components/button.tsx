import type { ButtonHTMLAttributes } from 'react';

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="min-h-11 rounded-control bg-primary px-4 text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring"
    />
  );
}
