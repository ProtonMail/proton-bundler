const https = require('https');
const dedent = require('dedent');
const { error, success, debug, warn } = require('./log')('proton-bundler');
const { bash } = require('./cli');

async function send(data, { env, mode = 'deploy', api }) {
    const requests = {
        deploy() {
            if (!process.env.DEPLOY_MESSAGES_HOOK) {
                return { warning: 'No deploy hook available' };
            }

            const { pathname, host } = new URL(process.env.DEPLOY_MESSAGES_HOOK);
            return { pathname, host, text: dedent`${data}`, url: process.env.DEPLOY_MESSAGES_HOOK };
        },
        changelog() {
            if (!process.env.CHANGELOG_QA_HOOK) {
                return { warning: 'No changelog hook available' };
            }

            const { pathname, host } = new URL(process.env.CHANGELOG_QA_HOOK);
            const scope = env === 'dev' ? `_available in a few minutes on ${env}_` : `_available on ${env}_`;
            const apiRow = api ? `API: *${api}*` : '';
            const text = dedent`
                ${scope}
                ${apiRow}

                ${data}
            `.trim();
            return { pathname, host, text, url: process.env.CHANGELOG_QA_HOOK };
        }
    };

    try {
        const { text, pathname, host, warning, url } = requests[mode]();

        if (warning) {
            return warn(warning);
        }

        debug(text, 'body message');

        const body = JSON.stringify({
            mrkdwn: true,
            text
        });

        await bash(`curl -X POST -H 'Content-type: application/json' --data ${body} ${url}`);
        success('Message sent !');
        // const req = https.request(
        //     {
        //         host: 'proxy',
        //         port: 443,
        //         path: pathname,
        //         method: 'POST',
        //         headers: {
        //             host,
        //             'Content-Type': 'application/json',
        //             'Content-Length': Buffer.byteLength(body, 'utf8')
        //         }
        //     },
        //     (res) => {
        //         debug(res.statusCode);

        //         res.on('data', (d) => {
        //             process.stdout.write(d);
        //         });

        //         if (res.statusCode === 200) {
        //             success('Message sent !');
        //         }
        //     }
        // );

        // req.on('error', (e) => {
        //     console.error(e);
        //     throw e;
        // });
        // req.write(body);
        // req.end();
    } catch (e) {
        error(e);
    }
}

module.exports = { send };
