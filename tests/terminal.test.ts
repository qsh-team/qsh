/* global define, it, describe */

import QSH from '../src/qsh';

// @ts-ignore
import mockIO from 'mock-stdio';

import spies from 'chai-spies';
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

describe('Terminal', () => {
    it('exit<enter> should call QSH.cleanup', async () => {
        const qsh = new QSH();

        const cleanup = chai.spy.on(qsh, 'cleanup');

        qsh.run();
        await timeout(WAIT_MS);

        inputString('exit');
        inputAction(ENTER);

        // const result = mockIO.end();

        // console.log(result);
        await timeout(WAIT_MS);

        chai.expect(cleanup).to.have.been.called();
    });
});

describe('AutoComplete', () => {
    it('basic autocomplete', async () => {
    // @ts-ignore
        const stdoutWrite = process.stdout.write;

        let buffer = '';
        // @ts-ignore
        process.stdout.write = (data: string) => {
            buffer += data;
            stdoutWrite.call(process.stdout, data);
        };

        // user input ls<SPACE>dock<TAB><ENTER>, will complete Dockerfile
        // so output will contains 'Dockerfile'
        const qsh = new QSH();
        qsh.run();
        await timeout(WAIT_MS);

        inputString('ls ');
        await timeout(WAIT_MS);

        inputString('docker');
        await timeout(WAIT_MS);

        inputAction(TAB);
        await timeout(WAIT_MS);

        inputAction(ENTER);
        await timeout(WAIT_MS);

        qsh.shutdown();

        // @ts-ignore
        // eslint-disable-next-line
    process.stdout.write = stdoutWrite;
        chai.expect(buffer).contain('ls Dockerfile');
    });

    it('process.stdin.removeListener should be called when autocomplete done', async () => {
    // user input ls<SPACE>dock<TAB><SPACE>, will complete Dockerfile
        const qsh = new QSH();
        qsh.run();
        await timeout(WAIT_MS);

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

        setTimeout(() => {
            qsh.shutdown();
        }, 0);
    });

    it('Leave autocomplete can be back', async () => {
    // @ts-ignore
        const stdoutWrite = process.stdout.write;

        let buffer = '';

        // @ts-ignore
        process.stdout.write = (data: string) => {
            buffer += data;
            stdoutWrite.call(process.stdout, data);
        };

        // user input ls<SPACE>dock<TAB>, will complete Dockerfile
        const qsh = new QSH();
        qsh.run();
        await timeout(WAIT_MS);

        inputString('ls ');
        await timeout(WAIT_MS);

        inputString('docker');
        await timeout(WAIT_MS);

        inputAction(TAB);
        await timeout(WAIT_MS);

        // ls Dockerfile now
        // then <BACKSPACE><BACKSPACE><TAB><ENTER>
        // output should also has 'Dockerfile'

        // starting stdout listen after that
        // because you can not real `delete` string, just output contoll word

        inputAction(BACKSPACE);
        inputAction(BACKSPACE);
        await timeout(WAIT_MS);

        inputAction(TAB);

        await timeout(WAIT_MS);
        inputString(' ');
        inputString('test');
        qsh.shutdown();

        // @ts-ignore
        // eslint-disable-next-line
    process.stdout.write = stdoutWrite;

        // must be `Dockerfile test`, because `Dockerfile` could be controll word in complelte menu
        // and `ls Dockerfile` not works here, because `ls` is already on screen
        chai.expect(buffer).contain('Dockerfile test');
    });
});
