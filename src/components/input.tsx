// @ts-ignore-all TS1206

import React, { PureComponent, ReactElement } from 'react';
import PropTypes from 'prop-types';
import { Color, StdinContext, Box } from 'ink';
import chalk from 'chalk';
import _ from 'lodash';

import colors from 'ansi-colors';

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

interface ITextInputProps extends ITextInputPublicProps {
    stdin: NodeJS.ReadStream;
    setRawMode: (mode: boolean) => void;
}

import { autoComplete, IAutoComplete } from '../functions/auto-complete';
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
    AUTO_COMPLETE_WIDTH
} from './const';

const lazyComplete = _.throttle(autoComplete, 100);

class TextInput extends PureComponent<ITextInputProps> {
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
        completes: [] as IAutoComplete[],
        selectMode: false,
        showCursor: true
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
            selectMode,
            completes
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
                renderedValue += chalk.inverse(' ');
            }
        }

        if (mask) {
            renderedValue = mask.repeat(renderedValue.length);
        }

        const renderCompleteWithCursor = (marginLeft: number) => {
            return completes ? (
                <Complete
                    items={completes.map(item => {
                        return {
                            text: item.text,
                            value: item.full
                        };
                    })}
                    onChange={this.handleCompleteChange}
                    onSubmit={this.handleCompleteSubmit}
                    selectMode={selectMode}
                    width={AUTO_COMPLETE_WIDTH}
                    marginLeft={marginLeft}
                ></Complete>
            ) : null;
        };

        let marginLeft = (cursorOffset + this.promptLength) % this.width;

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
                    </Box>
                </Box>
                <Box>{renderCompleteWithCursor(marginLeft)}</Box>
            </Box>
        );
    }

    public componentDidMount() {
        const { stdin, setRawMode } = this.props;

        this.isMounted = true;
        setRawMode(true);
        stdin.on('data', this.handleInput);
    }

    public componentWillUnmount() {
        const { stdin, setRawMode } = this.props;

        this.isMounted = false;
        stdin.removeListener('data', this.handleInput);
        setRawMode(false);
    }

    private handleCompleteChange(val: string) {
        // const {
        // onChange,
        // } = this.props;
        // onChange && onChange(val);
    }

    private handleCompleteSubmit(result: string) {
        this.props.onChange && this.props.onChange(result);
        this.setState({
            ...this.state,
            selectMode: false,
            completes: [],
            cursorOffset: result.length
        });
    }

    private get promptLength() {
        return colors.unstyle(this.props.prompt).length;
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
            selectMode,
            showCursor
        } = this.state;

        if (focus === false || this.isMounted === false) {
            return;
        }

        const s = String(data);

        let cursorOffset = originalCursorOffset;
        let value = originalValue;
        let cursorWidth = 0;

        const KEY_MAP: any = {
            [OTHER_KEY]: {
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
                    if (this._isMounted) {
                        this.setState({
                            ...this.state,
                            selectMode: true
                        });
                    }
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

                [DELETE]: () => {
                    value =
            value.substr(0, cursorOffset - 1) +
            value.substr(cursorOffset, value.length);
                    cursorOffset--;
                }
            },
            SELECT_MODE: {
                [ENTER]: (key: string) => {},
                [OTHER_KEY]: () => {},
            }
        };

        const mode = selectMode ? 'SELECT_MODE' : 'NORMAL_MODE';

        const modeKeyBind = KEY_MAP[mode] || KEY_MAP[OTHER_KEY];

        const keyFunc = modeKeyBind[s] || modeKeyBind[OTHER_KEY];

        keyFunc(s);

        if (cursorOffset < 0) {
            cursorOffset = 0;
        }
        if (cursorOffset > value.length) {
            cursorOffset = value.length;
        }

        this.setState({ cursorOffset, cursorWidth });

        if (value !== originalValue) {
            onChange(value);

            this.triggerComplete(value);
        }
    }

    private async triggerComplete(text: string): Promise<void> {
        this._currentInputForComplete = text;
        try {
            const completes = await lazyComplete(text, this.props.qsh);
            if (completes && completes.length > 0) {
                if (this._isMounted) {
                    this.setState({
                        ...this.state,
                        completes
                    });
                }
            }
        } catch (e) {}
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
