import Link from "next/link";
import { motion } from "framer-motion";

import { Footer } from "./Footer";
import { Header } from "./Header";
import { Logo } from "./Logo";
import { Navigation } from "./Navigation";
import { Prose } from "./Prose";
import { SectionProvider } from "./SectionProvider";
import type { ReactNode } from "react";
import { Note } from "./mdx";

export function Layout({
  children,
  sections = [],
}: {
  children: ReactNode;
  sections?: [];
}) {
  return (
    <SectionProvider sections={sections}>
      <div className="lg:ml-72 xl:ml-80">
        <motion.header
          layoutScroll
          className="fixed inset-y-0 left-0 z-40 contents w-72 overflow-y-auto border-r border-zinc-900/10 px-6 pb-8 pt-4 dark:border-white/10 lg:block xl:w-80"
        >
          <div className="hidden lg:flex">
            <Link href="/" aria-label="Home">
              <Logo className="h-6" />
            </Link>
          </div>
          <Header />
          <Navigation className="hidden lg:mt-10 lg:block" />
        </motion.header>
        <div className="relative px-4 pt-14 sm:px-6 lg:px-8">
          <main className="py-16">
            <Prose as="article">{children}</Prose>
          </main>
          <Footer />
        </div>
      </div>
    </SectionProvider>
  );
}
