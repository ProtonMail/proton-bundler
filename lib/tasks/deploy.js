const { bash, script } = require('../helpers/cli');
const { pull, push } = require('../git');

function main({ branch, argv, hookPostTaskClone }) {
    const list = [
        {
            title: 'Check if the deploy branch exists',
            skip() {
                if (!(process.env.QA_BRANCHES || '').length) {
                    return 'If you do not have QA_BRANCHES inside your .env you cannot deploy to something new';
                }

                if (`deploy-${process.env.QA_BRANCH}` === branch) {
                    return '🤖 No need to check for this branch, it exists';
                }

                const branches = process.env.QA_BRANCHES.split(',').join('|');
                // Do not try to deploy on QA or cobalt
                if (new RegExp(`^deploy-(cobalt|${branches})$`).test(branch)) {
                    return '✋ You shall not deploy to QA';
                }
            },
            enabled: () => !/dev|beta|prod|tor|old/.test(branch),
            async task() {
                // For the CI to force SSH
                if (process.env.GIT_REMOTE_URL_CI && argv.fromCi) {
                    await bash(`git remote set-url origin ${process.env.GIT_REMOTE_URL_CI}`);
                }
                return script('createNewDeployBranch.sh', ['--check', branch.replace('deploy-', '')], 'inherit');
            }
        },
        {
            title: `Pull dist branch ${branch}`,
            task: () => pull(branch, argv.forceFetch, argv.fromCi)
        },
        ...hookPostTaskClone,
        {
            title: `Push dist to ${branch}`,
            task: (ctx) => push(branch, ctx)
        }
    ];

    return list;
}

module.exports = main;
