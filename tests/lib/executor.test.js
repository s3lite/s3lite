jest.mock('sqlite3')

const sqlite3 = require('sqlite3')
const { S3RemoteDatabaseUpdatedError } = require('../../src/lib/errors')

const Executor = require('../../src/lib/executor')

const acquireLock = jest.fn()
const releaseLock = jest.fn()
const pullDatabase = jest.fn()
const pushDatabase = jest.fn()
const prepare = jest.fn()
const open = jest.fn()
const close = jest.fn()
const exec = jest.fn()
const run = jest.fn()
const all = jest.fn()
const stmtRun = jest.fn()
const stmtAll = jest.fn()
const Database = jest.fn()
sqlite3.Database = Database
const s3 = {
  acquireLock,
  releaseLock,
  pullDatabase,
  pushDatabase
}

describe('Executor', () => {
  beforeEach(() => {
    acquireLock.mockClear().mockImplementation(() => Promise.resolve())
    releaseLock.mockClear().mockImplementation(() => Promise.resolve())
    pullDatabase.mockClear().mockImplementation(() => Promise.resolve())
    pushDatabase.mockClear().mockImplementation(() => Promise.resolve())
    exec.mockClear().mockImplementation((sql, fn) => fn())
    run.mockClear().mockImplementation((sql, params, fn) => fn())
    all.mockClear().mockImplementation((sql, params, fn) => fn())
    close.mockClear().mockImplementation(fn => fn())
    prepare.mockClear().mockImplementation(function (sql, params, fn) {
      fn.call(this)
      return {
        sql,
        all: stmtAll,
        run: stmtRun
      }
    })
    stmtAll.mockClear().mockImplementation((params, fn) => fn())
    stmtRun.mockClear().mockImplementation((params, fn) => fn())
    Database.mockClear().mockImplementation((file, fn) => {
      fn()
      return {
        exec,
        run,
        all,
        prepare,
        close
      }
    })
  })

  describe('Executor.maxRetryOnRemoteDatabaseUpdated', () => {
    test('should throw error without retry when maxRetryOnRemoteDatabaseUpdated is 0', async () => {
      pushDatabase.mockImplementationOnce(() =>
        Promise.reject(new S3RemoteDatabaseUpdatedError('is 0'))
      )

      const executor = new Executor({ s3, maxRetryOnRemoteDatabaseUpdated: 0 })
      await expect(
        executor.exec({ method: 'run', sql: 'UPDATE test SET name=1' })
      ).rejects.toThrow('is 0')
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(run.mock.calls.length).toBe(1)
    })

    test('should throw error with two retries when maxRetryOnRemoteDatabaseUpdated is 2', async () => {
      pushDatabase.mockImplementationOnce(() =>
        Promise.reject(new S3RemoteDatabaseUpdatedError('is 0'))
      )
      pushDatabase.mockImplementationOnce(() =>
        Promise.reject(new S3RemoteDatabaseUpdatedError('is 1'))
      )
      pushDatabase.mockImplementationOnce(() =>
        Promise.reject(new S3RemoteDatabaseUpdatedError('is 2'))
      )

      const executor = new Executor({ s3, maxRetryOnRemoteDatabaseUpdated: 2 })
      await expect(
        executor.exec({ method: 'run', sql: 'UPDATE test SET name=1' })
      ).rejects.toThrow('is 2')
      expect(pullDatabase.mock.calls.length).toBe(3)
      expect(run.mock.calls.length).toBe(3)
    })

    test('should not throw error when retry exec is successful', async () => {
      pushDatabase.mockImplementationOnce(() =>
        Promise.reject(new S3RemoteDatabaseUpdatedError('is 0'))
      )

      const executor = new Executor({ s3, maxRetryOnRemoteDatabaseUpdated: 1 })
      await expect(
        executor.exec({ method: 'exec', sql: 'UPDATE test SET name=1' })
      ).resolves.toEqual({
        instance: expect.anything(),
        result: undefined,
        sql: 'UPDATE test SET name=1'
      })
      expect(pullDatabase.mock.calls.length).toBe(2)
      expect(exec.mock.calls.length).toBe(2)
    })
  })

  describe('Executor.executeSql', () => {
    test('should rethrow error on query when open database throw an error', async () => {
      pullDatabase.mockImplementation(() =>
        Promise.reject(new Error('Executor.executeSql pullDatabase error'))
      )

      const executor = new Executor({ s3 })
      await expect(
        executor.exec({ method: 'run', sql: 'SELECT * FROM test' })
      ).rejects.toThrow('Executor.executeSql pullDatabase error')
    })

    test('should rethrow error on query when sqlite instance throw an error', async () => {
      Database.mockImplementation((fileName, fn) =>
        fn(new Error('sqlite error'))
      )

      const executor = new Executor({ s3 })
      await expect(
        executor.exec({ method: 'run', sql: 'SELECT * FROM test' })
      ).rejects.toThrow('sqlite error')
    })

    test('should rethrow error on query when sqlite method throw an error', async () => {
      const executor = new Executor({ s3 })

      run.mockImplementation((sql, params, fn) => fn(new Error('sql error')))
      await expect(
        executor.exec({ method: 'run', sql: 'SELECT * FROM test' })
      ).rejects.toThrow('sql error')

      run.mockImplementation(() => {
        throw new Error('sql error 2')
      })
      await expect(
        executor.exec({ method: 'run', sql: 'SELECT * FROM test' })
      ).rejects.toThrow('sql error 2')
    })

    test('should create sqlite instance only once when opening database multiple times', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test']
      })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test']
      })

      expect(pullDatabase.mock.calls.length).toBe(2)
      expect(Database.mock.calls.length).toBe(1)
    })

    test('should pull database file from s3 when executing select query', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({ method: 'all', sql: 'SELECT * FROM test' })

      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(Database.mock.calls.length).toBe(1)
    })

    test('should handle lock, push database file to s3 when executing non select query', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test']
      })

      expect(acquireLock.mock.calls.length).toBe(1)
      expect(releaseLock.mock.calls.length).toBe(1)
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(pushDatabase.mock.calls.length).toBe(1)

      expect(acquireLock).toHaveBeenCalledBefore(pullDatabase)
      expect(pullDatabase).toHaveBeenCalledBefore(pushDatabase)
      expect(pushDatabase).toHaveBeenCalledBefore(releaseLock)
    })

    test('should handle lock, push database file to s3 when executing multiple non select query', async () => {
      const executor = new Executor({ s3 })
      await Promise.all([
        executor.exec({
          method: 'run',
          sql: 'UPDATE test SET name=?',
          params: ['test 1']
        }),
        executor.exec({
          method: 'run',
          sql: 'UPDATE test SET name=?',
          params: ['test 2']
        }),
        executor.exec({
          method: 'run',
          sql: 'UPDATE test SET name=?',
          params: ['test 3']
        })
      ])

      expect(acquireLock.mock.calls.length).toBe(3)
      expect(releaseLock.mock.calls.length).toBe(3)
      expect(pullDatabase.mock.calls.length).toBe(3)
      expect(pushDatabase.mock.calls.length).toBe(3)
    })

    test('should handle queries inside transaction', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({ method: 'exec', sql: 'BEGIN TRANSACTION' })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 1']
      })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 2']
      })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 3']
      })
      await executor.exec({ method: 'exec', sql: 'COMMIT' })

      expect(acquireLock.mock.calls.length).toBe(1)
      expect(releaseLock.mock.calls.length).toBe(1)
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(pushDatabase.mock.calls.length).toBe(1)

      expect(acquireLock).toHaveBeenCalledBefore(pullDatabase)
      expect(pullDatabase).toHaveBeenCalledBefore(pushDatabase)
      expect(pushDatabase).toHaveBeenCalledBefore(releaseLock)
    })

    test('should not push database when using rollback', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({ method: 'exec', sql: 'BEGIN TRANSACTION' })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 1']
      })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 2']
      })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 3']
      })
      await executor.exec({ method: 'exec', sql: 'ROLLBACK' })

      expect(acquireLock.mock.calls.length).toBe(1)
      expect(releaseLock.mock.calls.length).toBe(1)
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(pushDatabase.mock.calls.length).toBe(0)

      expect(acquireLock).toHaveBeenCalledBefore(pullDatabase)
      expect(pullDatabase).toHaveBeenCalledBefore(releaseLock)
    })

    test('should handle params as an array', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=? WHERE name=?',
        params: ['test 1', 'test 2']
      })

      expect(run.mock.calls.length).toBe(1)
      expect(run.mock.calls[0][0]).toEqual(
        'UPDATE test SET name=? WHERE name=?'
      )
      expect(run.mock.calls[0][1]).toEqual(['test 1', 'test 2'])
    })

    test('should handle single param as an array', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=?',
        params: ['test 1']
      })

      expect(run.mock.calls.length).toBe(1)
      expect(run.mock.calls[0][0]).toEqual('UPDATE test SET name=?')
      expect(run.mock.calls[0][1]).toEqual(['test 1'])
    })

    test('should handle params as an object', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({
        method: 'run',
        sql: 'UPDATE test SET name=$a WHERE name=$b',
        params: [
          {
            $a: 'test 1',
            $b: 'test 2'
          }
        ]
      })

      expect(run.mock.calls.length).toBe(1)
      expect(run.mock.calls[0][0]).toEqual(
        'UPDATE test SET name=$a WHERE name=$b'
      )
      expect(run.mock.calls[0][1]).toEqual({
        $a: 'test 1',
        $b: 'test 2'
      })
    })
  })

  describe('Executor.executeStatement', () => {
    test('should rethrow error on query when open database throw an error', async () => {
      pullDatabase.mockImplementationOnce(() =>
        Promise.reject(
          new Error('Executor.executeStatement pullDatabase error')
        )
      )

      const executor = new Executor({ s3 })
      const statement = { sql: 'SELECT * FROM test', run: stmtRun }
      await expect(executor.exec({ method: 'run', statement })).rejects.toThrow(
        'Executor.executeStatement pullDatabase error'
      )
    })

    test('should rethrow error on query when sqlite method throw an error', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'SELECT * FROM test', run: stmtRun }

      stmtRun.mockImplementation((params, fn) => fn(new Error('sql error')))
      await expect(executor.exec({ method: 'run', statement })).rejects.toThrow(
        'sql error'
      )

      stmtRun.mockImplementation(() => {
        throw new Error('sql error 2')
      })
      await expect(executor.exec({ method: 'run', statement })).rejects.toThrow(
        'sql error 2'
      )
    })

    test('should create sqlite instance only once when opening database multiple times', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'SELECT * FROM test', run: stmtRun }
      await executor.exec({ method: 'run', statement, params: ['test 1'] })
      await executor.exec({ method: 'run', statement, params: ['test 2'] })

      expect(pullDatabase.mock.calls.length).toBe(2)
      expect(Database.mock.calls.length).toBe(1)
    })

    test('should pull database file from s3 when executing select query', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'SELECT * FROM test', all: stmtAll }
      await executor.exec({ method: 'all', statement })

      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(Database.mock.calls.length).toBe(1)
    })

    test('should handle lock, push database file to s3 when executing non select query', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'UPDATE test SET name=?', run: stmtRun }
      await executor.exec({ method: 'run', statement })

      expect(acquireLock.mock.calls.length).toBe(1)
      expect(releaseLock.mock.calls.length).toBe(1)
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(pushDatabase.mock.calls.length).toBe(1)
    })

    test('should handle lock, push database file to s3 when executing multiple non select query', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'UPDATE test SET name=?', run: stmtRun }

      await Promise.all([
        executor.exec({ method: 'run', statement, params: ['test 1'] }),
        executor.exec({ method: 'run', statement, params: ['test 2'] }),
        executor.exec({ method: 'run', statement, params: ['test 3'] })
      ])

      expect(acquireLock.mock.calls.length).toBe(3)
      expect(releaseLock.mock.calls.length).toBe(3)
      expect(pullDatabase.mock.calls.length).toBe(3)
      expect(pushDatabase.mock.calls.length).toBe(3)
    })

    test('should handle queries inside transaction', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'UPDATE test SET name=?', run: stmtRun }

      await executor.exec({ method: 'exec', sql: 'BEGIN TRANSACTION' })
      await Promise.all([
        executor.exec({ method: 'run', statement, params: ['test 1'] }),
        executor.exec({ method: 'run', statement, params: ['test 2'] }),
        executor.exec({ method: 'run', statement, params: ['test 3'] })
      ])
      await executor.exec({ method: 'exec', sql: 'COMMIT' })

      expect(acquireLock.mock.calls.length).toBe(1)
      expect(releaseLock.mock.calls.length).toBe(1)
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(pushDatabase.mock.calls.length).toBe(1)

      expect(acquireLock).toHaveBeenCalledBefore(pushDatabase)
      expect(pullDatabase).toHaveBeenCalledBefore(pushDatabase)
      expect(pushDatabase).toHaveBeenCalledBefore(releaseLock)
    })

    test('should not push database when using rollback', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'UPDATE test SET name=?', run: stmtRun }

      await executor.exec({ method: 'exec', sql: 'BEGIN TRANSACTION' })
      await Promise.all([
        executor.exec({ method: 'run', statement, params: ['test 1'] }),
        executor.exec({ method: 'run', statement, params: ['test 2'] }),
        executor.exec({ method: 'run', statement, params: ['test 3'] })
      ])
      await executor.exec({ method: 'exec', sql: 'ROLLBACK' })

      expect(acquireLock.mock.calls.length).toBe(1)
      expect(releaseLock.mock.calls.length).toBe(1)
      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(pushDatabase.mock.calls.length).toBe(0)

      expect(acquireLock).toHaveBeenCalledBefore(pullDatabase)
      expect(pullDatabase).toHaveBeenCalledBefore(releaseLock)
    })

    test('should handle params as an array', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'UPDATE test SET name=?', run: stmtRun }
      await executor.exec({
        method: 'run',
        statement,
        params: ['test 1', 'test 2']
      })

      expect(stmtRun.mock.calls.length).toBe(1)
      expect(stmtRun.mock.calls[0][0]).toEqual(['test 1', 'test 2'])
    })

    test('should handle single param as an array', async () => {
      const executor = new Executor({ s3 })
      const statement = { sql: 'UPDATE test SET name=?', run: stmtRun }
      await executor.exec({ method: 'run', statement, params: ['test 1'] })

      expect(stmtRun.mock.calls.length).toBe(1)
      expect(stmtRun.mock.calls[0][0]).toEqual(['test 1'])
    })

    test('should handle params as an object', async () => {
      const executor = new Executor({ s3 })
      const statement = {
        sql: 'UPDATE test SET name=$a WHERE name=$b',
        run: stmtRun
      }
      await executor.exec({
        method: 'run',
        statement,
        params: [
          {
            $a: 'test 1',
            $b: 'test 2'
          }
        ]
      })
      expect(stmtRun.mock.calls.length).toBe(1)
      expect(stmtRun.mock.calls[0][0]).toEqual({
        $a: 'test 1',
        $b: 'test 2'
      })
    })
  })

  describe('Executor.prepare', () => {
    test('should rethrow error on query when open database throw an error', async () => {
      pullDatabase.mockImplementation(() =>
        Promise.reject(new Error('Executor.prepare pullDatabase error'))
      )

      const executor = new Executor({ s3 })
      await expect(
        executor.prepare({ sql: 'SELECT * FROM test', params: [] })
      ).rejects.toThrow('Executor.prepare pullDatabase error')
    })

    test('should not call prepare when open database throw an error', async () => {
      pullDatabase.mockImplementation(() =>
        Promise.reject(new Error('Executor.prepare pullDatabase error2'))
      )

      const executor = new Executor({ s3 })
      await expect(
        executor.prepare({ sql: 'SELECT * FROM test', params: [] })
      ).rejects.toThrow('Executor.prepare pullDatabase error2')
      expect(prepare.mock.calls.length).toBe(0)
    })

    test('should rethrow error on query when sqlite method throw an error', async () => {
      prepare.mockImplementation((sql, params, fn) =>
        fn(new Error('prepare error'))
      )

      const executor = new Executor({ s3 })
      await expect(
        executor.prepare({ sql: 'SELECT * FROM test', params: [] })
      ).rejects.toThrow('prepare error')
    })

    test('should open database before prepare', async () => {
      const executor = new Executor({ s3 })
      await executor.prepare({ sql: 'SELECT * FROM test', params: [] })

      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(prepare.mock.calls.length).toBe(1)
      expect(pullDatabase).toHaveBeenCalledBefore(prepare)
    })

    test('should open database once when using prepare multiple times', async () => {
      const executor = new Executor({ s3 })
      await executor.prepare({ sql: 'SELECT * FROM test', params: [] })
      await executor.prepare({ sql: 'UPDATE test SET name=?', params: [] })

      expect(pullDatabase.mock.calls.length).toBe(1)
      expect(prepare.mock.calls.length).toBe(2)
    })

    test('should handle params as an array', async () => {
      const executor = new Executor({ s3 })
      await executor.prepare({
        sql: 'UPDATE test SET name=? WHERE name=?',
        params: ['test 1', 'test 2']
      })

      expect(prepare.mock.calls.length).toBe(1)
      expect(prepare.mock.calls[0][0]).toEqual(
        'UPDATE test SET name=? WHERE name=?'
      )
      expect(prepare.mock.calls[0][1]).toEqual(['test 1', 'test 2'])
    })

    test('should handle single param as an array', async () => {
      const executor = new Executor({ s3 })
      await executor.prepare({
        sql: 'UPDATE test SET name=?',
        params: ['test 1']
      })

      expect(prepare.mock.calls.length).toBe(1)
      expect(prepare.mock.calls[0][0]).toEqual('UPDATE test SET name=?')
      expect(prepare.mock.calls[0][1]).toEqual(['test 1'])
    })

    test('should handle params as an object', async () => {
      const executor = new Executor({ s3 })
      await executor.prepare({
        sql: 'UPDATE test SET name=$a WHERE name=$b',
        params: [
          {
            $a: 'test 1',
            $b: 'test 2'
          }
        ]
      })

      expect(prepare.mock.calls.length).toBe(1)
      expect(prepare.mock.calls[0][0]).toEqual(
        'UPDATE test SET name=$a WHERE name=$b'
      )
      expect(prepare.mock.calls[0][1]).toEqual({
        $a: 'test 1',
        $b: 'test 2'
      })
    })
  })

  describe('Executor.close', () => {
    test('should call close method on sqlite instance', async () => {
      const executor = new Executor({ s3 })
      await executor.exec({ method: 'run', sql: 'SELECT * FROM test' })

      await expect(executor.close()).resolves.toBeUndefined()
      expect(close.mock.calls.length).toBe(1)
    })

    test('should open database when sqlite instance is not initiated', async () => {
      const executor = new Executor({ s3 })
      await expect(executor.close()).resolves.toBeUndefined()

      expect(Database.mock.calls.length).toBe(1)
      expect(close.mock.calls.length).toBe(1)
    })

    test('should rethrow error from close method in sqlite instance', async () => {
      close.mockImplementationOnce(fn => fn(new Error('close error')))

      const executor = new Executor({ s3 })
      await executor.exec({ method: 'run', sql: 'SELECT * FROM test' })

      await expect(executor.close()).rejects.toThrow('close error')
    })
  })

  describe('Executor.open', () => {
    test('should open database when sqlite instance is not initiated', async () => {
      const executor = new Executor({ s3 })
      await expect(executor.open()).resolves.toBeUndefined()

      expect(Database.mock.calls.length).toBe(1)
    })

    test('should rethrow error from close method in sqlite instance', async () => {
      Database.mockImplementationOnce((file, fn) => fn(new Error('open error')))

      const executor = new Executor({ s3 })

      await expect(executor.open()).rejects.toThrow('open error')
    })
  })
})
