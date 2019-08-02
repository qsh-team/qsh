import React, { useEffect, useState, useRef } from 'react';
import { StdinContext, Box, Color } from 'ink';
import _ from 'lodash';
import { TAB, ENTER, AUTO_COMPLETE_MAX_ITEMS } from './const';

export interface ICompleteItem {
    text: string;
    value: string;
}

interface ICompletePublicProps {
    onChange: (str: string) => void;
    onSubmit: (str: string) => void;
    items: ICompleteItem[];
    selectMode: boolean;
    width: number;
    marginLeft: number;
}

interface ICompleteProps extends ICompletePublicProps {
    stdin: NodeJS.ReadStream;
    setRawMode: (mode: boolean) => void;
}

interface IProgressProps {
    progress: number;
    height: number;
    whole: number;
}

function Progress({ progress, height, whole }: IProgressProps) {
    const indicatorIndex = Math.floor((progress / whole) * height);
    return (
        <Box flexDirection="column">
            {new Array(height).fill(1).map((item, index) => {
                return (
                    <Box key={index}>
                        <Color
                            whiteBright
                            bgHex={indicatorIndex === index ? '#00bdbf' : '#2f2e2f'}
                        >
                            <Box width={1}> </Box>
                        </Color>
                    </Box>
                );
            })}
        </Box>
    );
}


function Complete({
    stdin,
    setRawMode,
    items,
    selectMode,
    onChange,
    width,
    marginLeft,
    onSubmit
}: ICompleteProps) {
    const MAX_ITEMS = AUTO_COMPLETE_MAX_ITEMS;
    const MAX_WIDTH = width;
    const displayItem = items.slice(0, MAX_ITEMS);

    const [selectIndex, setSelectIndex] = useState(-1);
    const isMounted = useRef(true);

    const selectIndexRef = useRef(-1);

    const handleKey = (data: Buffer) => {
        if (selectMode) {
            const s = String(data);
            const len = items.length;
            if (s === TAB) {
                // next
                setSelectIndex(selectIndex => {
                    const target = selectIndex + 1;
                    return target >= len ? target - len : target;
                });
            } else if (s === ENTER) {
                onSubmit(items[selectIndexRef.current].value);
            }
        }
    };

    useEffect(() => {
        if (items[selectIndex]) {
            selectIndexRef.current = selectIndex;
            onChange && onChange(items[selectIndex].value);
        }
    }, [selectIndex]);

    useEffect(() => {
        if (selectMode) {
            stdin.on('data', handleKey);
        }
        return function cleanup() {
            stdin.removeListener('data', handleKey);
        };
    }, [selectMode]);

    return (
        <Box marginLeft={marginLeft} flexDirection="column">
            <Box width={MAX_WIDTH}>
                <Box flexDirection="column">
                    {displayItem.map((item, index) => {
                        const COLOR_BG_MENU_BRIGHT = '#44c1c3';
                        const COLOR_BG_MENU = '#00989b';
                        const isSelect = index === selectIndex && selectMode;
                        const color = isSelect ? '#000000' : '#ffffff';
                        const bgColor = isSelect ? COLOR_BG_MENU_BRIGHT : COLOR_BG_MENU;

                        return (
                            <Box key={index} width={MAX_WIDTH - 1}>
                                <Color hex={color} bgHex={bgColor}>
                                    <Box width={MAX_WIDTH} textWrap="truncate-middle">
                                        {item.text.padEnd(MAX_WIDTH)}
                                    </Box>
                                </Color>
                            </Box>
                        );
                    })}
                </Box>
                <Progress
                    height={displayItem.length}
                    progress={0}
                    whole={displayItem.length}
                ></Progress>
            </Box>
        </Box>
    );
}

export default function CompleteWithStdin(props: ICompletePublicProps) {
    return (
        <StdinContext.Consumer>
            {({ stdin, setRawMode }) => (
                // @ts-ignore
                <Complete {...props} stdin={stdin} setRawMode={setRawMode} />
            )}
        </StdinContext.Consumer>
    );
}
