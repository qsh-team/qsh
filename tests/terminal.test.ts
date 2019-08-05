/* global define, it, describe */

import QSH from '../src/qsh';

import mocha from 'mocha';
import spies from 'chai-spies';
import colors from 'ansi-colors';
import chai from 'chai';
import { ENTER, TAB, BACKSPACE, CTRL_C } from '../src/components/const';

const timeout = async function(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

const WAIT_MS = 30;

chai.use(spies);

async function inputString(str: string) {
    for (let ch of str) {
        process.stdin.emit('data', Buffer.from(ch));
        await timeout(WAIT_MS);
    }
    await timeout(WAIT_MS);
}

async function inputAction(str: string) {
    process.stdin.emit('data', Buffer.from(str));
    await timeout(WAIT_MS);
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

        await inputString('exit');
        await inputAction(ENTER);

        // const result = mockIO.end();

        // console.log(result);

        chai.expect(cleanup).to.have.been.called();
    });

    it('basic autocomplete', async () => {
    // user input ls<SPACE>dock<TAB><ENTER>, will complete Dockerfile
    // so output will contains 'Dockerfile'

        await inputString('ls ');

        await inputString('docker');

        await inputAction(TAB);

        await inputAction(ENTER);

        chai.expect(buffer).contain('ls Dockerfile');
    });

    it('path autocomplete can resolve ./', async () => {
    // user input ls<SPACE>dock<TAB><ENTER>, will complete Dockerfile
    // so output will contains 'Dockerfile'

        await inputString('ls ');

        await inputString('./docker');

        await inputAction(TAB);

        await inputAction(ENTER);

        chai.expect(buffer).contain('ls ./Dockerfile');
    });

    it('process.stdin.removeListener should be called when autocomplete done', async () => {
    // user input ls<SPACE>dock<TAB><SPACE>, will complete Dockerfile
        await inputString('ls ');

        await inputString('docker');

        await inputAction(TAB);

        // space will let complete done, then completebox disappear
        // and stdio.removeListener should be called

        const removeListener = chai.spy.on(process.stdin, 'removeListener');

        await inputString(' ');

        chai.expect(removeListener).has.been.called();
    });

    it('Delete back can cancel complete', async () => {
    // user input ls<SPACE>, will display compelte list
        await inputString('ls ');

        // <BACKSPACE> now, then complete should be cancel

        await inputAction(BACKSPACE);

        await inputString('docker');
        await inputAction(TAB);

        chai.expect(buffer).not.contain('lsDockerfile');
    });

    it('But delete should not just break complete', async () => {
    // user input ls<SPACE>docker, will display compelte list
        await inputString('ls docker');

        // <BACKSPACE> now

        await inputAction(BACKSPACE);

        await inputString('r');
        await inputAction(TAB);
        await inputAction(' ');

        chai.expect(buffer).contain('ls Dockerfile');
    });

    it('Ctrl C will restart line', async () => {
    // user input ls<SPACE>, will display compelte list
        await inputString('ls ');

        // qsh._term._app is private
        // @ts-ignore
        const startLine = chai.spy.on(qsh._term._app, 'unmount');
        await inputAction(CTRL_C);

        chai.expect(startLine).has.been.called();
    });
});
