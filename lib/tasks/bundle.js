const path = require('path');
const del = require('del');
const execa = require('execa');

const { bash, script } = require('../helpers/cli');
const { getConfig } = require('../git');
const { getExternalFiles } = require('../config');
const { debug } = require('../helpers/log')('proton-bundler');

function main({
    argv,
    config: { appMode, isRemoteBuild, PKG },
    hookPreTasks,
    customConfigSetup,
    hookPostTaskBuild,
    hookPostTasks
}) {
    const configTasks = customConfigSetup.length
        ? customConfigSetup
        : [
              {
                  title: 'Setup app config',
                  task() {
                      return bash('npx proton-pack', process.argv.slice(2));
                  }
              }
          ];

    return [
        ...hookPreTasks,
        {
            title: 'Clear previous dist',
            async task() {
                await del(['dist', 'distCurrent', 'distback'], { dryRun: false });
                await bash('mkdir dist');
            }
        },
        {
            title: 'Lint sources',
            enabled: () => argv.lint !== false && !isRemoteBuild,
            task: () => execa('npm', ['run', 'lint'])
        },
        ...configTasks,
        {
            title: 'Extract git env for the bundle',
            async task(ctx) {
                const { commit, branch, tag } = await getConfig();
                ctx.originCommit = commit;
                ctx.originBranch = branch;
                ctx.tag = tag;
                debug(ctx, 'git env bundle');
            }
        },
        {
            title: 'Copy some files',
            task() {
                const externalFiles = getExternalFiles();
                const rule = externalFiles.length > 1 ? `{${externalFiles.join(',')}}` : externalFiles.join(',');
                return bash(`cp src/${rule} dist/`);
            }
        },
        {
            title: 'Build the application',
            async task(ctx = {}) {
                const args = process.argv.slice(2);
                if (appMode === 'standalone') {
                    const output = await bash('npm', ['run', 'build:standalone', '--', ...args]);
                    ctx.outputBuild = output;
                    return true;
                }

                const output = await bash('npm', ['run', 'build', '--', ...args]);
                ctx.outputBuild = output;
                return true;
            }
        },
        {
            title: 'Check the build output content',
            // Extract stdout from the output as webpack can throw error and still use stdout + exit code 0
            async task(ctx = {}) {
                await script('validateBuild.sh');
                delete ctx.outputBuild; // clean as we won't need it anymore
            }
        },
        ...hookPostTaskBuild,
        {
            title: 'Generate the version info',
            task(ctx) {
                const { tag = `v${PKG.version}`, originCommit, originBranch } = ctx || {};
                const fileName = path.join('dist', 'assets/version.json');
                const version = PKG['version-beta'] || tag; // custom version for v4

                const args = [
                    `--tag ${version}`,
                    `--commit ${originCommit}`,
                    `--branch ${originBranch}`,
                    `--output ${fileName}`,
                    '--debug'
                ];

                return script('createVersionJSON.sh', args);
            }
        },
        ...hookPostTasks
    ];
}

module.exports = main;
