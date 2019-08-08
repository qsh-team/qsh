import React, {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    Component,
    useContext
} from 'react';
import { render, Box } from 'ink';

import TextInput from './input';
import QSH from '../qsh';

import Complete from './complete';

import _ from 'lodash';

import Store from './store';
import { useObservable, useObserver, observer } from 'mobx-react-lite';

interface RootComponentProps {
    onSubmit: (text: string | null) => void;
    qsh: QSH;
    stdin: NodeJS.ReadStream;
}

const RootComponent = ({ onSubmit, qsh }: RootComponentProps) => {
    const isMounted = useRef(true);
    const { store } = useContext(Store);

    useEffect(() => {
        const promoptCleanup = qsh.options.promopt((prompt: string) => {
            if (!qsh.isFocus || !isMounted.current) {
                return;
            }
            if (isMounted) {
                store.prompt = prompt;
            }
        });

        return function cleanup() {
            isMounted.current = false;
            promoptCleanup();
        };
    }, []);

    const handleChange = async (text: string) => {
        store.input = text;
    };

    const handleSubmit = (text: string | null) => {
        onSubmit(text);
    };

    return (
        <Box>
            {/*
// @ts-ignore */}
            <TextInput
                value={store.input}
                onChange={handleChange}
                onSubmit={handleSubmit}
                qsh={qsh}
                prompt={store.prompt}
            />
        </Box>
    );
};

const ObserverRootComponent = observer(RootComponent);

export default (props: RootComponentProps) => {
    return <ObserverRootComponent {...props} />;
};
