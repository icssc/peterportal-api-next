import { ApolloSandbox } from "@apollo/sandbox/react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";
import React from "react";

import styles from "./styles.module.css";

export default function Sandbox() {
  let initialEndpoint;
  switch (process.env.NODE_ENV) {
    case "development":
      initialEndpoint = `http://localhost:${process.env.API_PORT || 8080}`;
      break;
    case "staging":
      initialEndpoint = `https://${process.env.STAGE}.api-next.peterportal.org`;
      break;
    case "production":
      initialEndpoint = "https://api-next.peterportal.org";
      break;
  }
  initialEndpoint += "/v1/graphql";
  return (
    <BrowserOnly fallback={<>"Loading..."</>}>
      {() => (
        <Layout title={"Sandbox"} noFooter>
          <ApolloSandbox
            className={styles.apolloSandbox}
            initialEndpoint={initialEndpoint}
          />
        </Layout>
      )}
    </BrowserOnly>
  );
}
