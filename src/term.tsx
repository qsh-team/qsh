import QSH from "./qsh";
import { render, StdinContext, Instance } from "ink";
import React from 'react';
import RootComponent from './components/index';

export default class Term {
    private _qsh: QSH;
    private _app?: Instance;

    constructor(qsh: QSH) {
        this._qsh = qsh;
    }

    public async run (): Promise<string> {
        return new Promise((resolve, reject) => {
            const handleSubmit = async (error: Error | undefined, text: string) => {
                if (!error) {
                        app.unmount();
                        await app.waitUntilExit();
                    resolve(text);
                }
            }
            const app = render(<StdinContext.Consumer>
                {({ stdin, setRawMode }) => (<RootComponent stdin={stdin} qsh={this._qsh} onSubmit={handleSubmit}/>)}
            </StdinContext.Consumer>);
        });
    }
}