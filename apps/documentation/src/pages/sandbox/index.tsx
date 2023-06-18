import React from "react";
import Layout from "@theme/Layout";
import BrowserOnly from "@docusaurus/BrowserOnly";
import { ApolloSandbox } from "@apollo/sandbox/react";

import styles from "./styles.module.css";

export default function Sandbox() {
  return (
    <BrowserOnly fallback={<>&#34;Loading...&#34;</>}>
      {() => {
        const baseUrl =
          process.env.NODE_ENV === "development"
            ? `http://localhost:${process.env.API_PORT || 8080}`
            : `https://${window.location.hostname.replace(/-?docs/, "").replace(/^\./, "")}`;
        return (
          <Layout title={"Sandbox"} noFooter>
            <ApolloSandbox
              className={styles.apolloSandbox}
              initialEndpoint={`${baseUrl}/v1/graphql`}
            />
          </Layout>
        );
      }}
    </BrowserOnly>
  );
}
