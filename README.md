## ℹ️ About

Anteater API (formerly PeterPortal API _Next_) is a student-developed and maintained project that aims to provide software developers with easy access to publicly available data from the University of California, Irvine. This includes but is not limited to information on courses, instructors, past grade distributions, and much more.

## 🔨 Built with

- AWS [CDK](https://aws.amazon.com/cdk/) and [SDK](https://aws.amazon.com/sdk-for-javascript/)
- [Docusaurus](https://docusaurus.io/)
- [esbuild](https://esbuild.github.io/)
- [GraphQL](https://graphql.org/) with [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
- [Prisma](https://www.prisma.io/)
- [Turborepo](https://turbo.build/repo/)
- [TypeScript](https://www.typescriptlang.org/)

## 📖 Documentation

Our documentation can be found [here](https://docs.icssc.club/anteaterapi).

## 🤝 Contributing

We welcome all open-source contributions! Please start by reading the [contributing guide](CONTRIBUTING.md).

## ✅ Getting Started

### Prerequisites

Node.js environment (server-side JavaScript runtime).

- [nvm (node-version-manager)](https://github.com/nvm-sh/nvm)
- [fnm (fast-node-manager)](https://github.com/Schniz/fnm)

[pnpm - performance node package manager](https://pnpm.io/installation#using-corepack)

This can be easily enabled via corepack once a Node.js environment has been installed.

```sh
corepack enable pnpm
```

[Docker](https://docs.docker.com/compose/install/)

Docker is used to run a PostgresSQL database instance locally for development.

Other JavaScript runtimes.

- [deno](https://docs.deno.com/runtime/manual/getting_started/installation)
- [bun](https://bun.sh/docs/installation)

### Developing

1. Clone the repository and change directory.

```sh
git clone https://github.com/icssc/peterportal-api-next
cd peterportal-api-next
```

2. Create a `.env` file. To get started, cloning the `.env.example` should work for now.

```sh
cp .env.example .env
```

3. Install dependencies.

```sh
pnpm install
```

4. Start local PostgresSQL database.

```sh
docker compose up -d
```

5. Start development server.

```sh
pnpm dev
```

Quick overview of getting started with development. Please view the official documentation for
additional details.

## ⚠️ Caveats

Please note that while our data is obtained directly from official UCI sources, such as the Catalogue, the Public Records Office, and the Registrar, this is not an official UCI tool. While we strive to keep our data as accurate as possible with the limited support we have from the University, errors can and do happen; please take this into consideration when using this API.

We appreciate any and all reports of erroneous information and will take action as quickly as possible. If while using this API you encounter any such errors or bugs, please open an issue [here](https://github.com/icssc/peterportal-api-next/issues/new).

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://d0.awsstatic.com/logos/powered-by-aws-white.png">
  <source media="(prefers-color-scheme: light)" srcset="https://d0.awsstatic.com/logos/powered-by-aws.png">
  <img alt="Powered by AWS Cloud Computing" src="https://d0.awsstatic.com/logos/powered-by-aws.
png">
</picture>
