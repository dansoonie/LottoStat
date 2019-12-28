import { EventEmitter } from 'events'

type AQHandler = (asyncQueue: AsyncQueue, args?: any) => Promise<any>

class AQTask {
  handler: AQHandler
  args?: any
  promise?: Promise<any>
  result?: any
  error?: any

  constructor(handler: AQHandler, args?: any) {
    this.handler = handler
    this.args = args
  }
}

class AsyncQueue extends EventEmitter {

  static readonly State = {
    INIT: 'init',
    PAUSED: 'paused',
    STARTED: 'started',
    CLOSED: 'closed'
  }

  /**
   * In ASAP mode, the result of a task is emitted immediately when task completes.
   * In FIFO mode, the result of task is emitted in the order it was submitted. Therefore,
   * the result of a task will be emitted only if results for tasks submitted earlier have
   * been emitted.
   */
  static readonly Mode = {
    ASAP: 'asap',
    FIFO: 'fifo'
  }

  name: string          // Name of the async queue
  state: string         // State fo the async queue
  mode: string          // Mode of the async queue
  concurrency: number   // Max number of tasks to handle concurrently
  working: number       // Number of tasks being concurrently handled
  taskQueue: AQTask[]     // Queue of submitted tasks
  resultQueue: AQTask[]   // Queue of tasks to be settled and emit result

  constructor(name: string, concurrency: number, mode: string = AsyncQueue.Mode.ASAP) {
    super()
    this.name = name
    this.state = AsyncQueue.State.INIT
    this.mode = mode
    this.concurrency = concurrency
    this.working = 0
    this.taskQueue = []
    this.resultQueue = []
    console.info('Created new Async Queue: %s', this.name)
  }

  private log() {
    console.info('AsyncQeue @ %d (%s) - %s', this.concurrency, this.name, this.state)
    console.info('\tUtilization: %d / %d', this.working, this.concurrency)
    console.info('\tQueued Tasks: %d', this.taskQueue.length)
    console.info('\tQueued Results: %d', this.resultQueue.length)
  }

  private changeState(newState: string) {
    const oldState = this.state
    this.state = newState
    console.debug('AsyncQueue(%s) - change state: %s -> %s', this.name, oldState, newState)
  }

  start(): AsyncQueue {
    this.changeState(AsyncQueue.State.STARTED)
    this.dequeue()
    return this
  }

  pause(): AsyncQueue {
    this.changeState(AsyncQueue.State.PAUSED)
    return this
  }

  close(): AsyncQueue {
    this.changeState(AsyncQueue.State.CLOSED)
    return this
  }

  enqueue(task: AQTask): AsyncQueue {
    this.taskQueue.push(task)
    console.log('AsyncQueue(%s) - Enqueue task', this.name)
    if (this.state === AsyncQueue.State.STARTED) {
      this.dequeue()
    }
    return this
  }

  dequeue(): AsyncQueue {
    if (this.taskQueue.length > 0 && this.working < this.concurrency) {
      const task: AQTask = this.taskQueue.shift()!
      task.promise = task.handler(this, task.args).then(result => {
        task.result = result
      }).catch(err => {
        task.error = err
      }).finally(() => {
        if (this.mode === AsyncQueue.Mode.ASAP) {
          const taskIdx = this.resultQueue.indexOf(task)
          const [completedTask] = this.resultQueue.splice(taskIdx, 1)
          if (completedTask.result) {
            this.emit('data', completedTask.result)
          } else if (completedTask.error) {
            this.emit('error', completedTask.error)
          }
        } else if (this.mode === AsyncQueue.Mode.FIFO) {
          while (this.resultQueue.length > 0) {
            const resultTask = this.resultQueue[0]
            if (resultTask.result) {
              this.emit('data', resultTask.result)
            } else if (resultTask.error) {
              this.emit('error', resultTask.error)
            } else {
              break
            }
            this.resultQueue.shift()
          }
        }
        this.working--
        this.log()
        this.dequeue()
      })
      this.resultQueue.push(task)
      this.working++
    } else if (this.state === AsyncQueue.State.CLOSED && this.resultQueue.length === 0 && this.working === 0) {
      this.log()
      this.emit('done')
    }
    return this
  }
}

export { AsyncQueue, AQTask }