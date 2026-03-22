import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  floatingSlot?: ReactNode;
};

export function AppShell({ children, floatingSlot }: AppShellProps) {
  return (
    <main className="pageShell">
      <div className="ambient ambientLeft" />
      <div className="ambient ambientRight" />
      <section className="appFrame">{children}</section>
      {floatingSlot}
    </main>
  );
}
