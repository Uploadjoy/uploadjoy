import { Router } from "next/router";
import { MDXProvider } from "@mdx-js/react";
import { DefaultSeo } from "next-seo";
import { Inter } from "@next/font/google";
import PlausibleProvider from "next-plausible";
import { useMobileNavigationStore } from "../components/MobileNavigation";
import { Layout } from "../components/Layout";
import * as mdxComponents from "../components/mdx";

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
        description="Upload and host objects like images and videos with Uploadjoy. It's the fastest way to get static files for your applications to your users."
        openGraph={{
          type: "website",
          locale: "en_IE",
          url: "https://docs.uploadjoy.com",
          site_name: "Uploadjoy",
          description:
            "Upload and host objects like images and videos with Uploadjoy. It's the fastest way to get static files for your applications to your users.",
          images: [
            {
              url: "https://uploadjoy.com/og.png",
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
      <PlausibleProvider domain="docs.uploadjoy.com">
        <MDXProvider components={mdxComponents as any}>
          <Layout {...pageProps}>
            <Component {...pageProps} />
          </Layout>
        </MDXProvider>
      </PlausibleProvider>
    </>
  );
};

export default trpc.withTRPC(MyApp);
