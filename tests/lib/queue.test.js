const Queue = require('../../src/lib/queue')

const testFunc1 = jest
  .fn()
  .mockImplementation(() => Promise.resolve('testFunc1'))
const testFunc2 = jest
  .fn()
  .mockImplementation(() => Promise.resolve('testFunc2'))
const testFunc3 = jest
  .fn()
  .mockImplementation(() => Promise.resolve('testFunc2'))
const testFunc4 = jest
  .fn()
  .mockImplementation(() => Promise.resolve('testFunc2'))
const testFunc5 = jest
  .fn()
  .mockImplementation(() => Promise.resolve('testFunc2'))

describe('Queue', () => {
  beforeEach(() => {
    testFunc1.mockClear()
    testFunc2.mockClear()
    testFunc3.mockClear()
    testFunc4.mockClear()
    testFunc5.mockClear()
  })

  test('should call given functions', async () => {
    const queue = new Queue()
    const queueGroup = 'test1'
    await queue.enqueue(queueGroup, () => testFunc1())

    expect(testFunc1.mock.calls.length).toBe(1)
  })

  test('should call given functions in proper order', async () => {
    const queue = new Queue()
    const queueGroup = 'test1'
    await Promise.all([
      queue.enqueue(queueGroup, () => testFunc1()),
      queue.enqueue(queueGroup, () => testFunc2())
    ])

    expect(testFunc1.mock.calls.length).toBe(1)
    expect(testFunc2.mock.calls.length).toBe(1)
    expect(testFunc1).toHaveBeenCalledBefore(testFunc2)
  })

  test('should call given functions in proper order after promise is resolved', async () => {
    const queue = new Queue()
    const queueGroup = 'test1'
    await Promise.all([
      queue.enqueue(
        queueGroup,
        () =>
          new Promise(resolve => setTimeout(() => resolve(testFunc1()), 1000))
      ),
      queue.enqueue(queueGroup, () => testFunc2())
    ])

    expect(testFunc1.mock.calls.length).toBe(1)
    expect(testFunc2.mock.calls.length).toBe(1)
    expect(testFunc1).toHaveBeenCalledBefore(testFunc2)
  })

  test('should not call functions after one of them throws an error', async () => {
    testFunc2.mockImplementationOnce(() => {
      throw new Error('reject')
    })

    const queue = new Queue()
    const queueGroup = 'test1'
    await expect(
      Promise.all([
        queue.enqueue(queueGroup, () => testFunc1()),
        queue.enqueue(queueGroup, () => testFunc2()),
        queue.enqueue(queueGroup, () => testFunc3())
      ])
    ).rejects.toThrow('reject')

    expect(testFunc1.mock.calls.length).toBe(1)
    expect(testFunc2.mock.calls.length).toBe(1)
    expect(testFunc3.mock.calls.length).toBe(0)
  })

  test('should not call functions after one of them rejects', async () => {
    testFunc1.mockImplementationOnce(() => Promise.reject(new Error('reject')))

    const queue = new Queue()
    const queueGroup = 'test1'
    await expect(
      Promise.all([
        queue.enqueue(queueGroup, () => testFunc1()),
        queue.enqueue(queueGroup, () => testFunc2()),
        queue.enqueue(queueGroup, () => testFunc3())
      ])
    ).rejects.toThrow('reject')

    expect(testFunc1.mock.calls.length).toBe(1)
    expect(testFunc2.mock.calls.length).toBe(0)
    expect(testFunc3.mock.calls.length).toBe(0)
  })

  test('should call functions in different group after previous one throws an error', async () => {
    testFunc2.mockImplementationOnce(() => {
      throw new Error('reject')
    })

    const queue = new Queue()
    const queueGroup = 'test1'
    const queueGroup2 = 'test2'
    await expect(
      Promise.all([
        queue.enqueue(queueGroup, () => testFunc1()),
        queue.enqueue(queueGroup, () => testFunc2()),
        queue.enqueue(queueGroup, () => testFunc3()),
        queue.enqueue(queueGroup2, () => testFunc4()),
        queue.enqueue(queueGroup2, () => testFunc5())
      ])
    ).rejects.toThrow('reject')

    expect(testFunc1.mock.calls.length).toBe(1)
    expect(testFunc2.mock.calls.length).toBe(1)
    expect(testFunc3.mock.calls.length).toBe(0)
    expect(testFunc4.mock.calls.length).toBe(1)
    expect(testFunc5.mock.calls.length).toBe(1)
  })
})
