import Term from './term';

import exitHook from 'exit-hook';

import fs from 'fs';

import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

// @ts-ignore
import ppath from '@expo/ppath';

// @ts-ignore
import fixPath from 'fix-path';

import { QSH_ROOT_DIR, QSH_HISTORY_FILE, QSH_LOG_FILE } from './const';
import initBuiltin from './builtin/index';

import colors from 'ansi-colors';
// @ts-ignore
import branchName from 'branch-name';

import execCommand from './command';
import CompleteEngine from './complete-engine';
import { initCompleteBackends } from './complete-backends';
import { TextInput } from './components/input';
import SignalRef from './singal-ref';


type Color = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';
type AwesomeSymbolType = 'powerline-right' | 'icon-terminal';

const bgStyleTable = {
    black: colors.bgBlack,
    red: colors.bgRed,
    green: colors.bgGreen,
    yellow: colors.bgYellow,
    blue: colors.bgBlue,
    magenta: colors.bgMagenta,
    cyan: colors.bgCyan,
    white: colors.bgWhite,
};

const styleTable = {
    black: colors.black,
    red: colors.red,
    green: colors.green,
    yellow: colors.yellow,
    blue: colors.blue,
    magenta: colors.magenta,
    cyan: colors.cyan,
    white: colors.white,
};

const awesomeSymbolTable = {
    'powerline-right': '',
    'icon-terminal': '',
};

export interface QSHEvent {
    init: () => void;
    exec: (command: string) => void;
    input: (inputString: string) => void;
    // 'get-complete-done': (completeList: IAutoComplete[]) => void;
    exit: () => void;
    sigint: () => void;
}

interface CommandMap {
    [name: string]: (name: string, args: string[]) => Promise<void>;
}

interface TestOnlyObject {
    inputComponent: TextInput| null;
}

export default class QSH {
    public event: TypedEmitter<QSHEvent> = new EventEmitter() as TypedEmitter<
    QSHEvent
    >;
    public history: string[] = [];
    public completeEngine: CompleteEngine = new CompleteEngine();

    public _for_test_only_do_not_ues: TestOnlyObject = {
        inputComponent: null,
    };

    public helper = {


        powerline: () => {
            let fragments = '';
            let lastColor: Color | null = null;

            const that = {
                append: (text: string, textColor: Color, color: Color) => {
                    fragments += (lastColor ? styleTable[lastColor](bgStyleTable[color](this.helper.awesomeSymbol('powerline-right'))) : '') + String(String(bgStyleTable[color](styleTable[textColor](text))));
                    lastColor = color;
                    return that;
                },

                build: () => {
                    if (lastColor) {
                        return fragments + styleTable[lastColor](this.helper.awesomeSymbol('powerline-right'));
                    } else {
                        return fragments;
                    }
                }
            };
            return that;
        },
        awesomeSymbol: (type: AwesomeSymbolType) => {
            if (!this.options.awesomeMode) {
                return '';
            } else {
                return awesomeSymbolTable[type];
            }
        }
    };

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
        historyLength: 5000,
        awesomeMode: true,
    };

    private _keepRunning: boolean = true;
    private _term?: Term;


    public constructor() {
        if (this.options.awesomeMode) {

            this.options.promopt = (callback: (str: string) => void) => {
                (async () => {
                    const cwd = ' ' + ppath(process.cwd()) + ' ';
                    const qshText = ` ${this.helper.awesomeSymbol('icon-terminal')} QSH `;

                    let branch = '';
                    try {
                        branch = ' ' + await branchName.get() + ' ';
                    } catch (e) {}

                    const power = this.helper.powerline().append(qshText, 'black', 'white')
                        .append(cwd, 'blue', 'black');

                    if (branch) {
                        power.append(branch, 'black', 'yellow');
                    }

                    callback(power.build() + '\n$ ');

                })();

                return function cleanup() {
                };
            };
        }
    }

    public run() {
        this.init();
    }

    public debug(obj: any) {
        const component = this._for_test_only_do_not_ues.inputComponent;
        if (component) {
            component.setState({
                ...component.state,
                debug: obj,
            });
        }
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

        const signal = new SignalRef('SIGINT', () => {
            this.event.emit('sigint');
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

        process.stdin.setRawMode && process.stdin.setRawMode(false);

        // @ts-ignore
        if (!global.__IS_TESTING__) {
            process.exit(1);
        }
    }

    private async startLoop() {
        while (this._keepRunning) {
            const term = new Term(this);
            this._term = term;
            let input = '';
            let _sigint: (() => void) | null;

            const triggerSigint = () => {
                _sigint && _sigint();
                term.shutdown();
            };

            this.event.on('sigint', triggerSigint);

            try {
                input = await term.run();
            } catch (e) {}

            const cleanup = () => {
                this.event.removeListener('sigint', triggerSigint);
                _sigint = null;
            };

            if (input) {
                try {
                    const { processExitPromise, execPromise, sigint } = execCommand(this, input);
                    _sigint = sigint;
                    await execPromise;

                    cleanup();

                    this.history.unshift(input);
                } catch (e) {
                    console.error(e);
                    cleanup();
                }
            }
        }

        this.cleanup();
    }
}
