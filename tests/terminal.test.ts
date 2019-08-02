/* global define, it, describe */

import QSH from '../src/qsh';

// @ts-ignore
import mockIO from 'mock-stdio';

import spies from 'chai-spies';
import chai from 'chai';

const timeout = async function(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

const WAIT_MS = 200;

chai.use(spies);

describe('Terminal', function() {
    it('exit<enter> should call process.exit(0)', async () => {
        const sandbox = chai.spy.sandbox();
        sandbox.on(process, 'exit', chai.spy.returns(0));

        // mockIO.start();
        const qsh = new QSH();
        qsh.run();
        await timeout(WAIT_MS);
        process.stdin.emit('data', Buffer.from('exit\n'));

        // const result = mockIO.end();

        // console.log(result);
        await timeout(WAIT_MS);

        chai.expect(process.exit).to.have.been.called.with(0);
    });
});
