const Statement = require('../src/statement')

const exec = jest.fn()
const finalize = jest.fn()
const reset = jest.fn()
const executor = {
  exec
}
const statement = {
  sql: 'SELECT * FROM test',
  lastID: 1337,
  changes: 1,
  finalize,
  reset
}

describe('Statement', () => {
  beforeEach(() => {
    exec.mockReset().mockImplementation(() => Promise.resolve({ instance: {} }))
    finalize.mockReset().mockImplementation(fn => fn())
    reset.mockReset().mockImplementation(fn => fn())
  })

  test('getters should return sqlite statement values', () => {
    const stmt = new Statement({ executor, statement })

    expect(stmt.sql).toEqual('SELECT * FROM test')
    expect(stmt.lastID).toBe(1337)
    expect(stmt.changes).toBe(1)
  })

  describe('Statement.all', () => {
    test('should call executor exec with method all, statement instance and empty params', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.all()

      expect(exec).toBeCalledWith({
        method: 'all',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: []
      })
    })

    test('should call executor exec with method all, statement instance and params given as an arguments', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.all(1, 2, 3)

      expect(exec).toBeCalledWith({
        method: 'all',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: [1, 2, 3]
      })
    })

    test('should rethrow error when executor prepare throw an error', async () => {
      exec.mockImplementation(() => Promise.reject(new Error('testError')))
      const stmt = new Statement({ executor, statement })

      await expect(stmt.all()).rejects.toThrow('testError')
    })

    test('should return result from executor exec straight forward', async () => {
      exec.mockImplementation(() =>
        Promise.resolve({ result: [{ id: 1, name: 'test' }] })
      )

      const stmt = new Statement({ executor, statement })
      const result = await stmt.all()

      expect(result).toEqual([{ id: 1, name: 'test' }])
    })
  })

  describe('Statement.get', () => {
    test('should call executor exec with method get, statement instance and empty params', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.get()

      expect(exec).toBeCalledWith({
        method: 'get',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: []
      })
    })

    test('should call executor exec with method get, statement instance and params given as an arguments', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.get(4, 5)

      expect(exec).toBeCalledWith({
        method: 'get',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: [4, 5]
      })
    })

    test('should rethrow error when executor prepare throw an error', async () => {
      exec.mockImplementation(() => Promise.reject(new Error('testError')))

      const stmt = new Statement({ executor, statement })

      await expect(stmt.get()).rejects.toThrow('testError')
    })

    test('should return result from executor exec straight forward', async () => {
      exec.mockImplementation(() =>
        Promise.resolve({ result: { id: 1, name: 'test' } })
      )

      const stmt = new Statement({ executor, statement })
      const result = await stmt.get()

      expect(result).toEqual({ id: 1, name: 'test' })
    })
  })

  describe('Statement.run', () => {
    test('should call executor exec with method run, statement instance and empty params', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.run()

      expect(exec).toBeCalledWith({
        method: 'run',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: []
      })
    })

    test('should call executor exec with method run, statement instance and params given as an arguments', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.run('test1', 'test2')

      expect(exec).toBeCalledWith({
        method: 'run',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: ['test1', 'test2']
      })
    })

    test('should rethrow error when executor prepare throw an error', async () => {
      exec.mockImplementation(() => Promise.reject(new Error('testError')))

      const stmt = new Statement({ executor, statement })

      await expect(stmt.run()).rejects.toThrow('testError')
    })

    test('should return statement instance when success', async () => {
      const stmt = new Statement({ executor, statement })
      const result = await stmt.run()

      expect(result).toBe(stmt)
    })
  })

  describe('Statement.bind', () => {
    test('should call executor exec with method bind, statement instance and empty params', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.bind()

      expect(exec).toBeCalledWith({
        method: 'bind',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: []
      })
    })

    test('should call executor exec with method bind, statement instance and params given as an arguments', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.bind('test1', 'test2')

      expect(exec).toBeCalledWith({
        method: 'bind',
        statement: {
          sql: 'SELECT * FROM test',
          lastID: 1337,
          changes: 1,
          finalize: expect.any(Function),
          reset: expect.any(Function)
        },
        params: ['test1', 'test2']
      })
    })

    test('should rethrow error when executor prepare throw an error', async () => {
      exec.mockImplementation(() => Promise.reject(new Error('testError')))

      const stmt = new Statement({ executor, statement })

      await expect(stmt.bind()).rejects.toThrow('testError')
    })

    test('should return statement instance when success', async () => {
      const stmt = new Statement({ executor, statement })
      const result = await stmt.bind()

      expect(result).toBe(stmt)
    })
  })

  describe('Statement.reset', () => {
    test('should call reset on sqlite statement object', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.reset()

      expect(reset).toBeCalled()
    })

    test('should rethrow error when sqlite statement reset function throw an error', async () => {
      reset.mockImplementation(fn => fn(new Error('testError')))
      const stmt = new Statement({ executor, statement })

      await expect(stmt.reset()).rejects.toThrow('testError')
    })

    test('should return statement instance when success', async () => {
      const stmt = new Statement({ executor, statement })
      const result = await stmt.reset()

      expect(result).toBe(stmt)
    })
  })

  describe('Statement.finalize', () => {
    test('should call finalize on sqlite statement object', async () => {
      const stmt = new Statement({ executor, statement })
      await stmt.finalize()

      expect(finalize).toBeCalled()
    })

    test('should rethrow error when sqlite statement finalize function throw an error', async () => {
      finalize.mockImplementation(fn => fn(new Error('testError')))

      const stmt = new Statement({ executor, statement })

      await expect(stmt.finalize()).rejects.toThrow('testError')
    })

    test('should return statement instance when success', async () => {
      const stmt = new Statement({ executor, statement })
      const result = await stmt.finalize()

      expect(result).toBe(stmt)
    })
  })
})
