const os = require('os');
const path = require('path');
const del = require('del');
const execa = require('execa');

const { bash, script } = require('../helpers/cli');
const { getConfig } = require('../git');
const { getExternalFiles } = require('../config');
const { debug, info, warn } = require('../helpers/log')('proton-bundler');

async function getSRI(type = 'prod') {
    const { stdout = '' } = await script(`manageSRI.sh get-${type}`);
    debug(stdout, `sri for ${type}`);
    return JSON.parse(stdout);
}

async function getNewConfig(flags = process.argv.slice(3)) {
    warn('remove NODE_ENV=production as it should come from something else');
    const { stdout = '' } = await bash('NODE_ENV=production npx proton-pack print-config', flags);
    return JSON.parse(stdout);
}

function sed(rule, files) {
    // Because for the lulz. cf https://myshittycode.com/2014/07/24/os-x-sed-extra-characters-at-the-end-of-l-command-error/
    if (os.platform() === 'darwin') {
        return bash(`sed -i '' '${rule}' $(${files})`);
    }
    return bash(`sed -i '${rule}' "$(${files})"`);
}

async function main() {
    warn('move to +proxy when we bundle so we do not need to change the API');

    // await bash('rm -rf distProd || true && cp -r dist-b distProd'); // only dev
    // await bash('cp -r dist distProd'); // Final version
    info('made a copy of the current dist');

    const {
        sentry: { dsn: currentSentryDSN },
        secureUrl: currentSecureURL
    } = await getNewConfig(['--api prod+proxy']);
    const {
        apiUrl,
        sentry: { dsn: newSentryDSN },
        secureUrl: newSecureURL
    } = await getNewConfig();

    await sed(`s#="/api"#="${apiUrl}"#;`, "find dist -type f  -name 'index*.js'");
    info(`replace current api by ${apiUrl} inside the main index`);

    await sed(`s#="${currentSentryDSN}"#="${newSentryDSN}"#;`, "find dist -type f  -name 'index*.js'");
    info(`replace sentry config inside the main index`);

    await sed(`s#="${currentSecureURL}"#="${newSecureURL}"#;`, "find dist -type f  -name 'index*.js'");
    info(`replace secureURL config inside the main index`);

    // const prodSRI = await getSRI();
    // const newSRI = await getSRI('new');
    info('extract config for SRI prod + new');

    const { stdout } = await script(`manageSRI.sh write-html`);
    console.log(stdout);
    info('update new index.html');
}

module.exports = main;
