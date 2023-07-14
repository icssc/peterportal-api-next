---
pagination_prev: null
pagination_next: null
---

# Getting Started

Welcome to the **Contributor's Guide** for PeterPortal API. This part of the documentation covers how to contribute to the project, as well as some technical details that may aid you in your journey in doing so.

If you're a developer who's interested in using PeterPortal API in your next project, welcome! We've got you covered in the Developer's Guide [here](/docs/developers-guide/getting-started).

## Setting up your development environment

To begin, you'll need to install the correct version of Node.js. We recommend using the [Node Version Manager (`nvm`)](https://github.com/nvm-sh/nvm), which is a painless way to ensure that you will always be using the correct version of Node.js.

As of the time of writing, PeterPortal API targets the latest version of Node.js 18 (Hydrogen). If you choose not to use `nvm`, please be aware that code tested with other versions of Node.js may not work as expected during our testing and deployment procedures. The rest of this guide will assume that you will be using `nvm`.

After installing nvm per the instructions in its repository, execute the following command:

```shell
nvm install lts/gallium
```

This will install the correct version of Node.js (if it hasn't already been installed) and set it as the active version.

You'll also need `pnpm`, which is a fast and space-efficient alternative to `npm`. Its installation instructions can be found [here](https://pnpm.io/installation). Once you have `pnpm` installed, you're ready to roll!

## Forking/branching and cloning

If you are an external contributor, start off by creating a fork of the repository. If you are a member of the ICSSC Projects Committee, you should instead create a new branch on the repository.

Either way, once you've cloned the repository or your fork, you should execute the following commands:

```shell
cd peterportal-api-next
nvm use
pnpm i
```

These commands will install the dependencies and perform any necessary setup tasks for you to start developing.

If you're a returning contributor, it's a good idea to synchronize your fork and/or your local repository with the main repository before starting any development work. This ensures that your changes will be built on the latest version of the code.

## Committing your changes

Once you've made some changes to the code using your favorite text editor or IDE, you'll want to commit your changes to your branch or fork. PeterPortal API uses a tool called [Commitizen](https://commitizen.github.io/cz-cli/), which helps you automatically format your commit message according to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

To use Commitizen, simply run the following command after staging your changes using `git add`:

```shell
pnpm -w commit
```

You can also write commit messages manually using `git commit`, but do note that our system will reject any commit messages that don't meet the spec.

## Drafting and testing

After you've committed and pushed your first changes, we recommend that you create a draft pull request. This will help others to keep track of your progress, and also allows for your code to be deployed to staging if you so choose. The title of the pull request should also follow the Conventional Commits spec, as mentioned above.

## Review process

Once you've completed all the changes that you believe to be within scope of the current pull request, you can mark the pull request ready for review, at which point a member of Projects will review your changes.

If your first attempt isn't approved immediately, don't fret! Very few changes pass code review on the first try, and the review process helps you and us by ensuring that we write good code. Please respond to any requests for changes in a timely manner and re-request reviews when necessary.

Your changes will typically be merged shortly after getting approved, and the changes should be deployed soon after that. Congratulations on making your first contribution to PeterPortal API!

## Contact us

Still lost after reading this guide? If you ever need help, please don't hesitate to ask around on our Discord server.

If you'd like to learn more about the technical details of PeterPortal API, feel free to read on!
