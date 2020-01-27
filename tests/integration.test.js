/* eslint-disable prefer-promise-reject-errors */
jest.mock('mkdirp', () =>
  jest.fn().mockImplementation((directory, fn) => fn(null))
)
jest.mock('aws-sdk', () => jest.fn())

require('mkdirp')
const fs = require('fs')
const AWS = require('aws-sdk')
const Utils = require('../src/lib/utils')

AWS.S3 = jest.fn().mockImplementation(() => {
  const md5 = require('md5')
  return {
    getObject: () => ({
      promise: () => {
        return Promise.reject({ statusCode: 404 })
      }
    }),
    putObject: ({ Body }) => ({
      promise: () => {
        return Promise.resolve({ ETag: md5(Body) })
      }
    }),
    deleteObject: () => ({
      promise: () => Promise.resolve({})
    })
  }
})
fs.readFile = jest.fn().mockImplementation((fileName, fn) => fn(null, 'body'))
fs.writeFile = jest.fn().mockImplementation((fileName, body, fn) => fn(null))

Utils.getLocalFileName = jest.fn().mockReturnValue(':memory:')

const S3Lite = require('../index')

describe('S3Lite Integration Tests', () => {
  const db = S3Lite.database('https://bucket.s3.eu-west-1.amazonaws.com/db')

  beforeAll(async () => {
    await db.exec(`
      DROP TABLE IF EXISTS test;
      CREATE TABLE test(id INTEGER PRIMARY KEY, name TEXT, control INTEGER);
      INSERT INTO test VALUES(1, 'foo1', 1);
      INSERT INTO test VALUES(2, 'foo2', 2);
      INSERT INTO test VALUES(3, 'foo3', 3);
      INSERT INTO test VALUES(4, 'bar1', 1);
      INSERT INTO test VALUES(5, 'bar2', 2);
      INSERT INTO test VALUES(6, 'bar3', 3);
    `)
  })

  afterAll(async () => {
    await db.close()
  })

  describe('Database', () => {
    test('should return proper number of items', async () => {
      const result = await db.all('SELECT * FROM test')
      expect(result.length).toBe(6)
    })

    test('should return empty array when nothing found', async () => {
      const result = await db.all(
        'SELECT * FROM test WHERE name=?',
        'not found'
      )
      expect(result).toEqual([])
    })

    test('should return list of objects', async () => {
      const result = await db.all('SELECT * FROM test WHERE name=? OR name=?', [
        'foo1',
        'bar1'
      ])
      expect(result).toEqual([
        { id: 1, name: 'foo1', control: expect.any(Number) },
        { id: 4, name: 'bar1', control: expect.any(Number) }
      ])
    })

    test('should return object with method get', async () => {
      const result = await db.get('SELECT * FROM test WHERE name=?', ['bar3'])
      expect(result).toEqual({
        id: 6,
        name: 'bar3',
        control: expect.any(Number)
      })
    })

    test('should return undefined when nothing found', async () => {
      const result = await db.get('SELECT * FROM test WHERE name=?', [
        'not found'
      ])
      expect(result).toBeUndefined()
    })

    test('should return number of changes if any', async () => {
      const result = await db.run(
        'UPDATE test SET control=4 WHERE name LIKE ?',
        'foo%'
      )
      expect(result.changes).toBe(3)
    })

    test('should return last inserted id', async () => {
      const result = await db.run(
        'INSERT INTO test VALUES(null, ?, ?)',
        'new',
        1
      )
      expect(result.lastID).toBe(7)
      await db.run('DELETE FROM test WHERE name=?', 'new')
    })

    test('should rollback transaction', async () => {
      await Promise.all([
        db.run('BEGIN TRANSACTION'),
        db.run('UPDATE test SET name=?', 'updated'),
        db.run('ROLLBACK')
      ])
      const result = await db.all('SELECT * FROM test WHERE name=?', 'updated')
      expect(result.length).toBe(0)
    })

    test('should commit transaction', async () => {
      await Promise.all([
        db.run('BEGIN TRANSACTION'),
        db.run('UPDATE test SET control=?', 10),
        db.run('COMMIT')
      ])
      const result = await db.all('SELECT * FROM test WHERE control=?', 10)
      expect(result.length).toBe(6)
    })
  })

  describe('Statement', () => {
    test('should return proper number of items', async () => {
      const stmt = await db.prepare('SELECT * FROM test')
      const result = await stmt.all()
      expect(result.length).toBe(6)
    })

    test('should return empty array when nothing found', async () => {
      const stmt = await db.prepare('SELECT * FROM test WHERE name=?')
      const result = await stmt.all('not found')
      expect(result).toEqual([])
    })

    test('should return list of objects', async () => {
      const stmt = await db.prepare('SELECT * FROM test WHERE name=? OR name=?')
      const result = await stmt.all(['foo1', 'bar1'])
      expect(result).toEqual([
        { id: 1, name: 'foo1', control: expect.any(Number) },
        { id: 4, name: 'bar1', control: expect.any(Number) }
      ])
    })

    test('should return object with method get', async () => {
      const stmt = await db.prepare('SELECT * FROM test WHERE name=?')
      const result = await stmt.get(['bar3'])
      expect(result).toEqual({
        id: 6,
        name: 'bar3',
        control: expect.any(Number)
      })
    })

    test('should return undefined when nothing found', async () => {
      const stmt = await db.prepare('SELECT * FROM test WHERE name=?')
      const result = await stmt.get(['not found'])
      expect(result).toBeUndefined()
    })

    test('should return number of changes if any', async () => {
      const stmt = await db.prepare(
        'UPDATE test SET control=4 WHERE name LIKE ?'
      )
      const result = await stmt.run('foo%')
      expect(result.changes).toBe(3)
    })

    test('should return last inserted id', async () => {
      const stmt = await db.prepare('INSERT INTO test VALUES(null, ?, ?)')
      const result = await stmt.run('new', 1)
      expect(result.lastID).toBe(7)
      await db.run('DELETE FROM test WHERE name=?', 'new')
    })

    test('should rollback transaction', async () => {
      const stmt = await db.prepare('UPDATE test SET name=?')
      await Promise.all([
        db.run('BEGIN TRANSACTION'),
        stmt.run('updated'),
        db.run('ROLLBACK')
      ])
      const result = await db.all('SELECT * FROM test WHERE name=?', 'updated')
      expect(result.length).toBe(0)
    })

    test('should commit transaction', async () => {
      const stmt = await db.prepare('UPDATE test SET control=?')
      await Promise.all([
        db.run('BEGIN TRANSACTION'),
        stmt.run(10),
        db.run('COMMIT')
      ])
      const result = await db.all('SELECT * FROM test WHERE control=?', 10)
      expect(result.length).toBe(6)
    })
  })
})
