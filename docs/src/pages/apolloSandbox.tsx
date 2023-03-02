import { ApolloSandbox as AS } from "@apollo/sandbox/react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";
import React from "react";

import styles from "./apolloSandbox.module.css";

export default function ApolloSandbox() {
  return (
    <BrowserOnly fallback={<>"Loading..."</>}>
      {() => (
        <Layout title={"Sandbox"} noFooter>
          <AS
            className={styles.apolloSandbox}
            initialEndpoint={`${
              process.env.NODE_ENV === "development"
                ? `http://localhost:${process.env.PORT || 8080}`
                : `https://${
                    process.env.STAGE === "prod" ? "" : `${process.env.STAGE}-`
                  }api-next.peterportal.org`
            }/v1/graphql`}
          />
        </Layout>
      )}
    </BrowserOnly>
  );
}
