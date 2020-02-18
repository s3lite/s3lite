# [![S3Lite → SQLite + S3](https://avatars0.githubusercontent.com/u/60323596?s=36&v=4)](https://github.com/s3lite/s3lite) S3Lite → SQLite + S3

[![Build Status](https://img.shields.io/travis/com/s3lite/s3lite)](https://travis-ci.com/s3lite/s3lite)
[![Code Coverage](https://img.shields.io/coveralls/github/s3lite/s3lite)](https://coveralls.io/github/s3lite/s3lite)
[![Node Version](https://img.shields.io/node/v/s3lite)](https://www.npmjs.com/package/s3lite)
[![NPM Version](https://img.shields.io/npm/v/s3lite)](https://www.npmjs.com/package/s3lite)
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License](https://img.shields.io/npm/l/s3lite)](https://github.com/s3lite/s3lite/blob/master/LICENSE)

A wrapper library for SQLite that keeps a database file on Amazon S3 storage and adds support for promises and async/await.

## Usage

```
npm i --save s3lite
```

```javascript
const S3Lite = require('s3lite')
const db = S3Lite.database(
  'https://bucket-name.s3.eu-central-1.amazonaws.com/database.sqlite',
  {
    s3Options: {
      accessKeyId: 'AWS_ACCESS_KEY_ID',
      secretAccessKey: 'AWS_SECRET_ACCESS_KEY'
    }
  }
)

const data = await db.all('SELECT * FROM table WHERE column = ?', 'value')
```

## Table of contents

- [How It Works](#how-it-works)
- [API Documentation](#api-documentation)
  - [S3Lite](#s3lite)
    - [S3Lite.database(s3FileName, [options])](#s3litedatabase)
  - [Database](#database)
    - [Database.all(sql, [param, ...])](#databaseall)
    - [Database.get(sql, [param, ...])](#databaseget)
    - [Database.exec(sql)](#databaseexec)
    - [Database.run(sql, [param, ...])](#databaserun)
    - [Database.prepare(sql, [param, ...])](#databaseprepare)
    - [Database.open()](#databaseopen)
    - [Database.close()](#databaseclose)
  - [Statement](#statement)
    - [Statement.all([param, ...])](#statementall)
    - [Statement.get([param, ...])](#statementget)
    - [Statement.run([param, ...])](#statementrun)
    - [Statement.reset()](#statementreset)
    - [Statement.finalize()](#statementfinalize)

## How It Works

- To execute select-like sql query: S3Lite pulls the database file from s3 bucket if database file has changed. Then initializes the Sqlite object if necessary, executes query and returns the result on success.<br>
- To execute non-select-like sql query: S3Lite acquires lock on s3 bucket, then pulls the database file from s3 bucket if database file has changed. Then initializes the Sqlite object if necessary and executes query. After successfully executing query S3Lite pushes database to S3 bucket and releases lock, then returns the result.

<details><summary>For details look at the architecture diagram:</summary>
<p>

[![Architecture diagram](https://raw.githubusercontent.com/s3lite/s3lite/master/diagrams/s3lite-diagram.png)](https://github.com/s3lite/s3lite)

</p>
</details>

Minimal AWS S3 Policy required:

```json
{
  "Id": "S3LitePolicyId",
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3LiteStatementPolicyId",
      "Action": ["s3:DeleteObject", "s3:GetObject", "s3:PutObject"],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::bucket-name/database.sqlite",
        "arn:aws:s3:::bucket-name/database.sqlite.lock"
      ],
      "Principal": {
        "Your": "Principal ARN"
      }
    }
  ]
}
```

## API Documentation

> Since this library is using node-sqlite3 under the hood, all information about parameters in the specified methods can be found [here](https://github.com/mapbox/node-sqlite3/wiki/API).

### S3Lite

#### [S3Lite.database](#s3litedatabase)

`static` `database (s3FileName, [options])` `→` `{Database}`

Init Database object. It **doesn't** fetch a database file or open SQLite connection. The database object is in lazy mode, it means during first query it will fetch the database file and open connection to SQLite.<br>
If you need to open a database before executing sql query, use `db.open()` method.

**Parameters:**

- `{string} s3FileName` Access url to a database on s3 bucket.<br>
  Supports three different access url styles:
  - Virtual Hosted Style Access: `https://bucket.s3.region.amazonaws.com/key`
  - Path-Style Access: `https://s3.region.amazonaws.com/bucket-name/key`
  - Aws-Cli Style Access: `s3://bucket-name/key`<br>
    As you can see in this case there is no information about the region (which is required by aws-cli). To provide region use `s3Options` parameter.<br>
    For more information, see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
- `{Object} [options]` _(optional)_:

| Type       | Name                      | _Default_                                         | Description                                                                                              |
| ---------- | ------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `{string}` | `localFilePath`           | `/tmp/s3lite`                                     | This is directory where downloaded database form s3 has been saved.                                      |
| `{number}` | `mode`                    | `S3Lite.OPEN_READWRITE &#124; S3Lite.OPEN_CREATE` | Mode to open the Sqlite. Combination of: S3Lite.OPEN_READONLY, S3Lite.OPEN_READWRITE, S3Lite.OPEN_CREATE |
| `{Object}` | `s3Options`               | `{}`                                              | Object passed to `AWS.S3` constructor.                                                                   |
| `{number}` | `acquireLockRetryTimeout` | `100`ms                                           | Timeout in milliseconds to wait before retrying acquire lock again.                                      |
| `{number}` | `remoteDatabaseCacheTime` | `1000`ms                                          | Timeout in milliseconds to wait before checking database update on s3 bucket.                            |
| `{number}` | `maxLockLifetime`         | `60000`ms                                         | Maximum lock lifetime on s3 bucket.                                                                      |
| `{number}` | `minLockLifetime`         | `1000`ms                                          | Minimum lock lifetime on s3 bucket.                                                                      |

**Returns:**

- `{Database}`: Database object

```javascript
const db = S3Lite.database(
  'https://bucket-name.s3.eu-central-1.amazonaws.com/database.sqlite',
  {
    localFilePath: '/tmp',
    s3Options: {
      accessKeyId: 'AWS_ACCESS_KEY_ID',
      secretAccessKey: 'AWS_SECRET_ACCESS_KEY'
    }
  }
)
```

---

### Database

#### [Database.all](#databaseall)

`async` `all (sql, [params...])` `→` `{Promise<Array>}`

Run the sql query with specified parameters and return `Promise` of `Array` if the query has been executed successfully.<br>
If no data found, empty array has been resolved by the promise.

**Parameters:**

- `{string} sql`: The sql query to run. It can contains placeholder to be bound by the given parameters.
- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as an object.

**Returns:**

- `{Promise<Array>}`: If the query has been executed successfully method returns `Promise` of `Array` of objects.

```javascript
// async/await
const data = await db.all('SELECT id, name FROM table LIMIT ?', 10)
// promise
db.all('SELECT id, name FROM table LIMIT $a', { $a: 10 }).then(data => {
  console.log(data)
})
/*
[
  { id: 1, name: 'test1' },
  { id: 2, name: 'test2' }
]
*/
```

---

#### [Database.get](#databaseget)

`async` `get (sql, [params...])` `→` `{Promise<Object>}`

Run the sql query with specified parameters and return `Promise` of `Object` if the query has been executed successfully.<br>
If no data found, `undefined` has been resolved by the promise.

**Parameters:**

- `{string} sql`: The sql query to run. It can contain placeholder to be bound by the given parameters.
- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as na object.

**Returns:**

- `{Promise<Object|undefined>}`: If the query has been executed successfully method returns `Promise` of `Object` or `undefined` if nothing found.

```javascript
// async/await
const data = await db.get('SELECT id, name FROM table')
// promise
db.get('SELECT id, name FROM table').then(data => {
  console.log(data)
})
/*
{ id: 1, name: 'test1' }
*/
```

---

#### [Database.exec](#databaseexec)

`async` `exec (sql)` `→` `{Promise<Database>}`

Run all the sql queries. No results have been returned here.

**Parameters:**

- `{string} sql`: Sql queries to run.

**Returns:**

- `{Promise<Database>}`: If the query has been executed successfully method returns `Promise` of `Database` object.

```javascript
// async/await
await db.exec(`
  CREATE TABLE test(id INTEGER PRIMARY KEY, name TEXT, control INTEGER);
  INSERT INTO test VALUES(1, 'foo1', 1);
  INSERT INTO test VALUES(2, 'foo2', 2);
`)
// promise
db.exec(
  'CREATE TABLE test(id INTEGER PRIMARY KEY, name TEXT, control INTEGER)'
).then(() => {
  // success
})
```

---

#### [Database.run](#databaserun)

`async` `run (sql, [params...])` `→` `{Promise<{lastID: number, changes: number, sql: string}>}`

Run the sql query with specified parameters and return `Promise` of `Object` containing `{lastID: number, changes: number, sql: string}` if the query has been executed successfully.

**Parameters:**

- `{string} sql`: The sql query to run. It can contains placeholder to be bound by the given parameters.
- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as na object.

**Returns:**

- `{Promise<{lastID: number, changes: number, sql: string}>}`: If the query has been executed successfully method returns `Promise` of `Object`:
  - `lastId`: id of the last inserted row
  - `changes`: number of changes done by the sql query
  - `sql`: executed sql query

```javascript
// async/await
const result = await db.run("INSERT INTO test VALUES(NULL, 'foo1', 1)")
// promise
db.run("INSERT INTO test VALUES(NULL, 'foo1', 1)").then(result => {
  console.log(result)
})
/*
{ lastID: 1, changes: 1, sql: "INSERT INTO test VALUES(NULL, 'foo1', 1)" }
*/
```

---

#### [Database.prepare](#databaseprepare)

`async` `prepare (sql, [params...])` `→` `{Promise<Statement>}`

Prepare a statement

**Parameters:**

- `{string} sql`: The sql query to run. It can contains placeholder to be bound by the given parameters.
- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as na object.

**Returns:**

- `{Promise<Statement>}`: Statement object (self)

```javascript
// async/await
const stmt = await db.prepare('INSERT INTO test VALUES(NULL, ?, ?)')
// promise
db.prepare('INSERT INTO test VALUES(NULL, ?, ?)').then(stmt => {
  // stmt {Statement}
})
```

---

#### [Database.open](#databaseopen)

`async` `open ()` `→` `{Promise<Database>}`

Open the database, fetch database file from s3 bucket and open the SQLite connection.

**Returns:**

- `{Promise<Database>}`: Database object

```javascript
// async/await
await db.open()
// promise
db.open().then(() => {
  // database opened
})
```

---

#### [Database.close](#databaseclose)

`async` `close ()` `→` `{Promise<Database>}`

Close the SQLite connection

**Returns:**

- `{Promise<Database>}`: Database object

```javascript
// async/await
await db.close()
// promise
db.close().then(() => {
  // database closed
})
```

---

### Statement

Statement object created by `db.prepare()` method.<br>
It contains three properties:

- `lastId`: id of the last inserted row
- `changes`: number of changes done by the sql query
- `sql`: executed sql query

#### [Statement.all](#statementall)

`async` `all ([params...])` `→` `{Promise<Array>}`

Execute the statement with specified parameters and returns`Promise` of `Array` if the query has been executed successfully.<br>
If no data found, empty array has been resolved by the promise.

**Parameters:**

- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as na object.

**Returns:**

- `{Promise<Array>}`: If the query has been executed successfully method returns `Promise` of `Array` of objects.

```javascript
// async/await
const stmt = await db.prepare('SELECT * FROM test WHERE column = ? LIMIT ?')
const data = await stmt.all(1, 5)
// promise
db.prepare('SELECT * FROM test WHERE column = ?').then(stmt => {
  stmt.all().then(data => {
    console.log(data)
  })
})
/*
[
  { id: 1, name: 'test1' },
  { id: 2, name: 'test2' }
]
*/
```

---

#### [Statement.get](#statementget)

`async` `get ([params...])` `→` `{Promise<Object>}`

Execute the statement with specified parameters and return `Promise` of `Object` if the query has been executed successfully.<br>
If no data found, `undefined` has been resolved by the promise.

**Parameters:**

- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as na object.

**Returns:**

- `{Promise<Object|undefined>}`: If the query has been executed successfully method returns `Promise` of `Object` or `undefined` if nothing found.

```javascript
// async/await
const stmt = await db.prepare('SELECT * FROM test WHERE column = ? LIMIT 1')
const data = await stmt.get(3)
// promise
db.prepare('SELECT * FROM test WHERE column = ?').then(stmt => {
  stmt.get(3).then(data => {
    console.log(data)
  })
})
/*
{ id: 1, name: 'test1' }
*/
```

---

#### [Statement.run](#statementrun)

`async` `run ([params...])` `→` `{Promise<Statement>}`

Execute the statement with specified parameters and return `Promise` of `Object` containing `{lastID: number, changes: number, sql: string}` if the query has been executed successfully.

**Parameters:**

- `{...*|Object|Array} [params]` _(optional)_: Parameters to bind. There are three ways to pass parameters: as arguments, as an array or as na object.

**Returns:**

- `{Promise<Statement>}`: Statement object (self)

```javascript
// async/await
const stmt = await db.prepare('INSERT INTO test VALUES (NULL, ?)')
await stmt.run('foo')
// promise
db.prepare('INSERT INTO test VALUES (NULL, ?)').then(stmt => {
  stmt.run('foo').then(stmt => {
    console.log(stmt)
  })
})
/*
// stmt {Statement}
*/
```

---

#### [Statement.reset](#statementreset)

`async` `reset ()` `→` `{Promise<Statement>}`

Reset the cursor of the statement. It's required for re-execution of the query with the same parameters.

**Returns:**

- `{Promise<Statement>}`: Statement object (self)

```javascript
// async/await
const result = await stmt.reset()
// promise
stmt.reset().then(stmt => {
  console.log(stmt)
})
/*
// stmt {Statement}
*/
```

---

#### [Statement.finalize](#statementfinalize)

`async` `finalize ()` `→` `{Promise<Statement>}`

Finalize the statement

**Returns:**

- `{Promise<Statement>}`: Statement object (self)

```javascript
// async/await
const result = await stmt.finalize()
// promise
stmt.finalize().then(stmt => {
  console.log(stmt)
})
/*
// stmt {Statement}
*/
```

---
