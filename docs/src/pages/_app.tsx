import { Router } from "next/router";
import { MDXProvider } from "@mdx-js/react";
import { DefaultSeo } from "next-seo";
import { Inter } from "@next/font/google";
import { useMobileNavigationStore } from "../components/MobileNavigation";
import { Layout } from "../components/Layout";
import * as mdxComponents from "../components/mdx";
import { Analytics } from "@vercel/analytics/react";

import { type AppType } from "next/app";

import { trpc } from "../utils/trpc";

import "../styles/globals.css";
import "focus-visible";

const inter = Inter({ subsets: ["latin"], fallback: ["system-ui", "arial"] });

function onRouteChange() {
  useMobileNavigationStore.getState().close();
}

Router.events.on("hashChangeStart", onRouteChange);
Router.events.on("routeChangeComplete", onRouteChange);
Router.events.on("routeChangeError", onRouteChange);

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <DefaultSeo
        defaultTitle="Uploadjoy documentation"
        canonical="https://docs.uploadjoy.com"
        description="S3 if it was good. Upload and object storage and management for the modern web."
        openGraph={{
          type: "website",
          locale: "en_IE",
          url: "https://docs.uploadjoy.com",
          site_name: "Uploadjoy",
          description:
            "S3 if it was good. Upload and object storage and management for the modern web.",
          images: [
            {
              url: "https://uploadjoy.com/api/og",
              width: 1200,
              height: 630,
              alt: "Simple object storage and sharing.",
              type: "image/png",
            },
          ],
        }}
      />
      <style jsx global>{`
        html {
          font-family: ${inter.style.fontFamily};
        }
      `}</style>
      <MDXProvider components={mdxComponents as any}>
        <Layout {...pageProps}>
          <Component {...pageProps} />
          <Analytics />
        </Layout>
      </MDXProvider>
    </>
  );
};

export default trpc.withTRPC(MyApp);
