jest.mock('../../src/lib/utils', () => jest.fn())

const Utils = require('../../src/lib/utils')

const now = jest.fn().mockReturnValue(1e8)
Utils.now = now

const LockFile = require('../../src/lib/lockFile')

describe('LockFile', () => {
  let minLockLifetime
  let maxLockLifetime

  beforeEach(() => {
    now.mockClear()
    minLockLifetime = 1000
    maxLockLifetime = 60000
  })

  describe('LockFile.getLockContent', () => {
    test('should return proper stringified json object', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      const result = lockFile.getLockContent()

      expect(result).toStrictEqual(expect.any(String))
      expect(JSON.parse(result)).toEqual({
        id: expect.any(String),
        validTo: expect.any(Number)
      })
    })

    test('should return minLockLifeTime when calculated on is below', () => {
      minLockLifetime = 678
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      const result = JSON.parse(lockFile.getLockContent())

      expect(result).toEqual({
        id: expect.any(String),
        validTo: 678
      })
    })

    test('should return maxLockLifeTime when calculated on is below', () => {
      maxLockLifetime = 1337

      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      lockFile.saveTime('test', 1e6)

      const result = JSON.parse(lockFile.getLockContent())

      expect(result).toEqual({
        id: expect.any(String),
        validTo: 1337
      })
    })

    test('should return proper calculated validTo property when only one save time have been triggered', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      lockFile.saveTime('test', now() - 1345)

      const result = JSON.parse(lockFile.getLockContent())

      expect(result).toEqual({
        id: expect.any(String),
        validTo: now() + 1345 * 3
      })
    })

    test('should return proper calculated validTo property when two save times have been triggered', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      lockFile.saveTime('test', now() - 1345)
      lockFile.saveTime('test2', now() - 655)

      const result = JSON.parse(lockFile.getLockContent())

      expect(result).toEqual({
        id: expect.any(String),
        validTo: now() + (1345 + 655) * 2
      })
    })

    test('should return proper calculated validTo property when save time has been updated', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      lockFile.saveTime('test', now() - 1345)
      lockFile.saveTime('test', now() - 655)

      const result = JSON.parse(lockFile.getLockContent())

      expect(result).toEqual({
        id: expect.any(String),
        validTo: 1e8 + 655 * 3
      })
    })
  })

  describe('LockFile.isValid', () => {
    test('should return true when validTo is grater than now', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      const result = lockFile.isValid(JSON.stringify({ validTo: now() + 10 }))

      expect(result).toBeTrue()
    })

    test('should return true when validTo is equal to now', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      const result = lockFile.isValid(JSON.stringify({ validTo: now() }))

      expect(result).toBeTrue()
    })

    test('should return false when validTo is lower than now', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      const result = lockFile.isValid(JSON.stringify({ validTo: now() - 10 }))

      expect(result).toBeFalse()
    })

    test('should return false when json string is not valid', () => {
      const lockFile = new LockFile({ minLockLifetime, maxLockLifetime })
      const result = lockFile.isValid('not valid json')

      expect(result).toBeFalse()
    })
  })
})
