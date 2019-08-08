// @ts-ignore-all TS1206

import React, {
    PureComponent,
    ReactElement,
    useRef,
    useEffect,
    useContext
} from 'react';
import { Color, StdinContext, Box } from 'ink';
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
import Store from './store';

import { observer, useLocalStore, useObserver } from 'mobx-react-lite';

const NewTextInput = ({
    onSubmit,
    setRawMode,
    stdin,
    qsh
}: ITextInputProps) => {
    const isMouted = useRef(true);
    const width = process.stdout.columns || 80;

    const { store } = useContext(Store);

    const getComplete = async () => {
        const text = store.input;
        const triggetPos = store.completeTriggered;
        const pos = store.cursorOffset;

        if (triggetPos !== null) {
            const result = await qsh.completeEngine.complete(text, triggetPos, pos);
            // eslint-disable-next-line
      store.completes = result;
        }
    };

    const [, updateState] = React.useState();

    const submit = (text: string | null) => {
        const submitText = text;
        clearComplete();
        clearHinting();

        updateState(() => {
            onSubmit(submitText);
            replaceValue('');
        });
    };

    const clearComplete = () => {
        store.completes = [];
        store.completeTriggered = null;
    };

    const triggerComplete = async (): Promise<void> => {
        const text = store.input;
        const pos = store.cursorOffset;

        if (qsh.completeEngine.trigger(text, pos)) {
            store.completeTriggered = pos;
            await getComplete();
        } else {
            clearComplete();
        }
    };

    const clearHinting = () => {
        store.hinting = '';
    };

    const replaceValue = (result: string) => {
        store.input = result;
        clearComplete();

        store.cursorOffset = store.input.length;
        clearHinting();
    };

    const triggerHint = () => {
        if (!store.input) {
            return;
        }

        // hint for history
        const item = _.find(qsh.history, item => item.toLowerCase().startsWith(store.input.toLowerCase()));

        if (item) {
            store.hinting = item.slice(store.input.length);
        } else {
            store.hinting = '';
        }
    };

    const completeValue = (result: string) => {
        const final = store.input.slice(0, store.completeTriggered || 0) + result;

        store.input = final;
        store.hinting = '';
        store.cursorOffset = final.length;
    };

    const handleInput = (data: Buffer) => {
        const OTHER_KEY = 'other_key';

        if (isMouted.current === false) {
            return;
        }

        const s = String(data);

        let cursorWidth = 0;

        // some key will reset complete trigger, then give true to this var
        let resetComplete = false;

        let justReturn = false;

        const KEY_MAP: any = {
            [OTHER_KEY]: (key: string) => {
                const newValue =
          store.input.substr(0, store.cursorOffset) +
          s +
          store.input.substr(store.cursorOffset, store.input.length);

                store.input = newValue;
                store.cursorOffset = store.cursorOffset + s.length;
            },
            [ENTER]: (key: string) => {
                setRawMode(false);
                submit(store.input);
            },
            [TAB]: (key: string) => {
                // skipHint = true;
                justReturn = true;
            },
            [ARROW_LEFT]: (key: string) => {
                store.cursorOffset = store.cursorOffset - 1;
            },
            [ARROW_RIGHT]: (key: string) => {
                store.cursorOffset = store.cursorOffset + 1;
            },
            [BACKSPACE]: () => {
                store.input =
          store.input.substr(0, store.cursorOffset - 1) +
          store.input.substr(store.cursorOffset, store.input.length);
                store.cursorOffset = store.cursorOffset - 1;
            },

            [ARROW_UP]: () => {
                if (store.historyIndex >= qsh.history.length - 1) {
                    return;
                }

                resetComplete = true;

                store.historyIndex = store.historyIndex + 1;

                const item = qsh.history[store.historyIndex];

                if (item) {
                    replaceValue(item);
                }

                justReturn = true;
            },

            [ARROW_DOWN]: () => {
                if (store.historyIndex <= 0) {
                    return;
                }

                resetComplete = true;

                store.historyIndex = store.historyIndex - 1;

                const item = qsh.history[store.historyIndex];

                if (item) {
                    replaceValue(item);
                }
            },

            [DELETE]: () => {
                store.input =
          store.input.substr(0, store.cursorOffset - 1) +
          store.input.substr(store.cursorOffset, store.input.length);

                store.cursorOffset = store.cursorOffset - 1;

                if (store.cursorOffset - 1 <= (store.completeTriggered || 0)) {
                    resetComplete = true;
                }
            },

            [CTRL_C]: () => {
                submit(null);
            },

            [CTRL_A]: () => {
                store.cursorOffset = 0;
                clearComplete();
            },

            [FOCUS_IN_EVENT]: () => {
                qsh.isFocus = true;
            },

            [FOCUS_OUT_EVENT]: () => {
                qsh.isFocus = false;
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

        triggerHint();

        if (resetComplete) {
            triggerComplete();
        }

        if (store.cursorOffset < 0) {
            store.cursorOffset = 0;
        }
        if (store.cursorOffset > store.input.length) {
            store.cursorOffset = store.input.length;

            resetComplete = true;

            if (store.hinting) {
                replaceValue(store.input + store.hinting);
                return;
            }
        }

        if (store.completeTriggered === null && !resetComplete) {
            triggerComplete();
        }
        if (store.completeTriggered !== null && !resetComplete) {
            getComplete();
        }
    };

    useEffect(() => {
    // componentDidMount
        qsh._for_test_only_do_not_ues.store = store;

        setRawMode(true);
        stdin.on('data', handleInput);

        triggerComplete();
        isMouted.current = true;
        setRawMode(true);
        stdin.removeListener('data', handleInput);
        stdin.on('data', handleInput);

        store.historyIndex = -1;
        store.completes = [];
        store.completeTriggered = 0;
        store.cursorOffset = 0;
        store.input = '';

        return function cleanup() {
            stdin.removeListener('data', handleInput);
        };
    }, []);

    // render
    const hasValue = store.input.length > 0;
    let renderedValue = store.input;

    // Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
    renderedValue = store.input.length > 0 ? '' : colors.inverse(' ');

    let i = 0;

    for (const char of store.input) {
        if (i >= store.cursorOffset && i <= store.cursorOffset) {
            renderedValue += colors.inverse(char);
        } else {
            renderedValue += char;
        }

        i++;
    }

    if (store.input.length > 0 && store.cursorOffset === store.input.length) {
        if (store.hinting) {
            renderedValue += colors.inverse(colors.gray(store.hinting[0]));
            renderedValue += colors.gray(store.hinting.slice(1));
        } else {
            renderedValue += colors.inverse(' ');
        }
    } else if (store.hinting) {
        renderedValue += colors.gray(store.hinting);
    }

    // const handleCompleteSubmit = (result: string) => {
    //     completeValue(result);
    //     clearComplete();
    // };

    const promptLength = () => {
        return _.get(_.last(colors.unstyle(store.prompt).split('\n')), 'length', 0);
    };

    const renderCompleteWithCursor = (marginLeft: number) => {
        return store.completeTriggered !== null && store.completes.length > 0 ? (
            <Complete
                items={store.completes}
                onChange={completeValue}
        // onSubmit={handleCompleteSubmit}
                width={AUTO_COMPLETE_WIDTH}
                marginLeft={marginLeft}
                qsh={qsh}
            ></Complete>
        ) : null;
    };

    let marginLeft = (store.completeTriggered + promptLength()) % width;

    if (marginLeft + AUTO_COMPLETE_WIDTH > width) {
        marginLeft = width - AUTO_COMPLETE_WIDTH;
    }

    return (
        <Box flexDirection="column">
            <Box textWrap="wrap">
                <Box>
                    {store.prompt}
                    {hasValue ? renderedValue : null}
                </Box>
            </Box>
            <Box>{renderCompleteWithCursor(marginLeft)}</Box>
            <Box>{store.debug ? JSON.stringify(store.debug) : null}</Box>
        </Box>
    );
};

const ObserverNewTextInput = observer(NewTextInput);

export default class TextInputWithStdin extends PureComponent<
ITextInputPublicProps
> {
    public render() {
        return (
            <StdinContext.Consumer>
                {({ stdin, setRawMode }) => (
                    // @ts-ignore
                    <ObserverNewTextInput
                        {...this.props}
                        stdin={stdin}
            // @ts-ignore
                        setRawMode={setRawMode}
                    />
                )}
            </StdinContext.Consumer>
        );
    }
}
