import type { ReactNode } from "react";
import Link from "next/link";
import { GlobalNav } from "@/components/layout/GlobalNav";

type AppHeaderProps = {
  actions?: ReactNode;
};

export function AppHeader({ actions }: AppHeaderProps) {
  return (
    <div className="headerStack">
      <header className="topBar">
        <Link className="brandBlock brandLink" href="/">
          <div className="brandMark">热</div>
          <div>
            <p className="eyebrow">PPeyes 原生 AI 运营中枢</p>
            <h1>社媒平台 AI 作战台</h1>
          </div>
        </Link>

        <div className="topActions">{actions}</div>
      </header>

      <GlobalNav />
    </div>
  );
}
