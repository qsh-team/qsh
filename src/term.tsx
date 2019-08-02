import QSH from './qsh';
import { render, StdinContext, Instance } from 'ink';
import React from 'react';
import RootComponent from './components/index';

export default class Term {
    private _qsh: QSH;
    private _app?: Instance;

    public constructor(qsh: QSH) {
        this._qsh = qsh;
    }

    public async run(): Promise<string> {
        return new Promise((resolve, reject): void => {
            let app: Instance;
            const handleSubmit = async (text: string | null): Promise<void> => {
                app.unmount();
                await app.waitUntilExit();
                if (text) {
                    resolve(text);
                } else {
                    reject(new Error('Cancel by CtrlC'));
                }
            };
            app = render(
                <StdinContext.Consumer>
                    {({ stdin }): JSX.Element => (
                        <RootComponent
                            stdin={stdin}
                            qsh={this._qsh}
                            onSubmit={handleSubmit}
                        />
                    )}
                </StdinContext.Consumer>,
                {
                    exitOnCtrlC: false
                }
            );
        });
    }
}
