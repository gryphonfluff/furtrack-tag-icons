type Job = {
  ready: () => void;
  finished: Promise<void>;
  cancelled: boolean;
}

type Submitted<T> = {
  promise: Promise<T>;
  cancel: () => void;
}

type Pending<T> = {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: Error) => void;
}

function pending<T>(): Pending<T> {
  // Use an array to workaround, use-before-assigned error.
  const s: Array<{
    resolve: (v: T) => void;
    reject: (e: Error) => void;
  }> = [];
  const promise = new Promise<T>((resolve, reject) => s.push({ resolve, reject }));
  return { promise, ...s[0] };
}

export class ThrottlingQueue {
  private queue: Array<Job> = [];
  private delay: number;

  constructor(delay: number) {
    this.delay = delay;
  }

  submit<T>(fn: () => T): Submitted<T> {
    const ready = pending<void>();
    const promise = ready.promise.then(fn);
    const job: Job = {
      ready: ready.resolve,
      finished: promise as Promise<void>,
      cancelled: false,
    };
    const cancel = () => job.cancelled = true;
    this.queue.push(job);
    if (this.queue.length == 1)
      this.work();
    return { promise, cancel };
  }

  private work() {
    while (this.queue.length > 0) {
      const job = this.queue[0];
      job.finished.then(() => {
        this.queue.shift();
        if (job.cancelled)
          this.work();
        else if (this.queue.length > 0)
          window.setTimeout(() => this.work(), this.delay);
      });
      job.ready();
      break;
    }
  }
}

// vim: ts=2 sw=2 sts=2 et
