import type { AnchorHTMLAttributes, Ref } from "react";
import { forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import { motion, useScroll, useTransform } from "framer-motion";

import { Button } from "./Button";
import { Logo } from "./Logo";
import {
  MobileNavigation,
  useIsInsideMobileNavigation,
} from "./MobileNavigation";
import { useMobileNavigationStore } from "./MobileNavigation";
import { ModeToggle } from "./ModeToggle";

function TopLevelNavItem({
  href,
  children,
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}

export const Header = forwardRef<HTMLDivElement, { className?: string }>(
  function Header({ className }, ref) {
    const { isOpen: mobileNavIsOpen } = useMobileNavigationStore();
    const isInsideMobileNavigation = useIsInsideMobileNavigation();

    const { scrollY } = useScroll();
    const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9]);
    const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8]);

    return (
      <motion.div
        ref={ref}
        className={clsx(
          className,
          "fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-12 px-4 transition sm:px-6 lg:z-30 lg:px-8",
          !isInsideMobileNavigation &&
            "backdrop-blur-sm dark:backdrop-blur lg:left-72 xl:left-80",
          isInsideMobileNavigation
            ? "bg-white dark:bg-zinc-950"
            : "bg-white/[var(--bg-opacity-light)] dark:bg-zinc-950/[var(--bg-opacity-dark)]"
        )}
        style={
          {
            "--bg-opacity-light": bgOpacityLight,
            "--bg-opacity-dark": bgOpacityDark,
          } as any
        }
      >
        <div
          className={clsx(
            "absolute inset-x-0 top-full h-px transition",
            (isInsideMobileNavigation || !mobileNavIsOpen) &&
              "bg-zinc-900/7.5 dark:bg-white/7.5"
          )}
        />
        <div className="flex items-center gap-5 lg:hidden">
          <MobileNavigation />
          <Link href="/" aria-label="Home">
            <Logo className="h-6" />
          </Link>
        </div>
        <div className="flex w-full items-center justify-end gap-5">
          <div className="flex gap-4">
            <ModeToggle />
          </div>
          <div className="hidden min-[416px]:contents">
            <Button href="https://uploadjoy.com/app" target="_blank">
              Open app
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
);
