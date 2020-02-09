jest.mock('md5', () => jest.fn().mockReturnValue('md5'))
jest.mock('fs')
jest.mock('mkdirp', () =>
  jest.fn().mockImplementation((directory, fn) => fn(null))
)

const fs = require('fs')
const mkdirp = require('mkdirp')
const { S3LiteError } = require('../../src/lib/errors')

const Utils = require('../../src/lib/utils')

const readFile = jest
  .fn()
  .mockImplementation((fileName, fn) => fn(null, 'body'))
const writeFile = jest.fn().mockImplementation((fileName, body, fn) => fn(null))
const unlink = jest.fn().mockImplementation((fileName, fn) => fn(null))
fs.readFile = readFile
fs.writeFile = writeFile
fs.unlink = unlink

describe('Utils', () => {
  describe('Utils.parseS3Filename', () => {
    test('should be a function', () => {
      expect(Utils.parseS3Filename).toBeFunction()
    })

    test('should parse virtual hosted style s3 path over https', () => {
      const result = Utils.parseS3Filename(
        'https://bucket-name.s3.eu-west-1.amazonaws.com/database.sqlite'
      )
      expect(result).toEqual({
        region: 'eu-west-1',
        bucket: 'bucket-name',
        fileName: 'database.sqlite'
      })
    })

    test('should parse virtual hosted style s3 path over http', () => {
      const result = Utils.parseS3Filename(
        'http://bucket-name.s3.us-east-1.amazonaws.com/database.sqlite'
      )
      expect(result).toEqual({
        region: 'us-east-1',
        bucket: 'bucket-name',
        fileName: 'database.sqlite'
      })
    })

    test('should parse path style s3 path over https', () => {
      const result = Utils.parseS3Filename(
        'https://s3.eu-west-1.amazonaws.com/bucket-name/database.sqlite'
      )
      expect(result).toEqual({
        region: 'eu-west-1',
        bucket: 'bucket-name',
        fileName: 'database.sqlite'
      })
    })

    test('should parse path style s3 path over http', () => {
      const result = Utils.parseS3Filename(
        'http://s3.us-east-1.amazonaws.com/bucket-name/database.sqlite'
      )
      expect(result).toEqual({
        region: 'us-east-1',
        bucket: 'bucket-name',
        fileName: 'database.sqlite'
      })
    })

    test('should parse aws cli s3 path', () => {
      const result = Utils.parseS3Filename('s3://bucket-name/database.sqlite')
      expect(result).toEqual({
        bucket: 'bucket-name',
        fileName: 'database.sqlite'
      })
    })

    test('should throw an error when given s3 path is not a string', () => {
      const error = 's3Filename value needs to be a string'
      expect(() => Utils.parseS3Filename(1234)).toThrow(S3LiteError, error)
      expect(() => Utils.parseS3Filename(['test'])).toThrow(S3LiteError, error)
      expect(() => Utils.parseS3Filename({ a: 1 })).toThrow(S3LiteError, error)
    })

    test('should throw an error when unable to parse given path', () => {
      const error =
        "Can't retrieve bucketName and fileName from the given s3Filename"
      expect(() =>
        Utils.parseS3Filename(
          'https://s3.eu-west-1.amazonaws.com/database.sqlite'
        )
      ).toThrow(S3LiteError, error)
      expect(() =>
        Utils.parseS3Filename(
          '//bucket-name.s3.eu-west-1.amazonaws.com/database.sqlite'
        )
      ).toThrow(S3LiteError, error)
      expect(() =>
        Utils.parseS3Filename('https://bucket-name.s3.eu-west-1.amazonaws.com/')
      ).toThrow(S3LiteError, error)
      expect(() =>
        Utils.parseS3Filename(
          'https://bucket-name.s3.amazonaws.com/database.sqlite'
        )
      ).toThrow(S3LiteError, error)
    })
  })

  describe('Utils.getLocalFileName', () => {
    test('should be a function', () => {
      expect(Utils.getLocalFileName).toBeFunction()
    })

    test('should return proper path', () => {
      const result = Utils.getLocalFileName('/path', 'test.sqlite')
      expect(result).toEqual('/path/test.sqlite.md5')
    })

    test('should trim ending slashes', () => {
      const result = Utils.getLocalFileName('/path//', 'test.sqlite')
      expect(result).toEqual('/path/test.sqlite.md5')
    })
  })

  describe('Utils.now', () => {
    test('should be a function', () => {
      expect(Utils.now).toBeFunction()
    })

    test('should return positive number', () => {
      const result = Utils.now()
      expect(result).toBePositive()
    })
  })

  describe('Utils.wait', () => {
    test('should be a function', () => {
      expect(Utils.wait).toBeFunction()
    })

    test('should resolves promise', async () => {
      await expect(Utils.wait(1)).resolves.toBeUndefined()
    })

    test('should call native setTimeout with proper params', async () => {
      jest.useFakeTimers()
      const result = Utils.wait(1337)

      expect(setTimeout).toHaveBeenCalledTimes(1)
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1337)

      jest.runAllTimers()
      await expect(result).resolves.toBeUndefined()

      jest.useRealTimers()
    })
  })

  describe('Utils.saveToFile', () => {
    beforeEach(() => {
      mkdirp.mockClear()
      writeFile.mockClear()
    })

    test('should be a function', () => {
      expect(Utils.saveToFile).toBeFunction()
    })

    test('should resolve promise when properly save to file', async () => {
      await expect(Utils.saveToFile('/tmp/test', 'body')).resolves.toEqual(
        '/tmp/test'
      )
      expect(mkdirp).toBeCalled()
      expect(writeFile).toBeCalled()
    })

    test('should call mkdirp with proper directory', async () => {
      await expect(
        Utils.saveToFile('/tmp/subdir1/subdir2/database.sqlite', 'body')
      ).resolves.toEqual('/tmp/subdir1/subdir2/database.sqlite')
      expect(mkdirp).toBeCalledWith(
        '/tmp/subdir1/subdir2',
        expect.any(Function)
      )

      await expect(
        Utils.saveToFile('/database.sqlite', 'body')
      ).resolves.toEqual('/database.sqlite')
      expect(mkdirp).toBeCalledWith('', expect.any(Function))
    })

    test('should call mkdirp with proper directory for windows', async () => {
      await expect(
        Utils.saveToFile('C:\\Temp\\Database\\database.sqlite', 'body')
      ).resolves.toEqual('C:\\Temp\\Database\\database.sqlite')
      expect(mkdirp).toBeCalledWith('C:\\Temp\\Database', expect.any(Function))
    })

    test('should reject promise when error in mkdirp occurred', async () => {
      mkdirp.mockImplementationOnce((directory, fn) => fn('error'))
      await expect(Utils.saveToFile('/tmp/test', 'body')).rejects.toEqual(
        'error'
      )
    })

    test('should reject promise when error in writeFile occurred', async () => {
      writeFile.mockImplementationOnce((fileName, body, fn) => fn('error'))
      await expect(Utils.saveToFile('/tmp/test', 'body')).rejects.toEqual(
        'error'
      )
    })
  })

  describe('Utils.getFile', () => {
    beforeEach(() => {
      readFile.mockClear()
    })

    test('should be a function', () => {
      expect(Utils.getFile).toBeFunction()
    })

    test('should resolve promise when properly read from file', async () => {
      await expect(Utils.getFile('test')).resolves.toEqual('body')
      expect(readFile).toBeCalled()
    })

    test('should reject promise when error occurred', async () => {
      readFile.mockImplementationOnce((fileName, fn) => fn('error'))
      await expect(Utils.getFile('test')).rejects.toEqual('error')
    })
  })

  describe('Utils.removeFile', () => {
    beforeEach(() => {
      unlink.mockClear()
    })

    test('should be a function', () => {
      expect(Utils.removeFile).toBeFunction()
    })

    test('should resolve promise when properly remove the file', async () => {
      await expect(Utils.removeFile('test')).resolves.toEqual('test')
      expect(readFile).toBeCalled()
    })

    test('should reject promise when error occurred', async () => {
      unlink.mockImplementationOnce((fileName, fn) => fn('error'))
      await expect(Utils.removeFile('test')).rejects.toEqual('error')
    })
  })
})
