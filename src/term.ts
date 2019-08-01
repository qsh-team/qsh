// @ts-ignore
import {
    Prompt,
} from 'enquirer';


import EventEmitter from "events";
import TypedEmitter from "typed-emitter";

import _ from 'lodash';
import { IAutoComplete } from './auto-complete';

import colors from 'ansi-colors';

import QSH, { IQSHEvent } from './qsh';
import TypedEventEmitter from 'typed-emitter';

// @ts-ignore
import * as PowerlineStatus from 'powerline-statusbar';
interface IKeyFlowTable {
    [name: string]: {
        [keyname: string]: (name: string) => void| boolean,
    }
}

export default class Term extends Prompt {
    private _cmd: string = '';
    
    protected styles: any;
    private _state = {
        input: '',
        cursor: 0,
    };

    private _historyIndex = 0;

    // @ts-ignore

    // realCorsur will follow corsur, unless we are in switchCompelete
    private _realCursor = 0;

    private _completeList?: IAutoComplete[];
    private _completeIndex: number = -1;
    private _isCompleteShow: boolean = false;
    private _isSwtichInComplete: boolean = false;
    private _hinting?: string;

    private _cleaned: boolean = false;
    private _debug: string = '';

    private _firstTimeRender: boolean = true;

    private lazyRender: () => void =  _.throttle(this.doRender.bind(this), 30);
    private lazyComplelteInput =  _.throttle(this.completeInput.bind(this), 100);

    // cache for this line
    // will be drop after exec or ctrlc etc
    private _lineCache = {
        promopt: '',
    };


    private get _startPoint() {
        const lastLine = _.last(this._lineCache.promopt.split('\n')) || '';
        // @ts-ignore
        return lastLine.length % this.width;
    }

    private _qsh: QSH;


    constructor(qsh: QSH) {
        super();
        this._qsh = qsh;
        this.initOnKey();
        // @ts-ignore
        this.cursorHide();


        const inputListener = () => {
            this._completeList = [];
            this._completeIndex = -1;
            this._isCompleteShow = false;
        };
        
        this._qsh.event.on('input', inputListener);
        this.on('destory', () => this._qsh.event.removeListener('input', inputListener));

        const completeDoneListener = (result: IAutoComplete[]) => {
            this._completeList = result;
            if (result.length > 0) {
                this._hinting = result[0].full;
            }
            this.render();
        };

        this._qsh.event.on('get-complete-done', completeDoneListener);
        this.on('destory', () => this._qsh.event.removeListener('get-complete-done', completeDoneListener));

    }

    private async timeout(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    public async run(): Promise<string> {
        await super.run();
        return this._state.input;
    }


    private cleanup() {
        this._isCompleteShow = false;
        this._isSwtichInComplete = false;
        this._hinting = '';
        this._completeList = [];
        this._state.cursor = -1;
        this._cleaned = true;

        this.doRender();
        this.emit('destory');
    }


    protected up() {
        const item = this._qsh.history[this._historyIndex++];
        if (item) {
            this.lazyComplelteInput(item);
        }
        this.render();
    }
    protected down() {
        const item = this._qsh.history[this._historyIndex--];
        if (item) {
            this.lazyComplelteInput(item);
        }
        this.render();
    }

    protected append(ch: string) {
        let { cursor, input } = this._state;
        this._state.input = input.slice(0, cursor) + ch + input.slice(cursor);
        this.moveCursor(1);
        this.emitInput();
        this.render();
    }

    protected delete() {
        let { cursor, input } = this._state;
        if (cursor > 0) {
            this._state.input = input.slice(0, cursor - 1) + input.slice(cursor);
            this._state.cursor = cursor - 1;
        }
        this.emitInput();
        this.render();

    }

    private emitInput() {
        this._qsh.event.emit('input', this._state.input);
    }

    protected left() {
        let { cursor } = this._state;
        if (cursor > 0) {
            this._state.cursor = cursor - 1;
        }
        
        this.render();
        
    }

    protected dispatch(ch: string, key: any) {
        if (!ch || key.ctrl || key.code) return ;
        this.append(ch);
    }

    protected right() {
        let { cursor } = this._state;
        if (cursor < this._state.input.length) {
            this._state.cursor = cursor + 1;
        } else {
            const hinting = this._hinting;
            if (hinting) {
                this.completeInput(hinting);
            }
        }
        this.render();
    }

    protected moveCursor(step: number) {
        this._state.cursor += step;
    }

    protected insert(str: string) {
        this.append(str);
        this.emitInput();
        this.render();
    }

    public _clear() {
        // @ts-ignore
        this.clear();
    }

    public _write(str: string) {
        // @ts-ignore
        this.write(str);
    }

    public renderAutoCompleteBox(list: string[], originMargin: number) {
        if (!list || list.length === 0) return;

        this._isCompleteShow = true;

        const AUTO_COMPLETE_MAX_LEN = 6;
        // const startPage = Math.floor(this._completeIndex / (AUTO_COMPLETE_MAX_LEN - 1)) * AUTO_COMPLETE_MAX_LEN;
        // const displayList: string[] = list.slice(startPage * AUTO_COMPLETE_MAX_LEN, (startPage + 1) * AUTO_COMPLETE_MAX_LEN);

        let startPage = Math.floor(this._completeIndex / AUTO_COMPLETE_MAX_LEN);

        startPage = startPage >= 0 ? startPage: 0;

        const startIndex = startPage * AUTO_COMPLETE_MAX_LEN;

        const displayList = list.slice(startIndex, startIndex + AUTO_COMPLETE_MAX_LEN);

        const originMaxlen = _.max(displayList.map(item => typeof item === 'string' && item.length)) || 0;
        const WINDOW_PADDING = 4;

        // @ts-ignore
        const MAX_WIDTH = this.width - WINDOW_PADDING;
        const maxlen = _.min([originMaxlen, MAX_WIDTH]) || 0;

        const BORDER = 1;
        originMargin = originMargin + this._lineCache.promopt.length / 2;
        // @ts-ignore
        let margin = originMargin + maxlen + BORDER * 2 + WINDOW_PADDING > this.width ? this.width - maxlen - this._startPoint - 4: originMargin;
        
        margin = margin < 0 ? 0 : margin;

        for (let i = -1; i < displayList.length + 1; i ++) {
            const rawItem = displayList[i];
            let item;
            if (typeof rawItem === 'string') {
                item = rawItem.slice(0, MAX_WIDTH);
            } else {
            }

            this._write('\n');
            this._write(new Array(margin).fill(' ').join(''));
            this._write('|');

            if (!item) {
                this._write(new Array(maxlen + BORDER * 2).fill('-').join(''));
            } else {
                this._write(' ');
                this._write((this._isSwtichInComplete && this._completeIndex === startIndex + i) ? this.styles.underline(item) : item);
                this._write(' ');
                this._write(new Array(maxlen - colors.unstyle(item).length).fill(' ').join(''));
            }
            this._write('|');
        }
    }

    private completeInput(str: string) {
        this._state.input = str;
        this._state.cursor = str.length + 1;

        // don't emit input here
    }


    // compute some data before every render
    // don't render() in compute
    protected compute() {
        
        if (!this._completeList || this._completeList.length === 0) {
            this._isCompleteShow = false;
            this._hinting = '';
        }

        if (!this._state.input) {
            this._isCompleteShow = false;
            this._completeList = [];
            this._hinting = '';
        }

        // follow cursor
        if (!this._isSwtichInComplete) {
            this._realCursor = this._state.cursor;
        }
    }

    private doRender() {
        this.compute();
        this._clear();

        const {
            input,
            cursor,
        } = this._state;
        const strong = this.styles.strong;
        const disabled = this.styles.disabled;

        if (!this._lineCache.promopt) {
            let firstTime = true;
            this._qsh.options.promopt((str) => {
                this._lineCache.promopt = str;
                if (!firstTime) {
                    if (!this._cleaned) {
                        this.render();
                    }
                } else {
                    firstTime = !firstTime;
                }
                return !this._cleaned;
            });
        }
        this._write(this._lineCache.promopt);
        const hinting = this._hinting || '';

        const maxlen = _.max([input.length, hinting.length, this._state.cursor + 1]) || input.length;

        for (let i = 0; i < maxlen; i ++) {
            if (i === cursor && hinting[i] && !input[i]) {
                // cursor on hinting
                this._write(colors.bgBlackBright(hinting[i] || ' '));
            } else if (i === cursor) {
                this._write(colors.bgBlackBright(input[i] || ' '));
            } else if (input[i] && hinting[i] && input[i] === hinting[i]) {
                // both hinting & input, and same char
                this._write(strong(input[i]));
            } else if (input[i] && !hinting[i]) {
                // no hinting
                this._write(strong(input[i]));
            } else if (input[i] && hinting[i] && input[i] !== hinting[i]) {
                // both, but differece, then use input
                this._write((input[i]));
            } else if (!input[i] && hinting[i]) {
                // no input, but hinting
                this._write(disabled(hinting[i]));
            }
        }


        // this._write(this.styles.disabled(this._hinting));
        if (this._completeList && this._completeList.length > 0 && this._isSwtichInComplete) {
            this.renderAutoCompleteBox(this._completeList.map(item => item.text), this._realCursor + 1);
        }

        this._write(this._debug);

        // if (!this._cleaned) {
            
            // status line
            // const {
            //     row,
            //     col,
            // } = getCurPos.sync();
            // const {
            //     // @ts-ignore
            //     width,
            //     // @ts-ignore
            //     height,
            // } = this;
            // const rowToMove = height - row;
        
            // for (let i = 0; i < rowToMove; i ++) {
            //     this._write('\n');
            // }

            // const statusline = new PowerlineStatus.PowerlineStatus(
            //     new PowerlineStatus.StaticSegment("Some cool content", {foreground: "white", background: "blue"}),
            //     new PowerlineStatus.StaticSegment("Other content", {foreground: "white", background: "orange"})
            // );
            // this._write('> test');
        // }


    }

    public render() {
        if (this._firstTimeRender) {
            this.doRender();
        } else {
            this.lazyRender();
        }
    }

    private completeSwtich() {
        this._isSwtichInComplete = true;
    }

    private completeNext() {
        if (this._completeList) {
            this._completeIndex ++;
            if (this._completeIndex >=  this._completeList.length) {
                this._completeIndex -= this._completeList.length;
            }
        }
    }

    protected submit() {
        this.cleanup();
        // @ts-ignore
        super.submit();
    }


    protected cancel() {
        this.cleanup();
        // @ts-ignore
        super.cancel();
    }
    protected async keypress(ch: string, key: any) {
        const OTHER_KEY = 'other';
        // ctrl/meta/shift - name - function
        const keyFlowTable: IKeyFlowTable = {
            ctrl: {
                c: () => {
                }
            },
            [OTHER_KEY]: {

                tab: () => {
                    const upScreen = () => {
                        if (this._isSwtichInComplete) {
                            this._hinting = '';
                            const item = this._completeList && this._completeList[this._completeIndex];
                            if (item) {
                                this.completeInput(item.full);
                            }
                            if (this._completeList && this._completeList.length === 1) {
                                // just complete in this case
                                this._completeList = [];
                                this._isCompleteShow = false;
                                // this._isSwtichInComplete = false;
                            }
                        }
                    }
                    if (this._completeList && !this._isSwtichInComplete) {
                        this.completeSwtich();
                        upScreen();
                        return false;
                    } else if (this._isSwtichInComplete) {
                        this.completeNext();
                        upScreen();
                        return false;
                    } else {
                        this.emitInput();
                        return false;
                    }
    
                    
                   
                },

                enter: () => {
                    this.cleanup();
                },

                backspace: () => {
                    this._isSwtichInComplete = false;
                },

                [OTHER_KEY]: (name: string) => {
                }
            }
        };
        // generate meta
        const metas = [];
        if (key.ctrl) {
            metas.push('ctrl');
        }
        if (key.meta) {
            metas.push('meta');
        }
        if (key.shift) {
            metas.push('shift');
        }
        const meta = metas.join('-');
        const keyFlow = keyFlowTable[meta] || keyFlowTable[OTHER_KEY];
        const flowFunction = keyFlow[key.name] || keyFlow[OTHER_KEY];

        const result = flowFunction(key.name);
        this.render();
        if (result !== false) {
            // @ts-ignore
            return super.keypress(ch, key);
        }
    }

    private initOnKey() {
        // keypress(process.stdin);
        
    }
}