/* global define, it, describe */

import QSH from '../src/qsh';

import mocha from 'mocha';
import spies from 'chai-spies';
import colors from 'ansi-colors';
import chai from 'chai';
import { ENTER, TAB, BACKSPACE } from '../src/components/const';

const timeout = async function(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

const WAIT_MS = 30;

chai.use(spies);

function inputString(str: string) {
    for (let ch of str) {
        process.stdin.emit('data', Buffer.from(ch));
    }
}

function inputAction(str: string) {
    process.stdin.emit('data', Buffer.from(str));
}

describe('QSH', () => {
    let buffer = '';
    // @ts-ignore
    const stdoutWrite = process.stdout.write;
    let qsh: QSH;

    mocha.beforeEach(async () => {
        // @ts-ignore
        process.stdout.write = (data: string) => {
            buffer += data;
            stdoutWrite.call(process.stdout, data);
        };
        buffer = '';

        qsh = new QSH();
        qsh.run();
        await timeout(WAIT_MS);

    });

    mocha.afterEach(() => {
        qsh.shutdown();

        // @ts-ignore
        // eslint-disable-next-line
    process.stdout.write = stdoutWrite;
    });

    it('exit<enter> should call QSH.cleanup', async () => {
        const cleanup = chai.spy.on(qsh, 'cleanup');

        inputString('exit');
        inputAction(ENTER);

        // const result = mockIO.end();

        // console.log(result);
        await timeout(WAIT_MS);

        chai.expect(cleanup).to.have.been.called();
    });

    it('basic autocomplete', async () => {

        // user input ls<SPACE>dock<TAB><ENTER>, will complete Dockerfile
        // so output will contains 'Dockerfile'


        inputString('ls ');
        await timeout(WAIT_MS);

        inputString('docker');
        await timeout(WAIT_MS);

        inputAction(TAB);
        await timeout(WAIT_MS);

        inputAction(ENTER);
        await timeout(WAIT_MS);

        chai.expect(buffer).contain('ls Dockerfile');

    });

    it('process.stdin.removeListener should be called when autocomplete done', async () => {
    // user input ls<SPACE>dock<TAB><SPACE>, will complete Dockerfile
        inputString('ls ');
        await timeout(WAIT_MS);

        inputString('docker');
        await timeout(WAIT_MS);

        inputAction(TAB);
        await timeout(WAIT_MS);

        // space will let complete done, then completebox disappear
        // and stdio.removeListener should be called

        const removeListener = chai.spy.on(process.stdin, 'removeListener');

        inputString(' ');
        await timeout(WAIT_MS);

        chai.expect(removeListener).has.been.called();

    });


    it('Delete word can cancel complete', async () => {

        // user input ls<SPACE>, will display compelte list
        inputString('ls ');
        await timeout(WAIT_MS);

        // containes Dockerfile for now
        chai.expect(buffer).contain('Dockerfile');

        // <BACKSPACE> now, then complete should be cancel
        buffer = '';

        inputAction(BACKSPACE);
        await timeout(WAIT_MS);

        inputString('docker');
        await timeout(WAIT_MS);
        inputAction(TAB);

        chai.expect(colors.unstyle(buffer)).not.contain('lsDockerfile');
    });
});
