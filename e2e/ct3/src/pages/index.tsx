import styles from "./index.module.css";
import { type NextPage } from "next";
import Link from "next/link";

import { trpc } from "../utils/trpc";

const Home: NextPage = () => {
  const { data } = trpc.uploadjoy.privateObject.useQuery({
    keys: ["stripe-product.png"],
  });
  console.log(data);
  return (
    <>
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>
            Create <span className={styles.pinkSpan}>T3</span> App
          </h1>
          <div className={styles.cardRow}>
            <Link
              className={styles.card}
              href="https://create.t3.gg/en/usage/first-steps"
            >
              <h3 className={styles.cardTitle}>First Steps →</h3>
              <div className={styles.cardText}>
                Just the basics - Everything you need to know to set up your
                database and authentication.
              </div>
            </Link>
            <Link
              className={styles.card}
              href="https://create.t3.gg/en/introduction"
            >
              <h3 className={styles.cardTitle}>Documentation →</h3>
              <div className={styles.cardText}>
                Learn more about Create T3 App, the libraries it uses, and how
                to deploy it.
              </div>
            </Link>
          </div>
          <p className={styles.showcaseText}></p>
        </div>
      </main>
    </>
  );
};

export default Home;
