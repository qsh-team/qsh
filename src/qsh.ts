import Term from './term';

import exitHook from 'exit-hook';

import fs from 'fs';

import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

// @ts-ignore
import ppath from '@expo/ppath';

// @ts-ignore
import fixPath from 'fix-path';

import { QSH_ROOT_DIR, QSH_HISTORY_FILE } from './const';
import initBuiltin from './builtin/index';

import colors from 'ansi-colors';
// @ts-ignore
import branchName from 'branch-name';
import execCommand from './command';
import CompleteEngine from './complete-engine';
import { initCompleteBackends } from './complete-backends';

export interface QSHEvent {
    init: () => void;
    exec: (command: string) => void;
    input: (inputString: string) => void;
    // 'get-complete-done': (completeList: IAutoComplete[]) => void;
    exit: () => void;
}

interface CommandMap {
    [name: string]: (name: string, args: string[]) => Promise<void>;
}
export default class QSH {
    public event: TypedEmitter<QSHEvent> = new EventEmitter() as TypedEmitter<
    QSHEvent
    >;
    public history: string[] = [];
    public completeEngine: CompleteEngine = new CompleteEngine();

    public commands: CommandMap = {};
    public options = {
        promopt: (callback: (str: string) => void) => {
            // callback(colors.green('ҩ~ '));
            // try {
            //   const name = await branchName.get();
            //   callback(colors.green(`ҩ${colors.blue('[' + name + ']')}~ `));
            // } catch (e) {}

            // const gen = () => colors.green(`ҩ ${ppath(process.cwd())} [${new Date().toLocaleTimeString()}] > `);
            const gen = () => colors.green(`ҩ ${ppath(process.cwd())} > `);
            callback(gen());
            const timer = setInterval(() => {
                callback(gen());
            }, 1000);

            return function cleanup() {
                clearInterval(timer);
            };
        },
        historyLength: 5000
    };

    private _keepRunning: boolean = true;
    private _term?: Term;

    public run() {
        this.init();
    }

    public registerCommand(
        commandName: string,
        func: (commandName: string, args: string[]) => Promise<void>
    ) {
        this.commands[commandName] = func;
    }

    public shutdown() {
        this._keepRunning = false;
        this.cleanup();
    }

    private async initHome() {
        // const unlock = await lock();
        if (!fs.existsSync(QSH_ROOT_DIR)) {
            fs.mkdirSync(QSH_ROOT_DIR);
        }
    }

    private async init() {
        fixPath();
        await this.initHome();

        initBuiltin(this);
        this.initHistory();
        exitHook(() => {
            this.saveHistory();
        });
        this.event.on('exit', () => {
            this._keepRunning = false;
        });

        this.event.emit('init');

        initCompleteBackends(this, this.completeEngine);
        this.startLoop();
    }

    private initHistory() {
        let content = '';
        try {
            content = fs.readFileSync(QSH_HISTORY_FILE, 'utf-8');
        } catch (e) {}
        this.history = content.split('\n');
    }

    private saveHistory() {
        fs.writeFileSync(
            QSH_HISTORY_FILE,
            this.history.slice(0, this.options.historyLength).join('\n'),
            'utf-8'
        );
    }

    private cleanup() {
        this._term && this._term.shutdown();
        this._term = undefined;
    }

    private async startLoop() {
        while (this._keepRunning) {
            const term = new Term(this);
            this._term = term;
            let input = '';
            try {
                input = await term.run();
            } catch (e) {}

            if (input) {
                try {
                    const { processExitPromise, execPromise } = execCommand(this, input);
                    await execPromise;

                    this.history.unshift(input);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        this.cleanup();
    }
}
