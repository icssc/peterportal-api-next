import cxapi from "@aws-cdk/cx-api";
import { SdkProvider } from "aws-cdk/lib/api/aws-auth/index.js";
import { StackSelector } from "aws-cdk/lib/api/cxapp/cloud-assembly.js";
import { CloudExecutable } from "aws-cdk/lib/api/cxapp/cloud-executable.js";
import { execProgram } from "aws-cdk/lib/api/cxapp/exec.js";
import { Deployments } from "aws-cdk/lib/api/deployments.js";
import { HotswapMode } from "aws-cdk/lib/api/hotswap/common.js";
import { DeploymentMethod } from "aws-cdk/lib/api/index.js";
import { ToolkitInfo } from "aws-cdk/lib/api/toolkit-info.js";
import { ILock } from "aws-cdk/lib/api/util/rwlock.js";
import { realHandler as context } from "aws-cdk/lib/commands/context.js";
import { realHandler as docs } from "aws-cdk/lib/commands/docs.js";
import { realHandler as doctor } from "aws-cdk/lib/commands/doctor.js";
import { debug, setLogLevel, setCI } from "aws-cdk/lib/logging.js";
import { Command, Configuration } from "aws-cdk/lib/settings.js";
import { enableTracing } from "aws-cdk/lib/util/tracing.js";
import * as version from "aws-cdk/lib/version.js";
import chalk from "chalk";

import { CdkToolkit, AssetBuildTime } from "./cdk-toolkit.js";

if (!process.stdout.isTTY) {
  // Disable chalk color highlighting
  process.env.FORCE_COLOR = "0";
}

export async function createCliCommands() {
  const argv: any = {};

  if (argv.verbose) {
    setLogLevel(argv.verbose);

    if (argv.verbose > 2) {
      enableTracing(true);
    }
  }

  if (argv.ci) {
    setCI(true);
  }

  debug("CDK toolkit version:", version.DISPLAY_VERSION);
  debug("Command line arguments:", argv);

  const configuration = new Configuration({
    commandLineArguments: {
      ...argv,
      _: argv._ as [Command, ...string[]], // TypeScript at its best
    },
  });

  await configuration.load();

  const sdkProvider = await SdkProvider.withAwsCliCompatibleDefaults({
    profile: configuration.settings.get(["profile"]),
    ec2creds: argv.ec2creds,
    httpOptions: {
      proxyAddress: argv.proxy,
      caBundlePath: argv["ca-bundle-path"],
    },
  });

  const cloudFormation = new Deployments({ sdkProvider });

  let outDirLock: ILock | undefined;

  const cloudExecutable = new CloudExecutable({
    configuration,
    sdkProvider,
    synthesizer: async (aws, config) => {
      // Invoke 'execProgram', and copy the lock for the directory in the global
      // variable here. It will be released when the CLI exits. Locks are not re-entrant
      // so release it if we have to synthesize more than once (because of context lookups).
      await outDirLock?.release();
      const { assembly, lock } = await execProgram(aws, config);
      outDirLock = lock;
      return assembly;
    },
  });

  // Bundle up global objects so the commands have access to them
  const commandOptions = { args: argv, configuration, aws: sdkProvider };

  const toolkitStackName: string = ToolkitInfo.determineName(
    configuration.settings.get(["toolkitStackName"])
  );

  debug(`Toolkit stack: ${chalk.bold(toolkitStackName)}`);

  if (argv.all && argv.STACKS) {
    throw new Error("You must either specify a list of Stacks or the `--all` argument");
  }

  const selector: StackSelector = {
    allTopLevel: argv.all,
    patterns: argv.STACKS,
  };

  const cli = new CdkToolkit({
    cloudExecutable,
    deployments: cloudFormation,
    verbose: argv.trace || argv.verbose > 0,
    ignoreErrors: argv["ignore-errors"],
    strict: argv.strict,
    configuration,
    sdkProvider,
  });

  return {
    context: async () => {
      const result = await context(commandOptions);

      await outDirLock?.release();

      return result;
    },
    docs: async () => {
      const result = await docs(commandOptions);

      await outDirLock?.release();

      return result;
    },
    doctor: async () => {
      const result = await doctor(commandOptions);

      await outDirLock?.release();

      return result;
    },
    list: async () => {
      const result = await cli.list(argv.STACKS, { long: argv.long, json: argv.json });

      await outDirLock?.release();

      return result;
    },
    diff: async () => {
      const enableDiffNoFail = isFeatureEnabled(configuration, cxapi.ENABLE_DIFF_NO_FAIL_CONTEXT);

      const result = await cli.diff({
        stackNames: argv.STACKS,
        exclusively: argv.exclusively,
        templatePath: argv.template,
        strict: argv.strict,
        contextLines: argv.contextLines,
        securityOnly: argv.securityOnly,
        fail: argv.fail != null ? argv.fail : !enableDiffNoFail,
        stream: argv.ci ? process.stdout : undefined,
        compareAgainstProcessedTemplate: argv.processed,
      });

      await outDirLock?.release();

      return result;
    },
    deploy: async () => {
      const parameterMap: { [name: string]: string | undefined } = {};

      for (const parameter of argv.parameters) {
        if (typeof parameter === "string") {
          const keyValue = (parameter as string).split("=");
          parameterMap[keyValue[0]] = keyValue.slice(1).join("=");
        }
      }

      if (argv.execute !== undefined && argv.method !== undefined) {
        throw new Error("Can not supply both --[no-]execute and --method at the same time");
      }

      let deploymentMethod: DeploymentMethod | undefined;

      switch (argv.method) {
        case "direct": {
          if (argv.changeSetName) {
            throw new Error("--change-set-name cannot be used with method=direct");
          }
          deploymentMethod = { method: "direct" };
          break;
        }

        case "change-set": {
          deploymentMethod = {
            method: "change-set",
            execute: true,
            changeSetName: argv.changeSetName,
          };
          break;
        }

        case "prepare-change-set": {
          deploymentMethod = {
            method: "change-set",
            execute: false,
            changeSetName: argv.changeSetName,
          };
          break;
        }

        case undefined: {
          deploymentMethod = {
            method: "change-set",
            execute: argv.execute ?? true,
            changeSetName: argv.changeSetName,
          };
          break;
        }
      }

      const result = await cli.deploy({
        selector,
        exclusively: argv.exclusively,
        toolkitStackName,
        roleArn: argv.roleArn,
        notificationArns: argv.notificationArns,
        requireApproval: configuration.settings.get(["requireApproval"]),
        reuseAssets: argv["build-exclude"],
        tags: configuration.settings.get(["tags"]),
        deploymentMethod,
        force: argv.force,
        parameters: parameterMap,
        usePreviousParameters: argv["previous-parameters"],
        outputsFile: configuration.settings.get(["outputsFile"]),
        progress: configuration.settings.get(["progress"]),
        ci: argv.ci,
        rollback: configuration.settings.get(["rollback"]),
        hotswap: determineHotswapMode(argv.hotswap, argv.hotswapFallback),
        watch: argv.watch,
        traceLogs: argv.logs,
        concurrency: argv.concurrency,
        assetParallelism: configuration.settings.get(["assetParallelism"]),
        assetBuildTime: configuration.settings.get(["assetPrebuild"])
          ? AssetBuildTime.ALL_BEFORE_DEPLOY
          : AssetBuildTime.JUST_IN_TIME,
      });

      await outDirLock?.release();

      return result;
    },
    import: async () => {
      const result = await cli.import({
        selector,
        toolkitStackName,
        roleArn: argv.roleArn,
        deploymentMethod: {
          method: "change-set",
          execute: argv.execute,
          changeSetName: argv.changeSetName,
        },
        progress: configuration.settings.get(["progress"]),
        rollback: configuration.settings.get(["rollback"]),
        recordResourceMapping: argv["record-resource-mapping"],
        resourceMappingFile: argv["resource-mapping"],
        force: argv.force,
      });

      await outDirLock?.release();

      return result;
    },
    watch: async () => {
      const result = await cli.watch({
        selector,
        // parameters: parameterMap,
        // usePreviousParameters: args['previous-parameters'],
        // outputsFile: configuration.settings.get(['outputsFile']),
        // requireApproval: configuration.settings.get(['requireApproval']),
        // notificationArns: args.notificationArns,
        exclusively: argv.exclusively,
        toolkitStackName,
        roleArn: argv.roleArn,
        reuseAssets: argv["build-exclude"],
        deploymentMethod: {
          method: "change-set",
          changeSetName: argv.changeSetName,
        },
        force: argv.force,
        progress: configuration.settings.get(["progress"]),
        rollback: configuration.settings.get(["rollback"]),
        hotswap: determineHotswapMode(argv.hotswap, argv.hotswapFallback, true),
        traceLogs: argv.logs,
        concurrency: argv.concurrency,
      });

      await outDirLock?.release();

      return result;
    },
    destroy: async () => {
      const result = await cli.destroy({
        selector,
        exclusively: argv.exclusively,
        force: argv.force,
        roleArn: argv.roleArn,
        ci: argv.ci,
      });

      await outDirLock?.release();

      return result;
    },
    synthesize: async () => {
      const quiet = configuration.settings.get(["quiet"]) ?? argv.quiet;

      const result = argv.exclusively
        ? await cli.synth(argv.STACKS, argv.exclusively, quiet, argv.validation, argv.json)
        : await cli.synth(argv.STACKS, true, quiet, argv.validation, argv.json);

      await outDirLock?.release();

      return result;
    },
  };
}

function isFeatureEnabled(configuration: Configuration, featureFlag: string) {
  return configuration.context.get(featureFlag) ?? cxapi.futureFlagDefault(featureFlag);
}

function determineHotswapMode(
  hotswap?: boolean,
  hotswapFallback?: boolean,
  watch?: boolean
): HotswapMode {
  if (hotswap && hotswapFallback) {
    throw new Error("Can not supply both --hotswap and --hotswap-fallback at the same time");
  } else if (!hotswap && !hotswapFallback) {
    if (hotswap === undefined && hotswapFallback === undefined) {
      return watch ? HotswapMode.HOTSWAP_ONLY : HotswapMode.FULL_DEPLOYMENT;
    } else if (hotswap === false || hotswapFallback === false) {
      return HotswapMode.FULL_DEPLOYMENT;
    }
  }

  let hotswapMode: HotswapMode;

  if (hotswap) {
    hotswapMode = HotswapMode.HOTSWAP_ONLY;
  } /*if (hotswapFallback)*/ else {
    hotswapMode = HotswapMode.FALL_BACK;
  }

  return hotswapMode;
}
