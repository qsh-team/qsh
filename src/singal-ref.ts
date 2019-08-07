/**
 * This class is required for proper signal handling of
 * inquirer-based programs.
 *
 * USAGE:
 *
 *    async function myTask() {
 *      // Create a signal ref for the signal you'd like to catch
 *      const signalRef = new SignalRef(
 *        'SIGINT',
 *        () => { process.exit(1); }
 *      );
 *
 *      try {
 *        await doYourInquirerStuff();
 *      } finally {
 *        // Release the ref to avoid keeping the loop alive forever.
 *        signalRef.unref();
 *      }
 *    }
 *
 * NOTE: If you're not going to exit in your signal handler,
 * consider whether you want to catch the signal only once
 * (in which case maybe have it unref itself) or many times.
 *
 * See: https://github.com/SBoudrias/Inquirer.js/issues/293
 */
export default class SignalRef {
    public signal: NodeJS.Signals;
    public handler: () => void;
    // public interval: NodeJS.Timeout;

    public constructor(signal: NodeJS.Signals, handler: () => void) {
        this.signal = signal;
        this.handler = handler;

        process.removeAllListeners(this.signal);
        process.on(this.signal, this.handler);

        // This will run a no-op function every 10 seconds.
        // This is to keep the event loop alive, since a
        // signal handler otherwise does _not_. This is the
        // fundamental difference between using `process.on`
        // directly and using a SignalRef instance.
        // this.interval = setInterval(() => {}, 10000);
    }

    public unref() {
        // clearInterval(this.interval);
        process.removeListener(this.signal, this.handler);
    }
}

