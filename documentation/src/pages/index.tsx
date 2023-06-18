import clsx from 'clsx'
import React from 'react'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import Heading from '@theme/Heading'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'

import styles from './index.module.css'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()

  return (
    <header className={clsx('hero hero--primary', styles.banner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          PeterPortal API
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className={clsx('button button--secondary button--lg', styles.gettingStartedButton)}
            to="/docs/getting-started"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  return (
    <Layout>
      <HomepageHeader />
    </Layout>
  )
}
