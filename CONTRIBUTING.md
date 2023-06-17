# Contributing to PeterPortal API

Thank you for your interest in contributing to PeterPortal API!

## Setup

To begin, you'll need to set up your Node.js development environment. We recommend using the [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm), which is a painless way to ensure that you will always be using the correct version of Node.js. If you choose not to do so, however, please be aware that PeterPortal API uses the latest version of Node.js 16 (Gallium), and that code tested with other versions of Node.js may not work as expected during testing. The rest of this guide will assume that you will be using `nvm`.

After installing `nvm` per the instructions in its repository, execute the following command:

```shell
$ nvm install lts/gallium
```

This will install the correct version of Node.js (if it hasn't already been installed) and set it as the active version.

You'll also need `pnpm`, which is a fast and space-efficient alternative to `npm`. Its
installation instructions can be found [here](https://pnpm.io/installation). Once you have
`pnpm` installed, you'll be ready to roll!

## Getting Started

Start off by creating a fork of the repository. If you are a member of the ICSSC Projects Committee, you should instead create a new branch on the repository. Once you've cloned the repository or your fork, execute the following commands:

```shell
$ cd peterportal-api-next
$ nvm use
$ pnpm i
```

These commands will install the dependencies and perform any necessary setup tasks for you to start developing.

## Committing Changes

Once you've made some changes to the code using your favorite text editor or IDE, you'll want to commit your changes to your branch or fork. PeterPortal API uses a tool called [Commitizen](https://commitizen.github.io/cz-cli/), which helps you automatically format your commit message according to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

To use Commitizen, simply run the following command after staging your changes using `git add`:

```shell
$ pnpm commit
```

Note that due to limitations of the Commitizen tool, you must run this command in the root of the repository.

You can also write commit messages manually using `git commit`, which can be done anywhere in the repo, but do note that our system will reject any commit messages that don't meet the spec.

## Drafting and Testing

After you've committed and pushed your first changes, we recommend that you create a draft pull request. This will help others to keep track of your progress, and also allows for automated tests to be run on the parts of the code you're modifying, if applicable. The title of the pull request should also follow the Conventional Commits spec, as mentioned above.

Unless you are a Projects Committee member, some tests can only be run in this way. This is likely because these tests require access to the database, which is only available to members and the GitHub Actions automation system. We apologize in advance if this negatively impacts your developer experience, and are open to any suggestions for improving this aspect of the development process.

## Review Process

Once you've completed all the changes that you believe to be within scope of the current pull request, you can mark the pull request ready for review, at which point a member of Projects will review your changes.

If your first attempt isn't approved immediately, don't fret! Very few changes pass code review on the first try, and the review process helps you and us by ensuring that we write good code. Please respond to any requests for changes in a timely manner and re-request reviews when necessary.

Your changes will typically be merged shortly after getting approved, and the changes should be deployed soon after that. Congratulations on making your first contribution to PeterPortal API!

## Contact

Still lost after reading this guide? If you ever need help, please don't hesitate to ask around on our [Discord server](https://discord.gg/Zu8KZHERtJ).
