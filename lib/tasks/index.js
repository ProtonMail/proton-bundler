const { getHooks } = require('../config');
const bundleProcess = require('./bundle');
const deployProcess = require('./deploy');

function getTasks({
    PKG,
    argv,
    config: { isCI, branch, flowType = 'single', appMode, isRemoteBuild, featureFlags, isDeployGit }
}) {
    const { getCustomHooks, customTasks } = getHooks();
    const { hookPreTasks, hookPostTasks, hookPostTaskClone, hookPostTaskBuild, customConfigSetup } = getCustomHooks(
        customTasks({
            branch,
            isCI,
            flowType,
            appMode,
            isRemoteBuild,
            featureFlags
        })
    );

    const list = bundleProcess({
        argv,
        config: {
            appMode,
            isRemoteBuild,
            PKG
        },
        customConfigSetup,
        hookPreTasks,
        hookPostTaskBuild,
        hookPostTasks
    });

    if (isDeployGit) {
        return list.concat(deployProcess({ branch, argv, hookPostTaskClone }));
    }

    return list;
}

module.exports = getTasks;
