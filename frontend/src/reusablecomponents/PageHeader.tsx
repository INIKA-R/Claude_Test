import { ReactNode } from "react";

export function PageHeader({ title, description }: { title: string; description?: string }): ReactNode {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
