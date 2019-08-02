import React, {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    Component
} from 'react';
import { render, Box } from 'ink';

import TextInput from './input';
import QSH from '../qsh';

import Complete from './complete';

import _ from 'lodash';

interface RootComponentProps {
    onSubmit: (text: string | null) => void;
    qsh: QSH;
    stdin: NodeJS.ReadStream;
}

const RootComponent = ({ onSubmit, qsh }: RootComponentProps) => {
    const [input, setInput] = useState('');

    const [promptCache, setPromptCache] = useState('');

    const isMounted = useRef(true);

    useEffect(() => {
        const promoptCleanup = qsh.options.promopt((prompt: string) => {
            if (isMounted) {
                setPromptCache(prompt);
            }
        });

        return function cleanup() {
            isMounted.current = false;
            promoptCleanup();
        };
    }, []);

    const handleChange = async (text: string) => {
        setInput(text);
    };

    const handleSubmit = (text: string | null) => {
        onSubmit(text);
    };

    const handleCompleteChange = () => {};

    const handleCompleteSubmit = () => {};

    return (
        <Box>
            {/*
// @ts-ignore */}
            <TextInput
                value={input}
                onChange={handleChange}
                onSubmit={handleSubmit}
                qsh={qsh}
                prompt={promptCache}
            />
        </Box>
    );
};

export default RootComponent;
