/* eslint-disable prefer-promise-reject-errors */
jest.mock('aws-sdk', () => jest.fn())
jest.mock('md5', () => jest.fn().mockReturnValue('md5'))
jest.mock('../../src/lib/utils', () => jest.fn())
jest.mock('../../src/lib/lockFile', () => jest.fn())

const AWS = require('aws-sdk')
const Utils = require('../../src/lib/utils')
const LockFile = require('../../src/lib/lockFile')

const getFile = jest.fn()
const saveToFile = jest.fn()
const now = jest.fn()
const wait = jest.fn()
const getObject = jest.fn()
const putObject = jest.fn()
const deleteObject = jest.fn()
const getLockContent = jest.fn()
const isValid = jest.fn()
const saveTime = jest.fn()
const awsS3 = jest.fn()

AWS.S3 = awsS3
Utils.getLocalFileName = (path, file) => `${path.replace(/(\/)+$/, '')}/${file}`
Utils.getFile = getFile
Utils.saveToFile = saveToFile
Utils.now = now
Utils.wait = wait

const S3 = require('../../src/lib/s3')
const { S3RemoteDatabaseUpdatedError } = require('../../src/lib/errors')

describe('S3', () => {
  let s3Params

  beforeEach(() => {
    getObject.mockClear().mockImplementation(() => Promise.resolve({}))
    putObject
      .mockClear()
      .mockImplementation(() => Promise.resolve({ ETag: 'md5' }))
    deleteObject.mockClear().mockImplementation(() => Promise.resolve({}))
    awsS3.mockClear().mockImplementation(() => ({
      getObject: params => ({
        promise: () => getObject(params)
      }),
      putObject: params => ({
        promise: () => putObject(params)
      }),
      deleteObject: params => ({
        promise: () => deleteObject(params)
      })
    }))
    getLockContent.mockClear().mockReturnValue('lock content')
    isValid.mockClear().mockReturnValue(false)
    saveTime.mockClear()
    LockFile.mockClear().mockImplementation(() => ({
      getLockContent,
      isValid,
      saveTime
    }))
    getFile.mockClear().mockImplementation(() => Promise.resolve())
    saveToFile.mockClear().mockImplementation(() => Promise.resolve())
    wait.mockClear().mockImplementation(() => Promise.resolve())
    now.mockClear().mockReturnValue(1)
    s3Params = {
      bucket: 'bucket-name',
      fileName: 'database.sqlite',
      localFilePath: '/tmp',
      acquireLockRetryTimeout: 1337,
      remoteDatabaseCacheTime: 0,
      minLockLifetime: 100,
      maxLockLifetime: 10000,
      s3Options: {
        region: 'eu-west-1'
      }
    }
  })

  describe('S3.pullDatabase', () => {
    test('should call getObject with proper params', async () => {
      getObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag',
          Body: 'body'
        })
      )

      const s3 = new S3(s3Params)
      await s3.pullDatabase()

      expect(getObject).toBeCalledWith({
        Bucket: 'bucket-name',
        Key: 'database.sqlite',
        IfNoneMatch: undefined
      })
    })

    test('should use IfNoneMatch with getObject when pulling database second time', async () => {
      getObject.mockReturnValue(
        Promise.resolve({
          ETag: 'etag',
          Body: 'body'
        })
      )

      const s3 = new S3(s3Params)
      await s3.pullDatabase(false)
      await s3.pullDatabase(false)

      expect(getObject.mock.calls.length).toBe(2)
      expect(getObject.mock.calls[0][0]).toEqual({
        Bucket: 'bucket-name',
        Key: 'database.sqlite',
        IfNoneMatch: undefined
      })
      expect(getObject.mock.calls[1][0]).toEqual({
        Bucket: 'bucket-name',
        Key: 'database.sqlite',
        IfNoneMatch: 'etag'
      })
    })

    test('should respect remoteDatabaseCacheTime when pulling database second time', async () => {
      getObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag',
          Body: 'body'
        })
      )

      const s3 = new S3({ ...s3Params, remoteDatabaseCacheTime: 10000 })
      await s3.pullDatabase()
      await s3.pullDatabase()

      expect(getObject.mock.calls.length).toBe(1)
      expect(getObject.mock.calls[0][0]).toEqual({
        Bucket: 'bucket-name',
        Key: 'database.sqlite',
        IfNoneMatch: undefined
      })
    })

    test('should call saveToFile function with proper params', async () => {
      getObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag',
          Body: 'body'
        })
      )

      const s3 = new S3({ ...s3Params, localFilePath: '/test' })
      await s3.pullDatabase()

      expect(saveToFile).toBeCalledWith('/test/database.sqlite', 'body')
    })

    test('should save database pulling time in lockFile object', async () => {
      getObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag',
          Body: 'body'
        })
      )

      const s3 = new S3({ ...s3Params, localFilePath: '/test' })
      await s3.pullDatabase()

      expect(saveTime).toBeCalledWith('pullDatabase', 1)
    })

    test('should properly resolve file database local name when getObject throws 404 error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 404
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.pullDatabase()).resolves.toEqual('/tmp/database.sqlite')
    })

    test('should properly resolve file database local name when getObject throws 304 error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 304
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.pullDatabase()).resolves.toEqual('/tmp/database.sqlite')
    })

    test('should rethrow error when getObject throws different than 304 or 404 error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 500
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.pullDatabase()).rejects.toEqual({
        statusCode: 500
      })
    })
  })

  describe('S3.pushDatabase', () => {
    test('should call putObject with proper params', async () => {
      getFile.mockReturnValueOnce(Promise.resolve('body'))

      const s3 = new S3(s3Params)
      await s3.pushDatabase()

      expect(putObject).toBeCalledWith({
        Bucket: 'bucket-name',
        Key: 'database.sqlite',
        Body: 'body'
      })
    })

    test('should call getFile function with proper file name', async () => {
      const s3 = new S3({ ...s3Params, localFilePath: '/test' })
      await s3.pushDatabase()

      expect(getFile).toBeCalledWith('/test/database.sqlite')
    })

    test('should save database pushing time in lockFile object', async () => {
      const s3 = new S3({ ...s3Params, localFilePath: '/test' })
      await s3.pushDatabase()

      expect(saveTime).toBeCalledWith('pushDatabase', 1)
    })

    test('should throw S3RemoteDatabaseUpdatedError when etag is different than md5 content', async () => {
      putObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag-different'
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.pushDatabase()).rejects.toThrow(
        S3RemoteDatabaseUpdatedError,
        'ETag different from ContentMD5'
      )
    })

    test('should rethrow error when getObject throws error', async () => {
      putObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 500
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.pushDatabase()).rejects.toEqual({
        statusCode: 500
      })
    })
  })

  describe('S3.releaseLock', () => {
    test('should call getObject with proper params', async () => {
      const s3 = new S3(s3Params)
      await s3.releaseLock()

      expect(getObject).toBeCalledWith({
        Bucket: 'bucket-name',
        Key: 'database.sqlite.lock',
        IfMatch: 'md5'
      })
    })

    test('should call deleteObject when getObject returns lock file', async () => {
      const s3 = new S3({ ...s3Params, localFilePath: '/test' })
      await s3.releaseLock()

      expect(deleteObject).toBeCalledWith({
        Bucket: 'bucket-name',
        Key: 'database.sqlite.lock'
      })
      expect(deleteObject).toHaveBeenCalledAfter(getObject)
    })

    test('should not call deleteObject when getObject throw error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 404
        })
      )

      const s3 = new S3(s3Params)
      await s3.releaseLock()

      expect(deleteObject.mock.calls.length).toBe(0)
    })

    test('should properly resolves when getObject throws an error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 500
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.releaseLock()).resolves.toBeUndefined()
    })

    test('should properly resolves when getObject throws an error', async () => {
      deleteObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 500
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.releaseLock()).resolves.toBeUndefined()
      expect(deleteObject.mock.calls.length).toBe(1)
    })
  })

  describe('S3.acquireLock', () => {
    test('should call getObject with proper params', async () => {
      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(getObject).toBeCalledWith({
        Bucket: 'bucket-name',
        Key: 'database.sqlite.lock'
      })
    })

    test('should call putObject with proper params', async () => {
      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(putObject).toBeCalledWith({
        Bucket: 'bucket-name',
        Key: 'database.sqlite.lock',
        Body: 'lock content'
      })
    })

    test('should create lock when getObject throws 404 error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 404
        })
      )

      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(getObject.mock.calls.length).toBe(1)
      expect(putObject.mock.calls.length).toBe(1)
    })

    test('should rethrow error when getObject throws different than 404 error', async () => {
      getObject.mockReturnValueOnce(
        Promise.reject({
          statusCode: 500
        })
      )

      const s3 = new S3(s3Params)
      await expect(s3.acquireLock()).rejects.toEqual({
        statusCode: 500
      })
    })

    test('should try to create lock again when existing lock file is not valid', async () => {
      isValid.mockReturnValueOnce(true)

      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(getObject.mock.calls.length).toBe(2)
      expect(putObject.mock.calls.length).toBe(1)
    })

    test('should wait given amount of time before trying to create lock again', async () => {
      isValid.mockReturnValueOnce(true)

      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(wait).toBeCalledWith(1337)
    })

    test('should try to create lock again when other process created lock already', async () => {
      putObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag-different'
        })
      )

      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(getObject.mock.calls.length).toBe(2)
      expect(putObject.mock.calls.length).toBe(2)
    })

    test('should wait given amount of time before trying to create lock again', async () => {
      putObject.mockReturnValueOnce(
        Promise.resolve({
          ETag: 'etag-different'
        })
      )

      const s3 = new S3(s3Params)
      await s3.acquireLock()

      expect(wait).toBeCalledWith(1337)
    })
  })
})
