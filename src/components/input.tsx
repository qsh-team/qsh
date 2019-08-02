// @ts-ignore-all TS1206

import React, {PureComponent, ReactElement} from 'react';
import PropTypes from 'prop-types';
import {Color, StdinContext, Box} from 'ink';
import chalk from 'chalk';
import _ from 'lodash';

import colors from 'ansi-colors';

import Complete from './complete';

interface ITextInputPublicProps {
	value: string,
	placeholder: string,
	focus: boolean,
	mask: string,
	highlightPastedText: string,
	onChange: (str: string) => void,
	onSubmit: (str: string | null) => void,
	onTab: () => void,
	prompt: string,
	qsh: QSH,
}

interface ITextInputProps extends ITextInputPublicProps {
	stdin: NodeJS.ReadStream,
	setRawMode: ((mode: boolean) => void),
}

import { autoComplete, IAutoComplete } from '../functions/auto-complete';
import QSH from '../qsh';
import { ARROW_UP, ARROW_DOWN, CTRL_C, ENTER, TAB, ARROW_LEFT, ARROW_RIGHT, BACKSPACE, DELETE, AUTO_COMPLETE_WIDTH } from './const';

const lazyComplete = _.throttle(autoComplete, 100);


class TextInput extends PureComponent<ITextInputProps> {
	static defaultProps = {
		placeholder: '',
		showCursor: true,
		focus: true,
		mask: undefined,
		highlightPastedText: false,
		onSubmit: undefined,
	};

	state = {
		cursorOffset: (this.props.value || '').length,
		cursorWidth: 0,
		completes: [] as IAutoComplete[],
		selectMode: false,
		showCursor: true,
	}

	private _isMounted: boolean = true;
	private _currentInputForComplete = '';

	private get isMounted() {
		return this._isMounted;
	}

	private get width() {
		return process.stdout.columns || 80;
	}

	private set isMounted(val: boolean) {
		this._isMounted = val;
	}

	private handleCompleteChange(val: string) {
		// const {
			// onChange,
		// } = this.props;

		// onChange && onChange(val);
	}

	constructor(context: any, props: any) {
		super(context, props);
		this.handleCompleteChange = this.handleCompleteChange.bind(this);
	}

	private handleCompleteSubmit() {

	}

	private get promptLength() {
		return colors.unstyle(this.props.prompt).length;
	}

	render() {
		const {value, placeholder, focus, mask, highlightPastedText, prompt} = this.props;
		const {cursorOffset, cursorWidth, showCursor, selectMode, completes} = this.state;
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

				// if ((i + this.promptLength) % this.width === 0) {
				// 	renderedValue += '\n';
				// }
			}

			if (value.length > 0 && cursorOffset === value.length) {
				renderedValue += chalk.inverse(' ');
			}
		}

		if (mask) {
			renderedValue = mask.repeat(renderedValue.length);
		}

		const renderCompleteWithCursor = (marginLeft: number) => {
			return completes ? <Complete items={completes.map(item => {
				return {
					text: item.text,
					value: item.full,
				}
			})}
			onChange={this.handleCompleteChange}
			onSubmit={this.handleCompleteSubmit}
			selectMode={selectMode}
			width={AUTO_COMPLETE_WIDTH}
			marginLeft={marginLeft}
			></Complete>: null;
		}

		let marginLeft = (cursorOffset + this.promptLength) % this.width;

		if (marginLeft + AUTO_COMPLETE_WIDTH > this.width) {
			marginLeft = this.width - AUTO_COMPLETE_WIDTH;
		}

		return (
			<Box flexDirection="column">
				<Box textWrap="wrap">
					<Box>
						{prompt}
						{placeholder ? (hasValue ? renderedValue : placeholder) : renderedValue}
					</Box>
				</Box>
				<Box>
					{renderCompleteWithCursor(marginLeft)}
				</Box>
			</Box>
		);
	}

	handleCtrlC() {
		this.submit(null);
	}
	
	componentDidMount() {
		const {stdin, setRawMode} = this.props;

		this.isMounted = true;
		setRawMode(true);
		stdin.on('data', this.handleInput);

	}

	componentWillUnmount() {
		const {stdin, setRawMode} = this.props;

		this.isMounted = false;
		stdin.removeListener('data', this.handleInput);
		setRawMode(false);
	}

	submit(value: string | null) {
		const {
			onSubmit,
		} = this.props;
		this.setState({
			...this.state,
			completes: [],
			showCursor: false,
		}, () => {
			if (onSubmit) {
				onSubmit(value);
			}	
		})
	}

	handleInput = (data: Buffer) => {
		const {value: originalValue, focus, mask, onChange, onSubmit, setRawMode} = this.props;
		const {cursorOffset: originalCursorOffset, selectMode, showCursor} = this.state;

		if (focus === false || this.isMounted === false) {
			return;
		}
		

		const s = String(data);

		if (s === ARROW_UP || s === ARROW_DOWN) {
			return;
		}

		if (s === ENTER && selectMode) {
			// pass
			return;
		}


		if (s === ENTER) {
			setRawMode(false);

			this.submit(originalValue);
		
			return;
		}

		if (s === TAB && selectMode) {
			return;
		}

		if (s === TAB && !selectMode) {
			if (this._isMounted) {
				this.setState({
					...this.state,
					selectMode: true,
				});
			}
			return;
		}

		// if (selectMode) {
		// 	this.setState({
		// 		...this.state,
		// 		selectMode: false,
		// 	});
		// }

		let cursorOffset = originalCursorOffset;
		let value = originalValue;
		let cursorWidth = 0;

		if (s === ARROW_LEFT) {
			if (showCursor && !mask) {
				cursorOffset--;
			}
		} else if (s === ARROW_RIGHT) {
			if (showCursor && !mask) {
				cursorOffset++;
			}
		} else if (s === BACKSPACE || s === DELETE) {
			value = value.substr(0, cursorOffset - 1) + value.substr(cursorOffset, value.length);
			cursorOffset--;
		} else {
			value = value.substr(0, cursorOffset) + s + value.substr(cursorOffset, value.length);
			cursorOffset += s.length;

			if (s.length > 1) {
				cursorWidth = s.length;
			}
		}

		if (cursorOffset < 0) {
			cursorOffset = 0;
		}

		if (cursorOffset > value.length) {
			cursorOffset = value.length;
		}

		this.setState({cursorOffset, cursorWidth});

		if (value !== originalValue) {
			
			onChange(value);

			this.triggerComplete(value);
		}
	}

	async triggerComplete(text: string) {
		this._currentInputForComplete = text;
		try {
			const completes = await lazyComplete(text, this.props.qsh);
			if (completes && completes.length > 0) {
				if (this._isMounted) {
					this.setState({
						...this.state,
						completes,
					});
				}
			}
		} catch (e) {
		}
	}
}


export default class TextInputWithStdin extends PureComponent<ITextInputPublicProps> {
	render() {
		return (
			<StdinContext.Consumer>
				{({stdin, setRawMode}) => (
					// @ts-ignore
					<TextInput {...this.props} stdin={stdin} setRawMode={setRawMode}/>
				)}
			</StdinContext.Consumer>
		);
	}
}

