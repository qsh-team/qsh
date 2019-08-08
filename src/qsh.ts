import Term from './term';

import exitHook from 'exit-hook';

import fs from 'fs';

import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';


// @ts-ignore
import ppath from '@expo/ppath';

import systeminformation from 'systeminformation';

// @ts-ignore
// import fixPath from 'fix-path';

import { QSH_ROOT_DIR, QSH_HISTORY_FILE, QSH_LOG_FILE } from './const';
import initBuiltin from './builtin/index';

import colors from 'ansi-colors';
// @ts-ignore
import branchName from 'branch-name';

// import execCommand from './command';
import CompleteEngine from './complete-engine';
import { initCompleteBackends } from './complete-backends';
import SignalRef from './singal-ref';
import { FOCUS_IN, FOCUS_OUT } from './components/const';

import {
    QshStore,
} from './components/store';

type Color = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'yellowBright';
type AwesomeSymbolType = 'powerline-right' | 'icon-terminal' | 'icon-git-branch' | 'icon-memory' | 'icon-chip'
    | 'icon-history';

const bgStyleTable = {
    black: colors.bgBlack,
    red: colors.bgRed,
    green: colors.bgGreen,
    yellow: colors.bgYellow,
    blue: colors.bgBlue,
    magenta: colors.bgMagenta,
    cyan: colors.bgCyan,
    white: colors.bgWhite,
    yellowBright: colors.bgYellowBright,
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
    yellowBright: colors.yellowBright,
};

const awesomeSymbolTable = {
    'powerline-right': '',
    'icon-terminal': '',
    'icon-git-branch': '',
    'icon-memory': '',
    'icon-chip': '',
    'icon-history': '',
};

export interface QSHEvent {
    init: () => void;
    exec: (command: string) => void;
    input: (inputString: string) => void;
    // 'get-complete-done': (completeList: IAutoComplete[]) => void;
    exit: () => void;
    sigint: () => void;
    'focus-out': () => void;
    'focus-in': () => void;
}

interface CommandMap {
    [name: string]: (name: string, args: string[]) => Promise<void>;
}

interface TestOnlyObject {
    completeComponent: {
        state: {
            completesTextToDisplay: string[];
        };
    };
    store: QshStore | null;
}

export default class QSH {
    public event: TypedEmitter<QSHEvent> = new EventEmitter() as TypedEmitter<
    QSHEvent
    >;
    public history: string[] = [];
    public completeEngine: CompleteEngine = new CompleteEngine(this);

    public _for_test_only_do_not_ues: TestOnlyObject = {
        completeComponent: {
            state: {
                completesTextToDisplay: [],
            },
        },
        store: null,
    };


    public helper = {


        powerline: () => {
            let fragments = '';
            const rainbowColors: Color[] = ['black', 'red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
            const textColors: Color[] = ['white', 'black', 'black', 'black', 'black', 'black', 'black'];
            let rainbowIndex = 0;
            let lastColor: Color | null = null;

            const that = {
                append: (text: string, _textColor?: Color, _color?: Color) => {
                    let textColor = _textColor || textColors[rainbowIndex];
                    let color = _color || rainbowColors[rainbowIndex];
                    if (!_color) {
                        rainbowIndex++;
                        if (rainbowIndex >= rainbowColors.length) {
                            rainbowIndex -= rainbowColors.length;
                        }
                    }
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
    public alias: {[name: string]: string} = {
        'ls': 'ls -G'
    };
    public options = {
        promopt: (callback: (str: string) => void) => {
            let timer: NodeJS.Timeout | null = null;

            (async () => {
                const buildPromopt = async () => {
                    const prettyPathArray = ppath(process.cwd()).split('/');
                    prettyPathArray.forEach((item: string, index: number) => {
                        if (index === prettyPathArray.length - 1) {
                            prettyPathArray[index] = item;
                        } else {
                            prettyPathArray[index] = item[item.length - 1];
                        }
                    });
                    const cwd = ' ' + prettyPathArray.join('/') + ' ';
                    const qshText = ` ${this.helper.awesomeSymbol('icon-terminal')} QSH `;

                    let branch = '';
                    try {
                        branch = ' ' + this.helper.awesomeSymbol('icon-git-branch') + ' ' + await branchName.get() + ' ';
                    } catch (e) {}

                    const power = this.helper.powerline().append(qshText)
                        .append(cwd);

                    if (branch) {
                        power.append(branch);
                    }

                    const cpuInfo = await systeminformation.cpu();
                    const loadInfo = await systeminformation.currentLoad();
                    // power.append(` ${this.helper.awesomeSymbol('icon-chip')} ${cpuInfo.brand} `);

                    power.append(` ${this.helper.awesomeSymbol('icon-chip')} ${cpuInfo.brand} %${Math.floor(loadInfo.currentload)} `);

                    const memInfo = await systeminformation.mem();
                    power.append(` ${this.helper.awesomeSymbol('icon-memory')} %${Math.floor(memInfo.active / memInfo.total * 100)} `);


                    const promopt = `${power.build()}\n${colors.greenBright('$')} `;

                    return promopt;
                };

                timer = setInterval(async () => {
                    const promopt = await buildPromopt();
                    callback(promopt);
                }, 1000);

                const promopt = await buildPromopt();
                callback(promopt);


            })();

            return function cleanup() {
                timer && clearInterval(timer);
                timer = null;
            };
        },
        historyLength: 5000,
        awesomeMode: true,
        rainbowMode: true,
    };

    private _keepRunning: boolean = true;
    private _term?: Term;

    private _isFocus: boolean = true;


    public get isFocus() {
        return this._isFocus;
    }

    public set isFocus(val: boolean) {
        this._isFocus = val;
        this.event.emit(val ? 'focus-in' : 'focus-out');
    }

    public run() {
        process.stdout.write(FOCUS_IN);
        // console.log(FOCUS_OUT);
        this.init();
    }

    public debug(obj: any) {
        if (this._for_test_only_do_not_ues.store) {
            this._for_test_only_do_not_ues.store.debug = JSON.stringify(obj);
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
        if (!fs.existsSync(QSH_ROOT_DIR())) {
            fs.mkdirSync(QSH_ROOT_DIR());
        }
    }

    private async init() {
        // fixPath();

        const pathEnv = process.env.PATH || '';

        if (pathEnv.indexOf('/usr/local/bin') === -1) {
            process.env.PATH += ':/usr/local/bin';
        }

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
            content = fs.readFileSync(QSH_HISTORY_FILE(), 'utf-8');
        } catch (e) {}
        this.history = content.split('\n');
    }

    private saveHistory() {
        fs.writeFileSync(
            QSH_HISTORY_FILE(),
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
                    const execCommand = (await import('./command')).default;
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
