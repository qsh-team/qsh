// @ts-ignore-all TS1206

import React, { PureComponent, ReactElement } from 'react';
import PropTypes from 'prop-types';
import { Color, StdinContext, Box } from 'ink';
import chalk from 'chalk';
import _ from 'lodash';

import colors, { reset } from 'ansi-colors';

import Complete from './complete';

interface ITextInputPublicProps {
    value: string;
    placeholder: string;
    focus: boolean;
    mask: string;
    highlightPastedText: string;
    onChange: (str: string) => void;
    onSubmit: (str: string | null) => void;
    onTab: () => void;
    prompt: string;
    qsh: QSH;
}

let isFocus = true;

interface ITextInputProps extends ITextInputPublicProps {
    stdin: NodeJS.ReadStream;
    setRawMode: (mode: boolean) => void;
}

import QSH from '../qsh';
import {
    ARROW_UP,
    ARROW_DOWN,
    ENTER,
    TAB,
    ARROW_LEFT,
    ARROW_RIGHT,
    BACKSPACE,
    DELETE,
    AUTO_COMPLETE_WIDTH,
    CTRL_C,
    CTRL_A,
    FOCUS_IN_EVENT,
    FOCUS_OUT_EVENT
} from './const';
import { CompleteItem } from '../complete-engine';

const initalCompleteTriggered: number | null = null;

export class TextInput extends PureComponent<ITextInputProps> {
    private static defaultProps = {
        placeholder: '',
        showCursor: true,
        focus: true,
        mask: undefined,
        highlightPastedText: false,
        onSubmit: undefined
    };

    public state = {
        cursorOffset: (this.props.value || '').length,
        cursorWidth: 0,
        completes: [] as CompleteItem[],
        completeTriggered: initalCompleteTriggered,
        showCursor: true,
        hinting: '',
        historyIndex: 0,
        debug: null
    };

    private _isMounted: boolean = true;
    private _currentInputForComplete = '';

    private get isMounted() {
        return this._isMounted;
    }

    private set isMounted(val: boolean) {
        this._isMounted = val;
    }

    private get width() {
        return process.stdout.columns || 80;
    }

    public constructor(context: any, props: any) {
        super(context, props);
        this.handleCompleteChange = this.handleCompleteChange.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleCompleteSubmit = this.handleCompleteSubmit.bind(this);

        const originSetState = this.setState;
        this.setState = (...args) => {
            if (this.isMounted) {
                originSetState.apply(this, args);
            }
        };

        this.props.qsh._for_test_only_do_not_ues.inputComponent = this;
    }

    public render() {
        const {
            value,
            placeholder,
            focus,
            mask,
            highlightPastedText,
            prompt
        } = this.props;
        const {
            cursorOffset,
            cursorWidth,
            showCursor,
            completes,
            completeTriggered,
            hinting,
            debug
        } = this.state;
        const hasValue = value.length > 0;
        let renderedValue = value;
        const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

        // Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
        if (showCursor && !mask && focus) {
            renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

            let i = 0;

            for (const char of value) {
                if (i >= cursorOffset - cursorActualWidth && i <= cursorOffset) {
                    renderedValue += chalk.inverse(char);
                } else {
                    renderedValue += char;
                }

                i++;
            }

            if (value.length > 0 && cursorOffset === value.length) {
                if (hinting) {
                    renderedValue += colors.inverse(colors.gray(hinting[0]));
                    renderedValue += colors.gray(hinting.slice(1));
                } else {
                    renderedValue += colors.inverse(' ');
                }
            } else if (hinting) {
                renderedValue += colors.gray(hinting);
            }
        }

        if (mask) {
            renderedValue = mask.repeat(renderedValue.length);
        }

        const renderCompleteWithCursor = (marginLeft: number) => {
            return (
                <Complete
                    items={completes}
                    onChange={this.handleCompleteChange}
                    onSubmit={this.handleCompleteSubmit}
                    width={AUTO_COMPLETE_WIDTH}
                    marginLeft={marginLeft}
                ></Complete>
            );
        };

        let marginLeft = (completeTriggered + this.promptLength) % this.width;

        if (marginLeft + AUTO_COMPLETE_WIDTH > this.width) {
            marginLeft = this.width - AUTO_COMPLETE_WIDTH;
        }

        return (
            <Box flexDirection="column">
                <Box textWrap="wrap">
                    <Box>
                        {prompt}
                        {placeholder
                            ? hasValue
                                ? renderedValue
                                : placeholder
                            : renderedValue}
                        {/* {hinting ? <Color gray>{hinting}</Color> : ''} */}
                    </Box>
                </Box>
                <Box>{renderCompleteWithCursor(marginLeft)}</Box>
                <Box>{debug ? JSON.stringify(debug) : null}</Box>
            </Box>
        );
    }

    public componentDidMount() {
        const { stdin, setRawMode } = this.props;

        this.isMounted = true;
        setRawMode(true);
        stdin.on('data', this.handleInput);

        this.triggerComplete('', 0);
    }

    public componentWillUnmount() {
        const { stdin, setRawMode } = this.props;

        this.isMounted = false;
        stdin.removeListener('data', this.handleInput);
        setRawMode(false);
    }

    private handleCompleteChange(val: string) {
        this.completeValue(val);
    }

    private replaceValue(result: string) {
        const { onChange } = this.props;
        onChange(result);
        this.clearComplete();

        this.setState({
            ...this.state,
            cursorOffset: result.length,
            hinting: ''
        });
    }

    private completeValue(result: string) {
        const { onChange } = this.props;
        const { completeTriggered } = this.state;
        const final = this.props.value.slice(0, completeTriggered || 0) + result;
        onChange(final);
        this.setState({
            ...this.state,
            cursorOffset: final.length,
            hinting: ''
        });
    }

    private handleCompleteSubmit(result: string) {
        this.completeValue(result);
        this.clearComplete();
    }

    private clearComplete() {
        this.setState({
            ...this.state,
            completes: [],
            completeTriggered: null
        });
    }

    private get promptLength() {
        return _.get(
            _.last(colors.unstyle(this.props.prompt).split('\n')),
            'length',
            0
        );
    }

    private handleCtrlC() {
        this.submit(null);
    }

    private submit(value: string | null) {
        const { onSubmit } = this.props;
        this.setState(
            {
                ...this.state,
                completes: [],
                showCursor: false
            },
            () => {
                if (onSubmit) {
                    onSubmit(value);
                }
            }
        );
    }

    private triggerHint(newValue?: string) {
        const { value: _value, qsh } = this.props;

        const value = newValue || _value;

        if (!value) {
            return;
        }

        // hint for history
        const item = _.find(qsh.history, item => item.toLowerCase().startsWith(value.toLowerCase()));

        if (item) {
            this.setState({
                hinting: item.slice(value.length)
            });
        } else {
            this.setState({
                hinting: ''
            });
        }
    }

    private handleInput(data: Buffer): void {
        const OTHER_KEY = 'other_key';
        const {
            value: originalValue,
            focus,
            mask,
            onChange,
            onSubmit,
            setRawMode
        } = this.props;
        const {
            cursorOffset: originalCursorOffset,
            showCursor,
            completeTriggered,
            hinting
        } = this.state;

        if (focus === false || this.isMounted === false) {
            return;
        }

        const s = String(data);

        let cursorOffset = originalCursorOffset;
        let value = originalValue;
        let cursorWidth = 0;

        // some key will reset complete trigger, then give true to this var
        let resetComplete = false;

        let justReturn = false;

        const KEY_MAP: any = {
            [OTHER_KEY]: (key: string) => {
                value =
          value.substr(0, cursorOffset) +
          s +
          value.substr(cursorOffset, value.length);
                cursorOffset += s.length;

                if (s.length > 1) {
                    cursorWidth = s.length;
                }
            },
            [ENTER]: (key: string) => {
                setRawMode(false);
                this.submit(originalValue);
            },
            [TAB]: (key: string) => {
                // skipHint = true;
                justReturn = true;
            },
            [ARROW_LEFT]: (key: string) => {
                if (showCursor && !mask) {
                    cursorOffset--;
                }
            },
            [ARROW_RIGHT]: (key: string) => {
                if (showCursor && !mask) {
                    cursorOffset++;
                }
            },
            [BACKSPACE]: () => {
                value =
          value.substr(0, cursorOffset - 1) +
          value.substr(cursorOffset, value.length);
                cursorOffset--;
            },

            [ARROW_UP]: () => {
                const { historyIndex } = this.state;

                const { qsh } = this.props;

                if (historyIndex >= qsh.history.length - 1) {
                    return;
                }

                resetComplete = true;

                this.setState({
                    ...this.state,
                    historyIndex: historyIndex + 1
                });

                const item = qsh.history[historyIndex];

                if (item) {
                    this.replaceValue(item);
                }

                justReturn = true;
            },

            [ARROW_DOWN]: () => {
                const { historyIndex } = this.state;

                const { qsh } = this.props;

                if (historyIndex <= 0) {
                    return;
                }

                resetComplete = true;

                this.setState({
                    ...this.state,
                    historyIndex: historyIndex - 1
                });

                const item = qsh.history[historyIndex];

                if (item) {
                    this.replaceValue(item);
                }
            },

            [DELETE]: () => {
                value =
          value.substr(0, cursorOffset - 1) +
          value.substr(cursorOffset, value.length);
                cursorOffset--;

                if (cursorOffset - 1 <= (completeTriggered || 0)) {
                    resetComplete = true;
                }
            },

            [CTRL_C]: () => {
                this.submit(null);
            },

            [CTRL_A]: () => {
                cursorOffset = 0;
                this.clearComplete();
            },

            [FOCUS_IN_EVENT]: () => {
                this.props.qsh.isFocus = true;
            },

            [FOCUS_OUT_EVENT]: () => {
                this.props.qsh.isFocus = false;
            },

            ' ': () => {
                resetComplete = true;
                KEY_MAP[OTHER_KEY](s);
            }
        };

        const keyFunc = KEY_MAP[s] || KEY_MAP[OTHER_KEY];

        keyFunc(s);

        if (justReturn) {
            return;
        }

        this.triggerHint(value);

        if (resetComplete) {
            this.triggerComplete(value, cursorOffset);
        }

        if (cursorOffset < 0) {
            cursorOffset = 0;
        }
        if (cursorOffset > value.length) {
            cursorOffset = value.length;

            resetComplete = true;

            if (hinting) {
                this.replaceValue(value + hinting);
                return;
            }
        }
        this.setState({ cursorOffset, cursorWidth });

        if (value !== originalValue) {
            onChange(value);

            if (completeTriggered === null && !resetComplete) {
                this.triggerComplete(value, cursorOffset);
            }
            if (completeTriggered !== null && !resetComplete) {
                this.getComplete(value, completeTriggered, cursorOffset);
            }
        }
    }

    private async getComplete(text: string, triggetPos: number, pos: number) {
        const qsh = this.props.qsh;

        const result = await qsh.completeEngine.complete(text, triggetPos, pos);

        this.setState({
            ...this.state,
            completes: result
        });
    }

    private async triggerComplete(text: string, pos: number): Promise<void> {
        const qsh = this.props.qsh;
        if (qsh.completeEngine.trigger(text, pos)) {
            this.setState({
                ...this.state,
                completeTriggered: pos
            });

            this.getComplete(text, pos, pos);
        } else {
            this.clearComplete();
        }
    }
}

export default class TextInputWithStdin extends PureComponent<
ITextInputPublicProps
> {
    public render() {
        return (
            <StdinContext.Consumer>
                {({ stdin, setRawMode }) => (
                    // @ts-ignore
                    <TextInput {...this.props} stdin={stdin} setRawMode={setRawMode} />
                )}
            </StdinContext.Consumer>
        );
    }
}
