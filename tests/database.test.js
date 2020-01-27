const Database = require('../src/database')

const exec = jest.fn()
const prepare = jest.fn()
const close = jest.fn()
const executor = {
  exec,
  close,
  prepare
}

describe('Database', () => {
  let sql

  beforeEach(() => {
    exec.mockReset().mockImplementation(() => Promise.resolve({ instance: {} }))
    prepare
      .mockReset()
      .mockImplementation(() => Promise.resolve({ instance: {} }))
    close.mockReset().mockImplementation(() => Promise.resolve())
    sql = 'SELECT * FROM test'
  })

  describe('Database.all', () => {
    test('should call executor exec with method all, sql and empty params', async () => {
      const db = new Database({ executor })
      await db.all(sql)

      expect(exec).toBeCalledWith({
        method: 'all',
        sql,
        params: []
      })
    })

    test('should call executor exec with method all, sql and params given as an arguments', async () => {
      const db = new Database({ executor })
      await db.all(sql, 1, 2, 3)

      expect(exec).toBeCalledWith({
        method: 'all',
        sql,
        params: [1, 2, 3]
      })
    })

    test('should return result from executor exec straight forward', async () => {
      exec.mockImplementation(() =>
        Promise.resolve({ result: [{ id: 1, name: 'test' }] })
      )
      const db = new Database({ executor })
      const result = await db.all(sql)

      expect(result).toEqual([{ id: 1, name: 'test' }])
    })
  })

  describe('Database.exec', () => {
    test('should call executor exec with method exec and sql', async () => {
      const db = new Database({ executor })
      await db.exec(sql)

      expect(exec).toBeCalledWith({
        method: 'exec',
        sql
      })
    })

    test('should return database object from executor exec given by the instance object', async () => {
      exec.mockImplementation(() => Promise.resolve({ instance: { sql } }))
      const db = new Database({ executor })
      const result = await db.exec(sql)

      expect(result).toBe(db)
    })
  })

  describe('Database.get', () => {
    test('should call executor exec with method get, sql and empty params', async () => {
      const db = new Database({ executor })
      await db.get(sql)

      expect(exec).toBeCalledWith({
        method: 'get',
        sql,
        params: []
      })
    })

    test('should call executor exec with method get, sql and params given as an arguments', async () => {
      const db = new Database({ executor })
      await db.get(sql, 4, 5)

      expect(exec).toBeCalledWith({
        method: 'get',
        sql,
        params: [4, 5]
      })
    })

    test('should return result from executor exec straight forward', async () => {
      exec.mockImplementation(() =>
        Promise.resolve({ result: { id: 1, name: 'test' } })
      )
      const db = new Database({ executor })
      const result = await db.get(sql)

      expect(result).toEqual({ id: 1, name: 'test' })
    })
  })

  describe('Database.run', () => {
    test('should call executor exec with method run, sql and empty params', async () => {
      const db = new Database({ executor })
      await db.run(sql)

      expect(exec).toBeCalledWith({
        method: 'run',
        sql,
        params: []
      })
    })

    test('should call executor exec with method run, sql and params given as an arguments', async () => {
      const db = new Database({ executor })
      await db.run(sql, 'test1', 'test2')

      expect(exec).toBeCalledWith({
        method: 'run',
        sql,
        params: ['test1', 'test2']
      })
    })

    test('should return lastID and changes from executor exec given by the instance object', async () => {
      exec.mockImplementation(() =>
        Promise.resolve({ instance: { sql, lastID: 4, changes: 1 } })
      )
      const db = new Database({ executor })
      const result = await db.run(sql)

      expect(result).toEqual({ sql, lastID: 4, changes: 1 })
    })
  })

  describe('Database.prepare', () => {
    test('should init Statement object with sql and empty params', async () => {
      const db = new Database({ executor })
      await db.prepare(sql)

      expect(prepare).toBeCalledWith(
        expect.objectContaining({
          sql,
          params: []
        })
      )
    })

    test('should init Statement object with sql and given params', async () => {
      const db = new Database({ executor })
      await db.prepare(sql, 'a', 2)

      expect(prepare).toBeCalledWith(
        expect.objectContaining({
          sql,
          params: ['a', 2]
        })
      )
    })

    test('should return Statement object', async () => {
      const db = new Database({ executor })
      const stmt = await db.prepare(sql)

      expect(stmt).toEqual({
        all: expect.any(Function),
        get: expect.any(Function),
        run: expect.any(Function),
        bind: expect.any(Function),
        reset: expect.any(Function),
        finalize: expect.any(Function),
        sql: undefined,
        lastID: undefined,
        changes: undefined
      })
    })
  })

  describe('Database.close', () => {
    test('should call executor close method', async () => {
      const db = new Database({ executor })
      await db.close()

      expect(close).toBeCalled()
    })
  })
})
