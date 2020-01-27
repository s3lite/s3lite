jest.mock('../src/database', () => jest.fn().mockImplementation(() => true))
jest.mock('../src/lib/s3')

const Database = require('../src/database')
const S3 = require('../src/lib/s3')
const { S3LiteError } = require('../src/lib/errors')

const S3Lite = require('../src/s3lite')

describe('S3Lite.database', () => {
  let s3Filename
  let region

  beforeEach(() => {
    S3.mockReset()
    Database.mockReset()

    s3Filename = 's3://bucket-name/database.sqlite'
    region = 'eu-west-1'
  })

  test('should be a function', () => {
    expect(S3Lite.database).toBeFunction()
  })

  test('should throws an region configuration error when no region provided', () => {
    expect(() => S3Lite.database(s3Filename)).toThrow(
      S3LiteError,
      'A region configuration value is required'
    )
  })

  test('should overwrite s3Options region with retrieved from given s3Filename', () => {
    S3Lite.database(
      'https://bucket-name.s3.eu-central-1.amazonaws.com/database.sqlite',
      {
        s3Options: {
          region,
          key: 'value'
        }
      }
    )
    expect(S3).toBeCalledWith(
      expect.objectContaining({
        s3Options: { key: 'value', region: 'eu-central-1' }
      })
    )
    expect(Database).toBeCalled()
  })

  test('should respects given limits', () => {
    S3Lite.database(
      'https://bucket-name.s3.eu-central-1.amazonaws.com/database.sqlite',
      {
        acquireLockRetryTimeout: 666,
        remoteDatabaseCacheTime: 1337
      }
    )
    expect(S3).toBeCalledWith(
      expect.objectContaining({
        acquireLockRetryTimeout: 666,
        remoteDatabaseCacheTime: 1337,
        minLockLifetime: 1000,
        maxLockLifetime: 60000
      })
    )
    expect(Database).toBeCalled()
  })

  test('should returns Database object when success', () => {
    Database.mockImplementation(jest.requireActual('../src/database'))
    const db = S3Lite.database(s3Filename, {
      s3Options: {
        region
      }
    })
    expect(db).toHaveProperty('all', expect.any(Function))
    expect(db).toHaveProperty('exec', expect.any(Function))
    expect(db).toHaveProperty('get', expect.any(Function))
    expect(db).toHaveProperty('run', expect.any(Function))
    expect(db).toHaveProperty('prepare', expect.any(Function))
  })

  test('should throw an error when localFilePath option is not a string', () => {
    const error = 'localFilePath value needs to be a non empty string'
    expect(() => S3Lite.database(s3Filename, { localFilePath: 1234 })).toThrow(
      S3LiteError,
      error
    )
    expect(() =>
      S3Lite.database(s3Filename, { localFilePath: ['test'] })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { localFilePath: { a: 1 } })
    ).toThrow(S3LiteError, error)
    expect(() => S3Lite.database(s3Filename, { localFilePath: null })).toThrow(
      S3LiteError,
      error
    )
    expect(() => S3Lite.database(s3Filename, { localFilePath: '' })).toThrow(
      S3LiteError,
      error
    )
  })

  test('should throw an error when s3Options is not an object', () => {
    const error = 's3Options needs to be an object'
    expect(() => S3Lite.database(s3Filename, { s3Options: 1234 })).toThrow(
      S3LiteError,
      error
    )
    expect(() => S3Lite.database(s3Filename, { s3Options: ['test'] })).toThrow(
      S3LiteError,
      error
    )
    expect(() => S3Lite.database(s3Filename, { s3Options: 'options' })).toThrow(
      S3LiteError,
      error
    )
    expect(() => S3Lite.database(s3Filename, { s3Options: null })).toThrow(
      S3LiteError,
      error
    )
  })

  test('should throw an error when acquireLockRetryTimeout is not a positive number', () => {
    const error = 'acquireLockRetryTimeout needs to be an positive number'
    expect(() =>
      S3Lite.database(s3Filename, { acquireLockRetryTimeout: -1 })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { acquireLockRetryTimeout: ['test'] })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { acquireLockRetryTimeout: { a: 1 } })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { acquireLockRetryTimeout: 'options' })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { acquireLockRetryTimeout: null })
    ).toThrow(S3LiteError, error)
  })

  test('should throw an error when remoteDatabaseCacheTime is not a positive number', () => {
    const error = 'remoteDatabaseCacheTime needs to be an positive number'
    expect(() =>
      S3Lite.database(s3Filename, { remoteDatabaseCacheTime: -1 })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { remoteDatabaseCacheTime: ['test'] })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { remoteDatabaseCacheTime: { a: 1 } })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { remoteDatabaseCacheTime: 'options' })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { remoteDatabaseCacheTime: null })
    ).toThrow(S3LiteError, error)
  })

  test('should throw an error when maxRetryOnRemoteDatabaseUpdated is not a positive number', () => {
    const error =
      'maxRetryOnRemoteDatabaseUpdated needs to be an positive number'
    expect(() =>
      S3Lite.database(s3Filename, { maxRetryOnRemoteDatabaseUpdated: -1 })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { maxRetryOnRemoteDatabaseUpdated: ['test'] })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { maxRetryOnRemoteDatabaseUpdated: { a: 1 } })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, {
        maxRetryOnRemoteDatabaseUpdated: 'options'
      })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { maxRetryOnRemoteDatabaseUpdated: null })
    ).toThrow(S3LiteError, error)
  })

  test('should throw an error when maxLockLifetime is not a positive number', () => {
    const error = 'maxLockLifetime needs to be an positive number'
    expect(() => S3Lite.database(s3Filename, { maxLockLifetime: -1 })).toThrow(
      S3LiteError,
      error
    )
    expect(() =>
      S3Lite.database(s3Filename, { maxLockLifetime: ['test'] })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { maxLockLifetime: { a: 1 } })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { maxLockLifetime: 'options' })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { maxLockLifetime: null })
    ).toThrow(S3LiteError, error)
  })

  test('should throw an error when minLockLifetime is not a positive number', () => {
    const error = 'minLockLifetime needs to be an positive number'
    expect(() => S3Lite.database(s3Filename, { minLockLifetime: -1 })).toThrow(
      S3LiteError,
      error
    )
    expect(() =>
      S3Lite.database(s3Filename, { minLockLifetime: ['test'] })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { minLockLifetime: { a: 1 } })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { minLockLifetime: 'options' })
    ).toThrow(S3LiteError, error)
    expect(() =>
      S3Lite.database(s3Filename, { minLockLifetime: null })
    ).toThrow(S3LiteError, error)
  })

  test('should throw an error when minLockLifetime is greater than maxLockLifetime', () => {
    const error = 'minLockLifetime needs to be lower than maxLockLifetime'
    expect(() =>
      S3Lite.database(s3Filename, { minLockLifetime: 10, maxLockLifetime: 1 })
    ).toThrow(S3LiteError, error)
  })
})
