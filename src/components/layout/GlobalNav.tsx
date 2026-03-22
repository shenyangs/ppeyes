"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "工作台" },
  { href: "/watchlists", label: "监测词" },
  { href: "/opportunities", label: "机会池" },
  { href: "/briefings", label: "简报" }
];

export function GlobalNav() {
  const pathname = usePathname();

  return (
    <nav className="navRow" aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link className={isActive ? "navLink navLinkActive" : "navLink"} href={item.href} key={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
