import { createConnectedStore } from 'undux';
import { CompleteItem } from '../complete-engine';
import { observable } from 'mobx';
import React from 'react';

export interface QshStore {
    input: string;
    prompt: string;

    cursorOffset: number;
    cursorWidth: number;
    completes: CompleteItem[];
    completeTriggered: number | null;
    showCursor: boolean;
    hinting: string;
    historyIndex: number;
    debug: string;
}

const store: QshStore = {
    input: '',
    prompt: '',

    cursorOffset: 0,
    cursorWidth: 0,
    completes: [] as CompleteItem[],
    completeTriggered: 0,
    showCursor: true,
    hinting: '',
    historyIndex: -1,
    debug: ''
};

export default React.createContext({ store: observable(store) });
