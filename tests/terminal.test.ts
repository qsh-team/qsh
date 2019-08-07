/* global define, it, describe */

import QSH from '../src/qsh';

import mocha from 'mocha';
import spies from 'chai-spies';
import colors from 'ansi-colors';
import chai from 'chai';
import shell from 'shelljs';
import fs from 'fs';
import {
    ENTER,
    TAB,
    BACKSPACE,
    CTRL_C,
    CTRL_A,
    ARROW_UP
} from '../src/components/const';
import path from 'path';
import { TextInput } from '../src/components/input';

const timeout = async function(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

const WAIT_MS = 10;

chai.use(spies);

async function inputString(str: string) {
    for (let ch of str) {
        process.stdin.emit('data', Buffer.from(ch));
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

    const cwd = process.cwd();
    const home = process.env.HOME || '/tmp';

    mocha.beforeEach(async () => {
    // papare a test env
        shell.rm('-rf', './test_env');
        shell.mkdir('-p', './test_env');
        shell.touch('./test_env/Dockerfile');
        shell.touch('./test_env/DocTestfile');

        // @ts-ignore
        global.__IS_TESTING__ = true;

        process.env.HOME = path.join('./test_env');
        shell.cd('./test_env');

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

        process.env.HOME = home;
        shell.cd(cwd);
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

        // @ts-ignore
        // eslint-disable-next-line
    const complete = chai.spy.on(TextInput.prototype, "completeValue");
        // <BACKSPACE> now

        await inputAction(BACKSPACE);

        await inputString('r');
        await inputAction(TAB);
        await inputAction(' ');

        chai.expect(complete).has.been.called.with('Dockerfile');
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

    it('UP get history', async () => {
        await inputString('ls');
        await inputAction(ENTER);
        await timeout(WAIT_MS);

        // <ARROW_UP> now, get history

        if (qsh._for_test_only_do_not_ues.inputComponent) {
            const replace = chai.spy.on(TextInput.prototype, 'replaceValue');
            // <BACKSPACE> now

            await inputAction(ARROW_UP);

            chai.expect(replace).has.been.called.with('ls');
            chai
                .expect(qsh._for_test_only_do_not_ues.inputComponent &&
            qsh._for_test_only_do_not_ues.inputComponent.state.cursorOffset)
                .to.equals('ls'.length);
        }
    });

    it('History hinting after complete must be right', async () => {
    // make a history
        await inputString('ls DockerTestFile');
        await inputAction(ENTER);

        // input another
        shell.rm('Dockerfile');
        await inputString('ls d');
        await inputAction(TAB);

        const hinting =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.state.hinting;

        const value =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.props.value;

        await timeout(WAIT_MS);
        if (hinting) {
            chai
                .expect(qsh.history.indexOf((value || '') + hinting))
                .to.not.equal(-1);
        }
    });

    it('Ctrl-a should move cursor to line begin and reset complete', async () => {
        await inputString('ls DockerTestFile');
        await inputAction(CTRL_A);

        const cursor =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.state.cursorOffset;

        await timeout(WAIT_MS);
        chai.expect(cursor).to.equal(0);

        const completes =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.state.completes;

        chai.expect(completes && completes.length).to.equal(0);

        const completeTriggered =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.state.completeTriggered;

        chai.expect(completeTriggered).to.equal(0);
    });

    it('History hinting after complete must be right', async () => {
    // make a history
        await inputString('ls DockerTestFile');
        await inputAction(ENTER);

        // input another
        shell.rm('Dockerfile');
        await inputString('ls d');
        await inputAction(TAB);

        const hinting =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.state.hinting;

        const value =
      qsh._for_test_only_do_not_ues.inputComponent &&
      qsh._for_test_only_do_not_ues.inputComponent.props.value;

        await timeout(WAIT_MS);
        if (hinting) {
            chai
                .expect(qsh.history.indexOf((value || '') + hinting))
                .to.not.equal(-1);
        }
    });

    it('Redirect output to file', async () => {
        await inputString('echo test > test.txt');
        await inputAction(ENTER);

        await timeout(WAIT_MS);

        const outputFile = path.resolve('./test.txt');
        chai.expect(fs.existsSync(outputFile)).to.equal(true);
        chai.expect(fs.readFileSync(outputFile, 'utf-8')).to.equal('test\n');
    });

    it('SIGINT should break command, but not qsh', async () => {
        await inputString('ping www.baidu.com');
        await inputAction(ENTER);

        // qsh._term._app is private
        // @ts-ignore
        const unmountLine = chai.spy.on(qsh._term._app, 'unmount');
        // SIGINT self
        process.kill(process.pid, 'SIGINT');

        await timeout(WAIT_MS);

        chai.expect(unmountLine).has.been.called();
    });

    it('dest dir can be complete', async () => {
        shell.mkdir('-p', './dira/dirb/dirc');
        shell.touch('./dira/dirb/dirc/testfile');

        await inputString('ls ./dira/dirb/dirc/test');
        await inputAction(TAB);
        await inputAction(ENTER);


        chai.expect(buffer).contain('ls ./dira/dirb/dirc/testfile');
    });
});
