import Term from './term';

import exitHook from 'exit-hook';

import fs from 'fs';


import { IAutoComplete } from './auto-complete';
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";

// @ts-ignore
import ppath from '@expo/ppath';

// @ts-ignore
import fixPath from 'fix-path';

import {
  QSH_ROOT_DIR, QSH_HISTORY_FILE,
} from './const';
import initAutoComplete from './auto-complete';
import initCommand from './command';
import initBuiltin from './builtin/index';
import execCommand from './command';

import colors from 'ansi-colors';
// @ts-ignore
import branchName from 'branch-name';

export interface IQSHEvent {
  init: () => void,
  exec: (command: string) => void,
  input: (inputString: string) => void,
  'get-complete-done': (completeList: IAutoComplete[]) => void,
  exit: () => void,
}

interface ICommandMap {
  [name: string]: (name:string, args: string[]) => Promise<void>,
}
export default class QSH {
  public event: TypedEmitter<IQSHEvent> = new EventEmitter() as TypedEmitter<IQSHEvent>;

  public commands: ICommandMap = {};
  public options = {
    promopt: async (callback: (str: string) => boolean) => {
      // callback(colors.green('ҩ~ '));
      // try {
      //   const name = await branchName.get();
      //   callback(colors.green(`ҩ${colors.blue('[' + name + ']')}~ `));
      // } catch (e) {}

      callback(colors.green(`ҩ ${ppath(process.cwd())} > `));
      // const timer = setInterval(() => {
      //   const keepRunning = callback(colors.green(`ҩ ${new Date().toLocaleTimeString()} ~ `));
      //   if (!keepRunning) {
      //     clearInterval(timer);
      //   }
      // }, 1000);
    },
    historyLength: 5000,
  };
  private _keepRunning: boolean = true;
  
  public history: string[] = [];

  private async initHome() {
    // const unlock = await lock();
    if (!fs.existsSync(QSH_ROOT_DIR)) {
      fs.mkdirSync(QSH_ROOT_DIR);
    }
  }

  private async init() {

    fixPath();
    await this.initHome();

    initAutoComplete(this);
    initBuiltin(this);
    this.initHistory();
    exitHook(() => {
      this.saveHistory();
    });
    this.event.on('exit', () => {
      this._keepRunning = false;
  });
  
    this.event.emit('init');

    
    this.startLoop();
  }

  private initHistory() {
    let content = '';
    try {
      content = fs.readFileSync(QSH_HISTORY_FILE, 'utf-8');
    } catch (e) {};
    this.history = content.split('\n');
  }

  private saveHistory() {
    fs.writeFileSync(QSH_HISTORY_FILE, this.history.slice(0, this.options.historyLength).join('\n'), 'utf-8');
  }

  private async startLoop() {
    while (this._keepRunning) {
      const term = new Term(this);
      let input = '';
      try {
        input = await term.run();
      } catch(e){}

      if (input) {
        try {
          const {
            processExitPromise,
            execPromise,
          } = execCommand(this, input);
          await execPromise;

          this.history.unshift(input);
        } catch(e){
          console.error(e);
        }
      }
      
    }

    process.exit(0);
}

  public registerCommand(commandName: string, func: (commandName: string, args: string[]) => Promise<void>) {
    this.commands[commandName] = func;
  }

  constructor() {
    this.init();
  }
}
